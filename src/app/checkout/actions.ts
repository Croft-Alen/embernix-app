"use server";

import {
  randomUUID,
} from "crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export type CheckoutItemType =
  | "product"
  | "service";

export type ServiceBillingInput = {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

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
    ).padStart(2, "0"),
    String(
      now.getUTCDate()
    ).padStart(2, "0"),
  ].join("");

  const randomPart =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `EMB-${datePart}-${randomPart}`;
}

function createInvoiceNumber() {
  const now =
    new Date();

  const datePart = [
    now.getUTCFullYear(),
    String(
      now.getUTCMonth() + 1
    ).padStart(2, "0"),
    String(
      now.getUTCDate()
    ).padStart(2, "0"),
  ].join("");

  const randomPart =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `INV-${datePart}-${randomPart}`;
}

function clean(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ?? ""
  ).trim();
}

/*
 * ======================================
 * BILLING PROFILE
 * ======================================
 */

async function saveBillingProfile(
  userId: string,
  billing: ServiceBillingInput
) {
  const admin =
    createAdminClient();

  const companyName =
    clean(
      billing.companyName
    );

  const addressLine1 =
    clean(
      billing.addressLine1
    );

  const addressLine2 =
    clean(
      billing.addressLine2
    );

  const city =
    clean(
      billing.city
    );

  const state =
    clean(
      billing.state
    );

  const postalCode =
    clean(
      billing.postalCode
    );

  const country =
    clean(
      billing.country
    );

  if (!addressLine1) {
    throw new Error(
      "Billing address is required."
    );
  }

  if (!city) {
    throw new Error(
      "Billing city is required."
    );
  }

  if (!country) {
    throw new Error(
      "Billing country is required."
    );
  }

  const {
    data: profile,
    error,
  } = await admin
    .from("billing_profiles")
    .upsert(
      {
        user_id:
          userId,

        company_name:
          companyName ||
          null,

        address_line_1:
          addressLine1,

        address_line_2:
          addressLine2 ||
          null,

        city,

        state:
          state ||
          null,

        postal_code:
          postalCode ||
          null,

        country,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "user_id",
      }
    )
    .select("id")
    .single();

  if (
    error ||
    !profile
  ) {
    console.error(
      "Failed to save billing profile:",
      error
    );

    throw new Error(
      "Unable to save billing details."
    );
  }

  return profile.id;
}

/*
 * ======================================
 * SERVICE INVOICE
 * ======================================
 */

