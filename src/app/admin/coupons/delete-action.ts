
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PATH = "/admin/coupons";

function fail(reason: string): never {
  redirect(
    `${PATH}?${new URLSearchParams({ error: reason })}`
  );
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

  const { data: admin, error: adminError } =
    await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (adminError || !admin) {
    redirect("/dashboard");
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
    .in("creem_checkout_state", [
      "creating",
      "ready",
    ])
    .limit(1);

  if (error) {
    throw new Error(
      "Unable to verify pending checkouts."
    );
  }

  if (data && data.length > 0) {
    throw new Error(
      "This coupon is used by an active unpaid checkout. Resolve the checkout before deleting it."
    );
  }
}

function creemBaseUrl(): string {
  const environment = process.env.CREEM_ENVIRONMENT;

  if (environment === "test") {
    return "https://test-api.creem.io";
  }

  if (environment === "production") {
    return "https://api.creem.io";
  }

  throw new Error(
    "CREEM_ENVIRONMENT must be test or production."
  );
}

function creemHeaders(): HeadersInit {
  const key = process.env.CREEM_API_KEY;

  if (!key) {
    throw new Error(
      "CREEM_API_KEY is not configured."
    );
  }

  return {
    "x-api-key": key,
    Accept: "application/json",
  };
}

async function getRemoteDiscountStatus(
  discountId: string
): Promise<"exists" | "missing"> {
  const url = new URL(
    "/v1/discounts",
    creemBaseUrl()
  );

  url.searchParams.set(
    "discount_id",
    discountId
  );

  const response = await fetch(url, {
    method: "GET",
    headers: creemHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 404) {
    return "missing";
  }

  if (!response.ok) {
    throw new Error(
      `Unable to verify discount in Creem (${response.status}).`
    );
  }

  const result: unknown = await response.json();

  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    !("id" in result) ||
    result.id !== discountId
  ) {
    throw new Error(
      "Creem returned an unexpected discount record."
    );
  }

  return "exists";
}

async function deleteRemoteDiscount(
  discountId: string
): Promise<void> {
  if (
    !/^dis_[A-Za-z0-9_-]+$/.test(discountId)
  ) {
    throw new Error(
      "Invalid Creem discount ID."
    );
  }

  // If already deleted in Creem, there is
  // no remote operation left to perform.
  const currentStatus =
    await getRemoteDiscountStatus(discountId);

  if (currentStatus === "missing") {
    return;
  }

  const url = `${creemBaseUrl()}/v1/discounts/${encodeURIComponent(
    discountId
  )}/delete`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: creemHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (response.ok) {
    return;
  }

  // Creem might return a non-success status
  // even when the discount has become missing.
  // Verify the remote state before failing.
  if (
    response.status === 404 ||
    response.status >= 500
  ) {
    const current =
      await getRemoteDiscountStatus(
        discountId
      );

    if (current === "missing") {
      return;
    }
  }

  throw new Error(
    `Creem discount deletion failed (${response.status}). The discount still exists or could not be verified as deleted.`
  );
}

export async function deleteCoupon(
  couponId: string
): Promise<void> {
  await requireAdmin();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      couponId
    )
  ) {
    fail("Invalid coupon ID.");
  }

  const admin = createAdminClient();

  const {
    data: coupon,
    error: lookupError,
  } = await admin
    .from("coupons")
    .select(
      "id,code,creem_discount_id"
    )
    .eq("id", couponId)
    .maybeSingle();

  if (lookupError) {
    fail("Unable to load coupon.");
  }

  if (!coupon) {
    redirect(PATH);
  }

  try {
    await ensureNoActiveCheckouts(
      coupon.code
    );

    if (coupon.creem_discount_id) {
      await deleteRemoteDiscount(
        coupon.creem_discount_id
      );
    }
  } catch (error) {
    console.error(
      "Coupon deletion verification failed:",
      error
    );

    fail(
      error instanceof Error
        ? error.message
        : "Unable to delete coupon."
    );
  }

  const {
    data: deleted,
    error: deleteError,
  } = await admin
    .from("coupons")
    .delete()
    .eq("id", coupon.id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deleted) {
    console.error(
      "Local coupon deletion failed:",
      deleteError
    );

    fail(
      "The remote discount was deleted or already missing, but the local record could not be deleted. Check database references."
    );
  }

  revalidatePath(PATH);

  redirect(
    `${PATH}?success=deleted`
  );
}
