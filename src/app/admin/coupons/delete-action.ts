
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
    .in("creem_checkout_state", ["creating", "ready"])
    .limit(1);

  if (error) {
    throw new Error(
      "Unable to verify pending checkouts."
    );
  }

  if (data && data.length > 0) {
    throw new Error(
      "This coupon has an active unpaid checkout. Resolve that checkout before deleting it."
    );
  }
}

async function deleteCreemDiscount(
  discountId: string
): Promise<void> {
  if (!/^dis_[A-Za-z0-9_-]+$/.test(discountId)) {
    throw new Error("Invalid Creem discount ID.");
  }

  const key = process.env.CREEM_API_KEY;
  const environment = process.env.CREEM_ENVIRONMENT;

  if (
    !key ||
    (environment !== "test" &&
      environment !== "production")
  ) {
    throw new Error(
      "Creem configuration is incomplete."
    );
  }

  const baseUrl =
    environment === "test"
      ? "https://test-api.creem.io"
      : "https://api.creem.io";

  const response = await fetch(
    `${baseUrl}/v1/discounts/${encodeURIComponent(
      discountId
    )}/delete`,
    {
      method: "DELETE",
      headers: {
        "x-api-key": key,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new Error(
      `Creem discount deletion failed (${response.status}).`
    );
  }
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

  const { data: coupon, error: lookupError } =
    await admin
      .from("coupons")
      .select("id,code,creem_discount_id")
      .eq("id", couponId)
      .maybeSingle();

  if (lookupError) {
    fail("Unable to load coupon.");
  }

  if (!coupon) {
    redirect(PATH);
  }

  try {
    await ensureNoActiveCheckouts(coupon.code);

    if (coupon.creem_discount_id) {
      await deleteCreemDiscount(
        coupon.creem_discount_id
      );
    }
  } catch (error) {
    console.error("Coupon deletion failed:", error);

    fail(
      error instanceof Error
        ? error.message
        : "Unable to delete coupon."
    );
  }

  const { data: deleted, error: deleteError } =
    await admin
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
      "The Creem discount was removed or was already missing, but the local coupon could not be deleted. Check database references and try again."
    );
  }

  revalidatePath(PATH);

  redirect(`${PATH}?success=deleted`);
}
