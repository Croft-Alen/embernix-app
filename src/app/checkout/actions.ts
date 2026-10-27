
"use server";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PrepareCheckoutResult =
  | {
      success: true;
      orderNumber: string;
    }
  | {
      success: false;
      error: string;
      ownedProductId?: string;
    };

const TERMS_VERSION = "2026-10-25";

function createOrderNumber(): string {
  const now = new Date();

  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  const random = randomUUID()
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();

  return `EMB-${date}-${random}`;
}

export async function prepareCheckoutOrder(
  productSlug: string,
  acceptedTerms: boolean
): Promise<PrepareCheckoutResult> {
  if (!acceptedTerms) {
    return {
      success: false,
      error: "Please accept the Terms of Service.",
    };
  }

  const slug = productSlug?.trim();

  if (
    !slug ||
    slug.length > 200 ||
    !/^[a-zA-Z0-9_-]+$/.test(slug)
  ) {
    return {
      success: false,
      error: "Invalid digital product.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return {
      success: false,
      error: "Please sign in before checkout.",
    };
  }

  const admin = createAdminClient();

  const { data: product, error: productError } = await admin
    .from("products")
    .select(
      "id,slug,name,price_cents,currency,active,creem_product_id"
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (productError) {
    console.error("Product lookup failed:", productError);

    return {
      success: false,
      error: "Unable to load the product.",
    };
  }

  if (!product) {
    return {
      success: false,
      error: "Product is unavailable.",
    };
  }

  if (!product.creem_product_id) {
    return {
      success: false,
      error: "Product checkout is not configured.",
    };
  }

  const price = Number(product.price_cents);

  if (
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    !/^[A-Z]{3}$/.test(product.currency)
  ) {
    return {
      success: false,
      error: "Product price is invalid.",
    };
  }

  const { data: ownership, error: ownershipError } = await admin
    .from("customer_products")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  if (ownershipError) {
    console.error(
      "Ownership verification failed:",
      ownershipError
    );

    return {
      success: false,
      error: "Unable to verify product ownership.",
    };
  }

  if (ownership?.status === "active") {
    return {
      success: false,
      error: "You already own this product.",
      ownedProductId: product.id,
    };
  }

  if (ownership?.status === "revoked") {
    return {
      success: false,
      error: "Product access has been revoked. Contact support.",
    };
  }

  if (ownership?.status === "refunded") {
    return {
      success: false,
      error: "This purchase was refunded. Contact support.",
    };
  }

  if (
    ownership &&
    ownership.status !== "renewal_required"
  ) {
    return {
      success: false,
      error: "This license is not available for checkout.",
    };
  }

  const licenseCheckoutKind =
    ownership?.status === "renewal_required"
      ? "renewal"
      : "purchase";

  const { data: pendingOrders, error: pendingError } =
    await admin
      .from("orders")
      .select(
        "id,order_number,currency,subtotal_cents,total_cents,creem_checkout_id,creem_checkout_state,creem_checkout_claim_token,creem_discount_code,creem_discount_cents"
      )
      .eq("user_id", user.id)
      .eq("payment_provider", "creem")
      .eq("status", "pending")
      .eq("payment_status", "unpaid")
      .is("creem_checkout_id", null)
      .is("creem_checkout_state", null)
      .is("creem_checkout_claim_token", null)
      .order("created_at", { ascending: false })
      .limit(20);

  if (pendingError) {
    console.error("Pending order lookup failed:", pendingError);

    return {
      success: false,
      error: "Unable to prepare checkout.",
    };
  }

  for (const order of pendingOrders ?? []) {
    if (
      order.currency !== product.currency ||
      Number(order.subtotal_cents) !== price ||
      Number(order.total_cents) !== price ||
      order.creem_discount_code !== null ||
      Number(order.creem_discount_cents ?? 0) !== 0
    ) {
      continue;
    }

    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select(
        "item_type,product_id,quantity,unit_price_cents"
      )
      .eq("order_id", order.id);

    if (
      itemsError ||
      !items ||
      items.length !== 1 ||
      items[0].item_type !== "product" ||
      items[0].product_id !== product.id ||
      Number(items[0].quantity) !== 1 ||
      Number(items[0].unit_price_cents) !== price
    ) {
      continue;
    }

    const now = new Date().toISOString();

    const { data: refreshed, error: refreshError } =
      await admin
        .from("orders")
        .update({
          license_checkout_kind: licenseCheckoutKind,
          terms_accepted_at: now,
          terms_version: TERMS_VERSION,
          updated_at: now,
        })
        .eq("id", order.id)
        .eq("payment_provider", "creem")
        .eq("status", "pending")
        .eq("payment_status", "unpaid")
        .is("creem_checkout_id", null)
        .is("creem_checkout_state", null)
        .is("creem_checkout_claim_token", null)
        .select("id")
        .maybeSingle();

    if (refreshError) {
      console.error(
        "Pending order refresh failed:",
        refreshError
      );
    }

    if (refreshed) {
      return {
        success: true,
        orderNumber: order.order_number,
      };
    }
  }

  const orderId = randomUUID();
  const orderNumber = createOrderNumber();
  const now = new Date().toISOString();

  const { error: orderError } = await admin
    .from("orders")
    .insert({
      id: orderId,
      user_id: user.id,
      order_number: orderNumber,
      status: "pending",
      payment_status: "unpaid",
      license_checkout_kind: licenseCheckoutKind,
      currency: product.currency,
      subtotal_cents: price,
      total_cents: price,
      customer_email: user.email,
      payment_provider: "creem",
      provider_transaction_id: null,
      checkout_token: randomUUID(),
      terms_accepted_at: now,
      terms_version: TERMS_VERSION,
    });

  if (orderError) {
    console.error(
      "Order creation failed:",
      orderError
    );

    return {
      success: false,
      error: "Unable to create checkout order.",
    };
  }

  const { error: itemError } = await admin
    .from("order_items")
    .insert({
      order_id: orderId,
      item_type: "product",
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: price,
      quantity: 1,
    });

  if (itemError) {
    console.error(
      "Order item creation failed:",
      itemError
    );

    const { error: cleanupError } = await admin
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("status", "pending")
      .eq("payment_status", "unpaid")
      .is("creem_checkout_state", null)
      .is("creem_checkout_id", null);

    if (cleanupError) {
      console.error(
        "Order cleanup failed:",
        cleanupError
      );
    }

    return {
      success: false,
      error: "Unable to prepare the purchased item.",
    };
  }

  return {
    success: true,
    orderNumber,
  };
}
