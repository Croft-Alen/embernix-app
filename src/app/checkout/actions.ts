"use server";

import { randomUUID } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const TERMS_VERSION = "2026-09-15";

function createOrderNumber() {
  const now = new Date();

  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  const randomPart = randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `EMB-${datePart}-${randomPart}`;
}

export async function prepareCheckoutOrder(
  productSlug: string,
  acceptedTerms: boolean
): Promise<PrepareCheckoutResult> {
  if (!acceptedTerms) {
    return {
      success: false,
      error:
        "You must agree to the Terms of Service before continuing.",
    };
  }

  const slug = productSlug.trim();

  if (!slug) {
    return {
      success: false,
      error: "Product information is missing.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Please sign in before continuing.",
    };
  }

  if (!user.email) {
    return {
      success: false,
      error:
        "Your Embernix account does not have a valid email address.",
    };
  }

  /*
   * Canonical product.
   * Never trust product/price data from browser.
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      name,
      price_cents,
      currency,
      active,
      paddle_price_id
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (productError || !product) {
    return {
      success: false,
      error: "This product is no longer available.",
    };
  }

  /*
   * Prevent purchasing something already owned.
   */
  const {
    data: ownership,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      product_id,
      status
    `)
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("status", "active")
    .maybeSingle();

  if (ownership) {
    return {
      success: false,
      error: "You already own this product.",
      ownedProductId: product.id,
    };
  }

  /*
   * Look for an existing pending order
   * for this same product.
   */
  const {
    data: pendingOrders,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      paddle_transaction_id,
      created_at
    `)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("payment_status", "unpaid")
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (pendingOrders?.length) {
    for (const pendingOrder of pendingOrders) {
      const {
        data: pendingItem,
      } = await supabase
        .from("order_items")
        .select(`
          id,
          product_id
        `)
        .eq("order_id", pendingOrder.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (pendingItem) {
        /*
         * Record fresh terms acceptance
         * when the existing pending order
         * is reused.
         */
        const admin = createAdminClient();

        const {
          error: termsUpdateError,
        } = await admin
          .from("orders")
          .update({
            terms_accepted_at:
              new Date().toISOString(),

            terms_version:
              TERMS_VERSION,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", pendingOrder.id);

        if (termsUpdateError) {
          console.error(
            "Failed to update terms acceptance:",
            termsUpdateError
          );

          return {
            success: false,
            error:
              "Unable to prepare your order. Please try again.",
          };
        }

        return {
          success: true,
          orderNumber:
            pendingOrder.order_number,
        };
      }
    }
  }

  const admin = createAdminClient();

  const orderId = randomUUID();
  const checkoutToken = randomUUID();
  const orderNumber = createOrderNumber();

  /*
   * Create internal pending order.
   */
  const {
    error: orderError,
  } = await admin
    .from("orders")
    .insert({
      id: orderId,

      user_id: user.id,

      order_number: orderNumber,

      status: "pending",
      payment_status: "unpaid",

      currency:
        product.currency,

      subtotal_cents:
        product.price_cents,

      total_cents:
        product.price_cents,

      customer_email:
        user.email,

      payment_provider:
        null,

      provider_transaction_id:
        null,

      paddle_transaction_id:
        null,

      checkout_token:
        checkoutToken,

      terms_accepted_at:
        new Date().toISOString(),

      terms_version:
        TERMS_VERSION,
    });

  if (orderError) {
    console.error(
      "Failed to create checkout order:",
      orderError
    );

    return {
      success: false,
      error:
        "Unable to prepare your order. Please try again.",
    };
  }

  /*
   * Create order item snapshot.
   *
   * IMPORTANT:
   * line_total_cents is generated
   * automatically by PostgreSQL.
   * Do not insert a value into it.
   */
  const {
    error: itemError,
  } = await admin
    .from("order_items")
    .insert({
      order_id:
        orderId,

      product_id:
        product.id,

      product_name:
        product.name,

      unit_price_cents:
        product.price_cents,

      quantity: 1,
    });

  if (itemError) {
    console.error(
      "Failed to create checkout item:",
      itemError
    );

    /*
     * Manual rollback so we don't leave
     * an empty pending order behind.
     */
    await admin
      .from("orders")
      .delete()
      .eq("id", orderId);

    return {
      success: false,
      error:
        "Unable to prepare your order. Please try again.",
    };
  }

  return {
    success: true,
    orderNumber,
  };
}