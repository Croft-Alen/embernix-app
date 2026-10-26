"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCreemDiscount } from "@/lib/creem/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DiscountType = "percentage" | "flat";

type CouponData = {
  code: string;
  description: string | null;
  discount_type: DiscountType;
  amount: number;
  currency: string | null;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
};

type StoredCoupon = CouponData & {
  id: string;
  creem_discount_id: string | null;
};

function value(entry: FormDataEntryValue | null): string {
  return String(entry ?? "").trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to process coupon.";
}

function fail(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params}`);
}

function positiveInteger(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function decimalPlaces(currency: string): number {
  try {
    const places =
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;

    if (!Number.isInteger(places) || places < 0 || places > 3) {
      throw new Error("Unsupported currency precision.");
    }

    return places;
  } catch {
    throw new Error("Unsupported discount currency.");
  }
}

function parseFixedAmount(
  text: string,
  currency: string
): number {
  const decimals = decimalPlaces(currency);
  const pattern = new RegExp(
    `^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`
  );

  if (decimals === 0 && !/^\d+$/.test(text)) {
    throw new Error("This currency requires whole amounts.");
  }

  const match =
    decimals === 0
      ? /^(\d+)$/.exec(text)
      : pattern.exec(text);

  if (!match) {
    throw new Error("Invalid fixed discount amount.");
  }

  const whole = Number(match[1]);
  const fraction =
    decimals > 0
      ? Number((match[2] ?? "").padEnd(decimals, "0"))
      : 0;

  const result = whole * 10 ** decimals + fraction;

  if (
    !Number.isSafeInteger(result) ||
    result <= 0 ||
    result > 2147483647
  ) {
    throw new Error("Fixed discount amount is out of range.");
  }

  return result;
}

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    redirect("/dashboard");
  }
}

function parseCoupon(formData: FormData): CouponData {
  const code = value(formData.get("code")).toUpperCase();
  const description = value(formData.get("description")) || null;
  const type = value(formData.get("discountType"));
  const rawAmount = value(formData.get("amount"));
  const rawCurrency = value(formData.get("currency")).toUpperCase();
  const rawExpiry = value(formData.get("expiresAt"));
  const rawLimit = value(formData.get("usageLimit"));

  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw new Error("Coupon code must contain 1–32 letters or numbers.");
  }

  if (description && description.length > 500) {
    throw new Error("Description is too long.");
  }

  if (type !== "percentage" && type !== "flat") {
    throw new Error("Invalid discount type.");
  }

  let amount: number;
  let currency: string | null = null;

  if (type === "percentage") {
    const percentage = positiveInteger(rawAmount);

    if (!percentage || percentage > 100) {
      throw new Error("Percentage must be between 1 and 100.");
    }

    amount = percentage;
  } else {
    if (!/^[A-Z]{3}$/.test(rawCurrency)) {
      throw new Error("Invalid currency code.");
    }

    currency = rawCurrency;
    amount = parseFixedAmount(rawAmount, currency);
  }

  let usageLimit: number | null = null;

  if (rawLimit) {
    usageLimit = positiveInteger(rawLimit);

    if (!usageLimit || usageLimit > 2147483647) {
      throw new Error("Invalid usage limit.");
    }
  }

  let expiresAt: string | null = null;

  if (rawExpiry) {
    const date = new Date(rawExpiry);

    if (!Number.isFinite(date.getTime())) {
      throw new Error("Invalid expiration date.");
    }

    expiresAt = date.toISOString();
  }

  return {
    code,
    description,
    discount_type: type,
    amount,
    currency,
    active: formData.has("active"),
    expires_at: expiresAt,
    usage_limit: usageLimit,
  };
}

async function findCoupon(id: string): Promise<StoredCoupon> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Coupon not found.");
  }

  if (
    data.discount_type !== "percentage" &&
    data.discount_type !== "flat"
  ) {
    throw new Error("Unsupported coupon type.");
  }

  return data as StoredCoupon;
}

function sameDate(a: string | null, b: string | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function termsChanged(a: CouponData, b: CouponData): boolean {
  return (
    a.code !== b.code ||
    a.discount_type !== b.discount_type ||
    a.amount !== b.amount ||
    a.currency !== b.currency ||
    a.usage_limit !== b.usage_limit ||
    !sameDate(a.expires_at, b.expires_at)
  );
}

async function getProductIds(): Promise<string[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("products")
    .select("creem_product_id")
    .eq("active", true);

  if (error) {
    throw new Error("Unable to load eligible products.");
  }

  const ids = [
    ...new Set(
      (data ?? [])
        .map((item) => item.creem_product_id)
        .filter(
          (id): id is string =>
            typeof id === "string" &&
            /^prod_[A-Za-z0-9_-]+$/.test(id)
        )
    ),
  ];

  if (!ids.length) {
    throw new Error("No eligible Creem products found.");
  }

  return ids;
}

async function createRemote(coupon: CouponData): Promise<string> {
  const productIds = await getProductIds();

  const discount = await createCreemDiscount({
    name: coupon.code,
    code: coupon.code,
    type:
      coupon.discount_type === "percentage"
        ? "percentage"
        : "fixed",
    ...(coupon.discount_type === "percentage"
      ? { percentage: coupon.amount }
      : {
          amount: coupon.amount,
          currency: coupon.currency ?? "USD",
        }),
    maxRedemptions: coupon.usage_limit,
    expiryDate: coupon.expires_at,
    productIds,
  });

  if (
    !/^dis_[A-Za-z0-9_-]+$/.test(discount.id) ||
    discount.code.toUpperCase() !== coupon.code
  ) {
    throw new Error("Creem returned an invalid discount.");
  }

  return discount.id;
}

async function deleteRemote(id: string): Promise<void> {
  const key = process.env.CREEM_API_KEY;

  if (!key || !/^dis_[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Creem discount cleanup is not configured.");
  }

  const environment = process.env.CREEM_ENVIRONMENT;

  if (environment !== "test" && environment !== "production") {
    throw new Error("Invalid Creem environment.");
  }

  const base =
    environment === "production"
      ? "https://api.creem.io"
      : "https://test-api.creem.io";

  const response = await fetch(
    `${base}/v1/discounts/${encodeURIComponent(id)}/delete`,
    {
      method: "DELETE",
      headers: { "x-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(`Creem cleanup failed (${response.status}).`);
  }
}

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();

  const path = "/admin/coupons/new";

  let coupon: CouponData;

  try {
    coupon = parseCoupon(formData);
  } catch (error) {
    fail(path, errorMessage(error));
  }

  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("coupons")
    .select("id")
    .eq("code", coupon.code)
    .maybeSingle();

  if (lookupError) {
    fail(path, "Unable to check existing coupons.");
  }

  if (existing) {
    fail(path, "This coupon code already exists.");
  }

  let discountId: string | null = null;

  if (coupon.active) {
    try {
      discountId = await createRemote(coupon);
    } catch (error) {
      console.error("Creem coupon creation failed:", error);
      fail(path, "Creem could not create this discount.");
    }
  }

  const { data: created, error: insertError } = await admin
    .from("coupons")
    .insert({
      ...coupon,
      creem_discount_id: discountId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !created) {
    if (discountId) {
      try {
        await deleteRemote(discountId);
      } catch (cleanupError) {
        console.error("Manual Creem cleanup required:", {
          discountId,
          cleanupError,
        });

        fail(
          path,
          "Database save failed. Remote Creem cleanup may be required."
        );
      }
    }

    fail(
      path,
      insertError?.code === "23505"
        ? "This coupon code already exists."
        : "Unable to save coupon."
    );
  }

  revalidatePath("/admin/coupons");
  redirect(`/admin/coupons/${created.id}/edit?created=1`);
}

export async function updateCoupon(
  couponId: string,
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const path = `/admin/coupons/${couponId}/edit`;

  let coupon: CouponData;
  let existing: StoredCoupon;

  try {
    coupon = parseCoupon(formData);
    existing = await findCoupon(couponId);
  } catch (error) {
    fail(path, errorMessage(error));
  }

  if (coupon.active !== existing.active) {
    fail(path, "Change coupon status from the coupon list.");
  }

  if (termsChanged(existing, coupon)) {
    if (existing.creem_discount_id) {
      fail(
        path,
        "Discount rules are locked until Creem synchronization is implemented."
      );
    }

    if (existing.active) {
      fail(
        path,
        "Disable this unmapped coupon before changing its rules."
      );
    }
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("coupons")
    .update({
      ...coupon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couponId);

  if (error) {
    fail(
      path,
      error.code === "23505"
        ? "This coupon code already exists."
        : "Unable to save coupon."
    );
  }

  revalidatePath("/admin/coupons");
  revalidatePath(path);

  redirect(`${path}?saved=1`);
}

export async function toggleCouponStatus(
  couponId: string,
  nextStatus: boolean
): Promise<void> {
  await requireAdmin();

  let coupon: StoredCoupon;

  try {
    coupon = await findCoupon(couponId);
  } catch (error) {
    console.error("Coupon lookup failed:", error);
    return;
  }

  if (coupon.active === nextStatus) return;

  if (coupon.creem_discount_id) {
    console.error(
      "Remote coupon status changes are not enabled:",
      couponId
    );
    return;
  }

  const admin = createAdminClient();

  if (!nextStatus) {
    const { error } = await admin
      .from("coupons")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId);

    if (error) {
      console.error("Coupon disable failed:", error);
      return;
    }
  } else {
    let discountId: string;

    try {
      discountId = await createRemote(coupon);
    } catch (error) {
      console.error("Creem coupon enable failed:", error);
      return;
    }

    const { error } = await admin
      .from("coupons")
      .update({
        active: true,
        creem_discount_id: discountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId)
      .eq("active", false)
      .is("creem_discount_id", null);

    if (error) {
      console.error("Coupon enable failed:", error);

      try {
        await deleteRemote(discountId);
      } catch (cleanupError) {
        console.error("Manual cleanup required:", {
          discountId,
          cleanupError,
        });
      }

      return;
    }
  }

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${couponId}/edit`);
}