"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCreemDiscount,
  getCreemDiscountByCode,
} from "@/lib/creem/server";
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

function read(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to process coupon.";
}

function fail(path: string, reason: string): never {
  redirect(`${path}?${new URLSearchParams({ error: reason })}`);
}

function positiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function currencyDecimals(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid currency.");
  }

  try {
    const decimals =
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;

    if (decimals < 0 || decimals > 3) {
      throw new Error("Unsupported currency precision.");
    }

    return decimals;
  } catch {
    throw new Error("Unsupported currency.");
  }
}

function parseFixedAmount(
  raw: string,
  currency: string
): number {
  const decimals = currencyDecimals(currency);

  const pattern =
    decimals === 0
      ? /^(\d+)$/
      : new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`);

  const match = pattern.exec(raw);

  if (!match) {
    throw new Error("Invalid fixed discount amount.");
  }

  const whole = Number(match[1]);
  const fraction =
    decimals === 0
      ? 0
      : Number((match[2] ?? "").padEnd(decimals, "0"));

  const amount = whole * 10 ** decimals + fraction;

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 2147483647
  ) {
    throw new Error("Fixed discount is out of range.");
  }

  return amount;
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

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/dashboard");
  }
}

function parseCoupon(formData: FormData): CouponData {
  const code = read(formData.get("code")).toUpperCase();
  const description = read(formData.get("description")) || null;
  const type = read(formData.get("discountType"));
  const rawAmount = read(formData.get("amount"));
  const rawCurrency = read(formData.get("currency")).toUpperCase();
  const rawExpiry = read(formData.get("expiresAt"));
  const rawLimit = read(formData.get("usageLimit"));

  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw new Error("Coupon code must contain 1-32 letters or numbers.");
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

async function loadCoupon(id: string): Promise<StoredCoupon> {
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
    throw new Error("Unsupported discount type.");
  }

  return data as StoredCoupon;
}

function equalDates(
  first: string | null,
  second: string | null
): boolean {
  if (!first && !second) return true;
  if (!first || !second) return false;

  return (
    new Date(first).getTime() ===
    new Date(second).getTime()
  );
}

function termsChanged(
  first: CouponData,
  second: CouponData
): boolean {
  return (
    first.code !== second.code ||
    first.discount_type !== second.discount_type ||
    first.amount !== second.amount ||
    first.currency !== second.currency ||
    first.usage_limit !== second.usage_limit ||
    !equalDates(first.expires_at, second.expires_at)
  );
}

async function getProductIds(): Promise<string[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("products")
    .select("creem_product_id")
    .eq("active", true);

  if (error) {
    throw new Error("Unable to load products.");
  }

  const ids = [
    ...new Set(
      (data ?? [])
        .map((product) => product.creem_product_id)
        .filter(
          (id): id is string =>
            typeof id === "string" &&
            /^prod_[A-Za-z0-9_-]+$/.test(id)
        )
    ),
  ];

  if (ids.length === 0) {
    throw new Error("No eligible Creem products found.");
  }

  return ids;
}

async function ensureRemoteCodeAvailable(
  code: string
): Promise<void> {
  try {
    const existing = await getCreemDiscountByCode(code);

    if (existing.id) {
      throw new Error(
        "This code already exists in Creem. Resolve the existing discount before synchronizing."
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already exists in Creem")
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.message.includes("(404)")
    ) {
      return;
    }

    throw new Error(
      "Unable to confirm whether this code already exists in Creem."
    );
  }
}

async function createRemote(
  coupon: CouponData
): Promise<string> {
  await ensureRemoteCodeAvailable(coupon.code);

  const products = await getProductIds();

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
    productIds: products,
  });

  if (
    !/^dis_[A-Za-z0-9_-]+$/.test(discount.id) ||
    discount.code.toUpperCase() !== coupon.code
  ) {
    throw new Error("Creem returned an unexpected discount.");
  }

  return discount.id;
}

async function deleteRemote(id: string): Promise<void> {
  if (!/^dis_[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Invalid Creem discount ID.");
  }

  const key = process.env.CREEM_API_KEY;
  const environment = process.env.CREEM_ENVIRONMENT;

  if (
    !key ||
    (environment !== "test" && environment !== "production")
  ) {
    throw new Error("Creem configuration is incomplete.");
  }

  const base =
    environment === "test"
      ? "https://test-api.creem.io"
      : "https://api.creem.io";

  const response = await fetch(
    `${base}/v1/discounts/${encodeURIComponent(id)}/delete`,
    {
      method: "DELETE",
      headers: {
        "x-api-key": key,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Creem discount deletion failed (${response.status}).`
    );
  }
}

async function cleanupRemote(id: string): Promise<void> {
  try {
    await deleteRemote(id);
  } catch (error) {
    console.error("Manual Creem cleanup required:", id, error);

    throw new Error(
      "The database operation failed and the remote discount requires review."
    );
  }
}

