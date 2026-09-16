"use server";

import { randomUUID } from "crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export type CheckoutItemType =
  | "product"
  | "service";

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

const TERMS_VERSION =
  "2026-09-15";

function createOrderNumber() {
  const now =
    new Date();

  const datePart = [
    now.getUTCFullYear(),

    String(
      now.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getUTCDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("");

  const randomPart =
    randomUUID()
      .replace(
        /-/g,
        ""
      )
      .slice(
        0,
        8
      )
      .toUpperCase();

  return `EMB-${datePart}-${randomPart}`;
}

export async function prepareCheckoutOrder(
  itemType: CheckoutItemType,
  itemSlug: string,
  acceptedTerms: boolean
): Promise<PrepareCheckoutResult> {
  if (!acceptedTerms) {
    return {
      success: false,
      error:
        "Please agree to the Terms of Service.",
    };
  }

  const slug =
    itemSlug.trim();

  if (!slug) {
    return {
      success: false,
      error:
        "Checkout information is missing.",
    };
  }

  if (
    itemType !==
      "product" &&
    itemType !==
      "service"
  ) {
    return {
      success: false,
      error:
        "Invalid checkout item.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error:
        "Please sign in before continuing.",
    };
  }

  if (!user.email) {
    return {
      success: false,
      error:
        "Your Embernix account has no valid email address.",
    };
  }

  let item:
    | {
        id: string;
        slug: string;
        name: string;
        price_cents: number;
        currency: string;
        active: boolean;
      }
    | null = null;

  /*
   * ======================================
   * PRODUCT
   * ======================================
   */
  if (
    itemType ===
    "product"
  ) {
    const {
      data: product,
      error:
        productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        price_cents,
        currency,
        active
      `)
      .eq(
        "slug",
        slug
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

    if (
      productError ||
      !product
    ) {
      return {
        success: false,
        error:
          "This product is no longer available.",
      };
    }

    item = product;

    const {
      data:
        ownership,
    } = await supabase
      .from(
        "customer_products"
      )
      .select(`
        id,
        product_id,
        status
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "product_id",
        product.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

    if (ownership) {
      return {
        success: false,
        error:
          "You already own this product.",
        ownedProductId:
          product.id,
      };
    }
  }

  /*
   * ======================================
   * SERVICE
   * ======================================
   */
  else {
    const admin =
      createAdminClient();

    const {
      data: service,
      error:
        serviceError,
    } = await admin
      .from("services")
      .select(`
        id,
        slug,
        name,
        price_cents,
        currency,
        active
      `)
      .eq(
        "slug",
        slug
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

    if (
      serviceError ||
      !service
    ) {
      return {
        success: false,
        error:
          "This service is no longer available.",
      };
    }

    item = service;
  }

  if (
    !item ||
    Number(
      item.price_cents
    ) <= 0
  ) {
    return {
      success: false,
      error:
        "This item cannot currently be purchased.",
    };
  }

  /*
   * ======================================
   * REUSE PENDING ORDER
   * ======================================
   */
  const {
    data:
      pendingOrders,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "status",
      "pending"
    )
    .eq(
      "payment_status",
      "unpaid"
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(10);

  if (
    pendingOrders?.length
  ) {
    for (
      const pendingOrder
      of pendingOrders
    ) {
      let pendingItemQuery =
        supabase
          .from(
            "order_items"
          )
          .select(`
            id,
            product_id,
            service_id,
            item_type
          `)
          .eq(
            "order_id",
            pendingOrder.id
          )
          .eq(
            "item_type",
            itemType
          );

      if (
        itemType ===
        "product"
      ) {
        pendingItemQuery =
          pendingItemQuery.eq(
            "product_id",
            item.id
          );
      } else {
        pendingItemQuery =
          pendingItemQuery.eq(
            "service_id",
            item.id
          );
      }

      const {
        data:
          pendingItem,
      } =
        await pendingItemQuery.maybeSingle();

      if (!pendingItem) {
        continue;
      }

      const admin =
        createAdminClient();

      const {
        error:
          updateError,
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
        .eq(
          "id",
          pendingOrder.id
        );

      if (
        updateError
      ) {
        console.error(
          "Failed to refresh checkout terms acceptance:",
          updateError
        );

        return {
          success: false,
          error:
            "Unable to prepare checkout. Please try again.",
        };
      }

      return {
        success: true,
        orderNumber:
          pendingOrder.order_number,
      };
    }
  }

  /*
   * ======================================
   * CREATE ORDER
   * ======================================
   */

  const admin =
    createAdminClient();

  const orderId =
    randomUUID();

  const checkoutToken =
    randomUUID();

  const orderNumber =
    createOrderNumber();

  const {
    error:
      orderError,
  } = await admin
    .from("orders")
    .insert({
      id:
        orderId,

      user_id:
        user.id,

      order_number:
        orderNumber,

      status:
        "pending",

      payment_status:
        "unpaid",

      currency:
        item.currency,

      subtotal_cents:
        item.price_cents,

      total_cents:
        item.price_cents,

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

  if (
    orderError
  ) {
    console.error(
      "Failed to create checkout order:",
      orderError
    );

    return {
      success: false,
      error:
        "Unable to prepare checkout. Please try again.",
    };
  }

  /*
   * ======================================
   * CREATE ORDER ITEM
   * ======================================
   *
   * line_total_cents is GENERATED.
   * Do not insert it.
   */
  const {
    error:
      itemError,
  } = await admin
    .from("order_items")
    .insert({
      order_id:
        orderId,

      item_type:
        itemType,

      product_id:
        itemType ===
        "product"
          ? item.id
          : null,

      service_id:
        itemType ===
        "service"
          ? item.id
          : null,

      product_name:
        item.name,

      unit_price_cents:
        item.price_cents,

      quantity:
        1,
    });

  if (
    itemError
  ) {
    console.error(
      "Failed to create checkout item:",
      itemError
    );

    await admin
      .from("orders")
      .delete()
      .eq(
        "id",
        orderId
      );

    return {
      success: false,
      error:
        "Unable to prepare checkout. Please try again.",
    };
  }

  return {
    success: true,
    orderNumber,
  };
}