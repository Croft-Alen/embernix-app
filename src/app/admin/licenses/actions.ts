
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LicenseAction = "revoke" | "restore" | "renew";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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

export async function updateLicense(formData: FormData) {
  await requireAdmin();

  const licenseId = String(
    formData.get("licenseId") ?? ""
  ).trim();

  const action = String(
    formData.get("action") ?? ""
  ).trim() as LicenseAction;

  if (
    !uuidPattern.test(licenseId) ||
    !["revoke", "restore", "renew"].includes(action)
  ) {
    redirect("/admin/licenses?error=invalid");
  }

  const admin = createAdminClient();

  const { data: license, error: lookupError } = await admin
    .from("customer_products")
    .select("id,user_id,product_id,status")
    .eq("id", licenseId)
    .maybeSingle();

  if (lookupError || !license) {
    redirect("/admin/licenses?error=not_found");
  }

  let nextStatus: string;

  if (action === "revoke") {
    if (
      license.status !== "active" &&
      license.status !== "renewal_required"
    ) {
      redirect("/admin/licenses?error=invalid_state");
    }

    nextStatus = "revoked";
  } else if (action === "restore") {
    if (
      license.status !== "revoked" &&
      license.status !== "renewal_required"
    ) {
      redirect("/admin/licenses?error=invalid_state");
    }

    nextStatus = "active";
  } else {
    if (license.status !== "revoked") {
      redirect("/admin/licenses?error=invalid_state");
    }

    nextStatus = "renewal_required";
  }

  const { data: updated, error: updateError } = await admin
    .from("customer_products")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", license.id)
    .eq("status", license.status)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("License update failed:", updateError);

    redirect("/admin/licenses?error=update_failed");
  }

  revalidatePath("/admin/licenses");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${license.user_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath(`/products/${license.product_id}`);

  redirect(`/admin/licenses?success=${action}`);
}