async function ensureNoActiveCheckouts(
  code: string
): Promise<void> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select("id")
    .eq("payment_provider", "creem")
    .eq("status", "pending")
    .eq("payment_status", "unpaid")
    .eq("creem_discount_code", code)
    .in("creem_checkout_state", ["creating", "ready"])
    .limit(1);

  if (error) {
    throw new Error("Unable to verify pending checkouts.");
  }

  if (data && data.length > 0) {
    throw new Error(
      "This coupon has an active unpaid checkout. Resolve that checkout before disabling the discount."
    );
  }
}

export async function createCoupon(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const path = "/admin/coupons/new";

  let coupon: CouponData;

  try {
    coupon = parseCoupon(formData);
  } catch (error) {
    fail(path, message(error));
  }

  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("coupons")
    .select("id")
    .eq("code", coupon.code)
    .maybeSingle();

  if (lookupError) {
    fail(path, "Unable to check coupon codes.");
  }

  if (existing) {
    fail(path, "This coupon code already exists.");
  }

  let discountId: string | null = null;

  if (coupon.active) {
    try {
      discountId = await createRemote(coupon);
    } catch (error) {
      console.error("Creem discount creation failed:", error);
      fail(path, message(error));
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
        await cleanupRemote(discountId);
      } catch (error) {
        fail(path, message(error));
      }
    }

    fail(
      path,
      insertError?.code === "23505"
        ? "This code already exists."
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

  let updated: CouponData;
  let existing: StoredCoupon;

  try {
    updated = parseCoupon(formData);
    existing = await loadCoupon(couponId);
  } catch (error) {
    fail(path, message(error));
  }

  if (updated.active !== existing.active) {
    fail(path, "Use the coupon list to change status.");
  }

  if (
    existing.creem_discount_id &&
    termsChanged(existing, updated)
  ) {
    fail(
      path,
      "Disable this coupon before editing its discount rules."
    );
  }

  if (
    existing.active &&
    !existing.creem_discount_id &&
    termsChanged(existing, updated)
  ) {
    fail(
      path,
      "Synchronize or disable this coupon before editing its discount rules."
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("coupons")
    .update({
      ...updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couponId);

  if (error) {
    fail(
      path,
      error.code === "23505"
        ? "This code already exists."
        : "Unable to save coupon."
    );
  }

  revalidatePath("/admin/coupons");
  revalidatePath(path);

  redirect(`${path}?saved=1`);
}

export async function syncCoupon(
  couponId: string
): Promise<void> {
  await requireAdmin();

  const path = "/admin/coupons";

  let coupon: StoredCoupon;

  try {
    coupon = await loadCoupon(couponId);

    if (!coupon.active) {
      throw new Error(
        "Enable this coupon instead of synchronizing an inactive record."
      );
    }

    if (coupon.creem_discount_id) {
      throw new Error("This coupon already has a Creem mapping.");
    }
  } catch (error) {
    fail(path, message(error));
  }

  let discountId: string;

  try {
    discountId = await createRemote(coupon);
  } catch (error) {
    console.error("Coupon synchronization failed:", error);
    fail(path, message(error));
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .update({
      creem_discount_id: discountId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couponId)
    .eq("active", true)
    .is("creem_discount_id", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    try {
      await cleanupRemote(discountId);
    } catch (cleanupError) {
      fail(path, message(cleanupError));
    }

    fail(path, "Unable to save the Creem mapping.");
  }

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${couponId}/edit`);

  redirect("/admin/coupons?success=synced");
}

export async function toggleCouponStatus(
  couponId: string,
  nextStatus: boolean
): Promise<void> {
  await requireAdmin();

  const path = "/admin/coupons";

  let coupon: StoredCoupon;

  try {
    coupon = await loadCoupon(couponId);
  } catch (error) {
    fail(path, message(error));
  }

  if (coupon.active === nextStatus) {
    redirect(path);
  }

  const admin = createAdminClient();

  if (!nextStatus) {
    try {
      await ensureNoActiveCheckouts(coupon.code);

      if (coupon.creem_discount_id) {
        await deleteRemote(coupon.creem_discount_id);
      }
    } catch (error) {
      fail(path, message(error));
    }

    const { data, error } = await admin
      .from("coupons")
      .update({
        active: false,
        creem_discount_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId)
      .eq("active", true)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      fail(
        path,
        "Creem discount was processed but local status could not be updated. Review the coupon before retrying."
      );
    }
  } else {
    if (coupon.creem_discount_id) {
      fail(
        path,
        "This inactive coupon still has a Creem mapping. Resolve it before enabling."
      );
    }

    let discountId: string;

    try {
      discountId = await createRemote(coupon);
    } catch (error) {
      fail(path, message(error));
    }

    const { data, error } = await admin
      .from("coupons")
      .update({
        active: true,
        creem_discount_id: discountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId)
      .eq("active", false)
      .is("creem_discount_id", null)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      try {
        await cleanupRemote(discountId);
      } catch (cleanupError) {
        fail(path, message(cleanupError));
      }

      fail(path, "Unable to enable coupon.");
    }
  }

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${couponId}/edit`);

  redirect(
    `/admin/coupons?success=${nextStatus ? "enabled" : "disabled"}`
  );
}