async function ensureServiceInvoice({
  orderId,
  userId,
  serviceId,
  serviceName,
  serviceDescription,
  billingProfileId,
  currency,
  subtotalCents,
  totalCents,
  unitPriceCents,
  quantity,
}: {
  orderId: string;
  userId: string;
  serviceId: string;
  serviceName: string;

  serviceDescription:
    | string
    | null;

  billingProfileId: string;

  currency: string;

  subtotalCents: number;
  totalCents: number;
  unitPriceCents: number;
  quantity: number;
}) {
  const admin =
    createAdminClient();

  const {
    data:
      existingInvoice,
    error:
      existingInvoiceError,
  } = await admin
    .from("invoices")
    .select(`
      id,
      status
    `)
    .eq(
      "order_id",
      orderId
    )
    .maybeSingle();

  if (
    existingInvoiceError
  ) {
    console.error(
      "Failed checking service invoice:",
      existingInvoiceError
    );

    throw new Error(
      "Unable to prepare service invoice."
    );
  }

  let invoiceId:
    string;

  /*
   * Existing invoice is only reusable
   * while still unpaid.
   */
  if (
    existingInvoice
  ) {
    if (
      existingInvoice.status !==
      "unpaid"
    ) {
      throw new Error(
        "This service invoice can no longer be reused."
      );
    }

    invoiceId =
      existingInvoice.id;

    const {
      error:
        refreshError,
    } = await admin
      .from("invoices")
      .update({
        billing_profile_id:
          billingProfileId,

        service_id:
          serviceId,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        invoiceId
      )
      .eq(
        "status",
        "unpaid"
      );

    if (refreshError) {
      console.error(
        "Failed refreshing service invoice:",
        refreshError
      );

      throw new Error(
        "Unable to refresh service invoice."
      );
    }
  } else {
    const now =
      new Date().toISOString();

    const {
      data:
        createdInvoice,
      error:
        invoiceError,
    } = await admin
      .from("invoices")
      .insert({
        invoice_number:
          createInvoiceNumber(),

        order_id:
          orderId,

        user_id:
          userId,

        service_id:
          serviceId,

        billing_profile_id:
          billingProfileId,

        source:
          "service",

        status:
          "unpaid",

        currency,

        subtotal_cents:
          subtotalCents,

        discount_cents:
          0,

        tax_cents:
          0,

        total_cents:
          totalCents,

        issued_at:
          now,

        due_at:
          null,

        paid_at:
          null,

        payment_provider:
          null,

        paddle_transaction_id:
          null,

        notes:
          null,

        created_by:
          null,

        updated_at:
          now,
      })
      .select("id")
      .single();

    if (
      invoiceError ||
      !createdInvoice
    ) {
      console.error(
        "Failed creating unpaid service invoice:",
        invoiceError
      );

      throw new Error(
        "Unable to create service invoice."
      );
    }

    invoiceId =
      createdInvoice.id;
  }

  /*
   * Ensure invoice item exists.
   */
  const {
    data:
      existingItem,
    error:
      existingItemError,
  } = await admin
    .from("invoice_items")
    .select("id")
    .eq(
      "invoice_id",
      invoiceId
    )
    .limit(1)
    .maybeSingle();

  if (
    existingItemError
  ) {
    console.error(
      "Failed checking service invoice item:",
      existingItemError
    );

    throw new Error(
      "Unable to prepare invoice item."
    );
  }

  if (!existingItem) {
    const {
      error:
        invoiceItemError,
    } = await admin
      .from("invoice_items")
      .insert({
        invoice_id:
          invoiceId,

        title:
          serviceName,

        description:
          serviceDescription,

        quantity,

        unit_price_cents:
          unitPriceCents,

        sort_order:
          0,
      });

    if (
      invoiceItemError
    ) {
      console.error(
        "Failed creating service invoice item:",
        invoiceItemError
      );

      /*
       * Only remove the invoice if it is
       * still unpaid.
       */
      await admin
        .from("invoices")
        .delete()
        .eq(
          "id",
          invoiceId
        )
        .eq(
          "status",
          "unpaid"
        );

      throw new Error(
        "Unable to create service invoice item."
      );
    }
  }

  return invoiceId;
}

/*
 * ======================================
 * MAIN CHECKOUT PREPARATION
 * ======================================
 */

export async function prepareCheckoutOrder(
  itemType: CheckoutItemType,
  itemSlug: string,
  acceptedTerms: boolean,
  billing:
    | ServiceBillingInput
    | null = null
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

  /*
   * ======================================
   * AUTH
   * ======================================
   */

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

  const admin =
    createAdminClient();

  /*
   * ======================================
   * LOAD PRODUCT / SERVICE
   * ======================================
   */

  let item:
    | {
        id: string;
        slug: string;
        name: string;

        short_description:
          | string
          | null;

        price_cents: number;
        currency: string;
      }
    | null = null;

  if (
    itemType ===
    "product"
  ) {
    const {
      data: product,
      error:
        productError,
    } = await admin
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

    item = {
      id:
        product.id,

      slug:
        product.slug,

      name:
        product.name,

      short_description:
        null,

      price_cents:
        Number(
          product.price_cents
        ),

      currency:
        product.currency,
    };

    /*
     * Prevent duplicate product ownership.
     */
    const {
      data:
        ownership,
    } = await admin
      .from(
        "customer_products"
      )
      .select(`
        id,
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
  } else {
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
        short_description,
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

    item = {
      id:
        service.id,

      slug:
        service.slug,

      name:
        service.name,

      short_description:
        service.short_description,

      price_cents:
        Number(
          service.price_cents
        ),

      currency:
        service.currency,
    };
  }

  if (
    !item ||
    !Number.isFinite(
      item.price_cents
    ) ||
    item.price_cents <= 0
  ) {
    return {
      success: false,

      error:
        "This item cannot currently be purchased.",
    };
  }

  /*
   * ======================================
   * SERVICE BILLING
   * ======================================
   */

  let billingProfileId:
    | string
    | null = null;

  if (
    itemType ===
    "service"
  ) {
    if (!billing) {
      return {
        success: false,

        error:
          "Billing details are required for services.",
      };
    }

    try {
      billingProfileId =
        await saveBillingProfile(
          user.id,
          billing
        );
    } catch (error) {
      return {
        success: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Unable to save billing details.",
      };
    }
  }

  /*
   * ======================================
   * TRY TO REUSE PENDING ORDER
   * ======================================
   *
   * IMPORTANT:
   *
   * Product:
   * pending + unpaid order may be reused.
   *
   * Service:
   * pending + unpaid order may ONLY be reused
   * if its invoice is also still UNPAID.
   *
   * A paid/cancelled/refunded service invoice
   * must NEVER be attached to another payment.
   */

  const {
    data:
      pendingOrders,
    error:
      pendingOrdersError,
  } = await admin
    .from("orders")
    .select(`
      id,
      order_number,
      currency,
      subtotal_cents,
      total_cents,
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
    .limit(20);

  if (
    pendingOrdersError
  ) {
    console.error(
      "Failed checking pending checkout orders:",
      pendingOrdersError
    );
  }

  if (
    pendingOrders?.length
  ) {
    for (
      const pendingOrder
      of pendingOrders
    ) {
      let pendingItem:
        | {
            id: string;
            item_type: string;
            product_id:
              | string
              | null;
            service_id:
              | string
              | null;
            product_name: string;
            unit_price_cents: number;
            quantity: number;
          }
        | null = null;

      /*
       * Avoid mutable Supabase query builder
       * typing issues by querying each type
       * separately.
       */
      if (
        itemType ===
        "product"
      ) {
        const {
          data,
          error,
        } = await admin
          .from("order_items")
          .select(`
            id,
            item_type,
            product_id,
            service_id,
            product_name,
            unit_price_cents,
            quantity
          `)
          .eq(
            "order_id",
            pendingOrder.id
          )
          .eq(
            "item_type",
            "product"
          )
          .eq(
            "product_id",
            item.id
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Failed checking pending product item:",
            error
          );

          continue;
        }

        pendingItem =
          data;
      } else {
        const {
          data,
          error,
        } = await admin
          .from("order_items")
          .select(`
            id,
            item_type,
            product_id,
            service_id,
            product_name,
            unit_price_cents,
            quantity
          `)
          .eq(
            "order_id",
            pendingOrder.id
          )
          .eq(
            "item_type",
            "service"
          )
          .eq(
            "service_id",
            item.id
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Failed checking pending service item:",
            error
          );

          continue;
        }

        pendingItem =
          data;
      }

      /*
       * This pending order belongs to some
       * other checkout item.
       */
      if (!pendingItem) {
        continue;
      }

      /*
       * ======================================
       * CRITICAL SERVICE REUSE CHECK
       * ======================================
       */
      if (
        itemType ===
        "service"
      ) {
        const {
          data:
            existingServiceInvoice,
          error:
            existingServiceInvoiceError,
        } = await admin
          .from("invoices")
          .select(`
            id,
            status,
            paddle_transaction_id
          `)
          .eq(
            "order_id",
            pendingOrder.id
          )
          .maybeSingle();

        if (
          existingServiceInvoiceError
        ) {
          console.error(
            "Failed checking reusable service invoice:",
            existingServiceInvoiceError
          );

          /*
           * Don't risk reusing an uncertain
           * service order.
           */
          continue;
        }

        /*
         * Existing invoice:
         *
         * unpaid -> reusable
         *
         * paid / cancelled / refunded / draft /
         * anything else -> old checkout, skip it.
         */
        if (
          existingServiceInvoice &&
          existingServiceInvoice.status !==
            "unpaid"
        ) {
          console.log(
            "Skipping old pending service order because invoice is not unpaid:",
            {
              orderId:
                pendingOrder.id,

              orderNumber:
                pendingOrder.order_number,

              invoiceId:
                existingServiceInvoice.id,

              invoiceStatus:
                existingServiceInvoice.status,
            }
          );

          continue;
        }

        /*
         * If an unpaid invoice somehow has
         * a Paddle transaction, that's okay.
         *
         * The Paddle API route can continue
         * that existing transaction.
         */
      }

      /*
       * Refresh terms acceptance on valid
       * reusable checkout.
       */
      const {
        error:
          refreshOrderError,
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
        )
        .eq(
          "status",
          "pending"
        )
        .eq(
          "payment_status",
          "unpaid"
        );

      if (
        refreshOrderError
      ) {
        console.error(
          "Failed refreshing pending checkout:",
          refreshOrderError
        );

        continue;
      }

      /*
       * For service orders, make sure the
       * unpaid invoice exists and billing
       * details are current.
       */
      if (
        itemType ===
          "service" &&
        billingProfileId
      ) {
        try {
          await ensureServiceInvoice({
            orderId:
              pendingOrder.id,

            userId:
              user.id,

            serviceId:
              item.id,

            serviceName:
              pendingItem.product_name ||
              item.name,

            serviceDescription:
              item.short_description,

            billingProfileId,

            currency:
              pendingOrder.currency,

            subtotalCents:
              Number(
                pendingOrder
                  .subtotal_cents
              ),

            totalCents:
              Number(
                pendingOrder
                  .total_cents
              ),

            unitPriceCents:
              Number(
                pendingItem
                  .unit_price_cents
              ),

            quantity:
              Math.max(
                Number(
                  pendingItem.quantity ??
                    1
                ),
                1
              ),
          });
        } catch (error) {
          console.error(
            "Failed preparing reusable service invoice:",
            error
          );

          /*
           * Do NOT return this old broken
           * checkout.
           *
           * Skip it and create a fresh
           * order + fresh unpaid invoice below.
           */
          continue;
        }
      }

      /*
       * Valid reusable checkout.
       */
      return {
        success: true,

        orderNumber:
          pendingOrder.order_number,
      };
    }
  }

  /*
   * ======================================
   * CREATE NEW ORDER
   * ======================================
   */

  const orderId =
    randomUUID();

  const checkoutToken =
    randomUUID();

  const orderNumber =
    createOrderNumber();

  const now =
    new Date().toISOString();

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
        now,

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
        "Unable to prepare checkout. Please try again.",
    };
  }

  /*
   * ======================================
   * CREATE ORDER ITEM
   * ======================================
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

      /*
       * Existing snapshot column name.
       * Used for both products and services.
       */
      product_name:
        item.name,

      unit_price_cents:
        item.price_cents,

      quantity:
        1,
    });

  if (itemError) {
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

  /*
   * ======================================
   * CREATE UNPAID SERVICE INVOICE
   * ======================================
   */

  if (
    itemType ===
      "service" &&
    billingProfileId
  ) {
    try {
      await ensureServiceInvoice({
        orderId,

        userId:
          user.id,

        serviceId:
          item.id,

        serviceName:
          item.name,

        serviceDescription:
          item.short_description,

        billingProfileId,

        currency:
          item.currency,

        subtotalCents:
          item.price_cents,

        totalCents:
          item.price_cents,

        unitPriceCents:
          item.price_cents,

        quantity:
          1,
      });
    } catch (error) {
      console.error(
        "Failed creating service invoice:",
        error
      );

      /*
       * Deleting the order cascades / removes
       * its order item according to the
       * existing relationship.
       *
       * Any unpaid invoice created for this
       * order should also be removed first.
       */
      await admin
        .from("invoices")
        .delete()
        .eq(
          "order_id",
          orderId
        )
        .eq(
          "status",
          "unpaid"
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
          error instanceof
            Error
            ? error.message
            : "Unable to create service invoice.",
      };
    }
  }

  return {
    success: true,

    orderNumber,
  };
}