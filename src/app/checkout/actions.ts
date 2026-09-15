"use server";

import {
  randomUUID,
} from "crypto";

import {
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutState = {
  error?: string;

  fieldErrors?: {
    name?: string;
    country?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
};

function clean(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

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

export async function createCheckoutOrder(
  _previousState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  /*
   * Customer-scoped client.
   *
   * Used for:
   * - authentication
   * - reading products
   * - checking ownership
   * - reading the customer's orders
   */
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Server-only privileged client.
   *
   * Used only after we've verified
   * the authenticated user.
   */
  const admin =
    createAdminClient();

  const slug =
    clean(
      formData.get(
        "productSlug"
      )
    );

  const customerName =
    clean(
      formData.get(
        "customerName"
      )
    );

  const billingCountry =
    clean(
      formData.get(
        "billingCountry"
      )
    );

  const billingAddressLine1 =
    clean(
      formData.get(
        "billingAddressLine1"
      )
    );

  const billingAddressLine2 =
    clean(
      formData.get(
        "billingAddressLine2"
      )
    );

  const billingCity =
    clean(
      formData.get(
        "billingCity"
      )
    );

  const billingState =
    clean(
      formData.get(
        "billingState"
      )
    );

  const billingPostalCode =
    clean(
      formData.get(
        "billingPostalCode"
      )
    );

  if (!slug) {
    return {
      error:
        "Product information is missing.",
    };
  }

  const fieldErrors: CheckoutState["fieldErrors"] =
    {};

  if (
    customerName.length < 2
  ) {
    fieldErrors.name =
      "Enter your full name.";
  }

  if (!billingCountry) {
    fieldErrors.country =
      "Country is required.";
  }

  if (
    !billingAddressLine1
  ) {
    fieldErrors.addressLine1 =
      "Billing address is required.";
  }

  if (!billingCity) {
    fieldErrors.city =
      "City is required.";
  }

  if (!billingState) {
    fieldErrors.state =
      "State or region is required.";
  }

  if (
    !billingPostalCode
  ) {
    fieldErrors.postalCode =
      "Postal code is required.";
  }

  if (
    Object.keys(
      fieldErrors
    ).length > 0
  ) {
    return {
      fieldErrors,
    };
  }

  /*
   * Canonical product lookup.
   *
   * PRICE NEVER COMES FROM
   * THE BROWSER.
   */
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
      error:
        "This product is no longer available.",
    };
  }

  /*
   * Already owns it?
   */
  const {
    data:
      existingOwnership,
  } = await supabase
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

  if (
    existingOwnership
  ) {
    redirect(
      `/products/${product.id}`
    );
  }

  /*
   * See if this customer already
   * has an unfinished order for
   * this product.
   */
  const {
    data:
      pendingOrders,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number
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
    pendingOrders &&
    pendingOrders.length >
      0
  ) {
    for (
      const pendingOrder of
      pendingOrders
    ) {
      const {
        data:
          pendingItem,
      } = await supabase
        .from(
          "order_items"
        )
        .select(
          "product_id"
        )
        .eq(
          "order_id",
          pendingOrder.id
        )
        .eq(
          "product_id",
          product.id
        )
        .maybeSingle();

      if (
        pendingItem
      ) {
        redirect(
          `/checkout/success?order=${encodeURIComponent(
            pendingOrder.order_number
          )}`
        );
      }
    }
  }

  const email =
    user.email ?? "";

  if (!email) {
    return {
      error:
        "Your account does not have a valid email address.",
    };
  }

  const orderId =
    randomUUID();

  const checkoutToken =
    randomUUID();

  const orderNumber =
    createOrderNumber();

  /*
   * ORDER CREATED ONLY BY SERVER.
   */
  const {
    error:
      orderError,
  } = await admin
    .from("orders")
    .insert({
      id: orderId,

      user_id:
        user.id,

      order_number:
        orderNumber,

      status:
        "pending",

      payment_status:
        "unpaid",

      currency:
        product.currency,

      subtotal_cents:
        product.price_cents,

      total_cents:
        product.price_cents,

      payment_provider:
        null,

      provider_transaction_id:
        null,

      paddle_transaction_id:
        null,

      customer_email:
        email,

      customer_name:
        customerName,

      billing_country:
        billingCountry,

      billing_address_line1:
        billingAddressLine1,

      billing_address_line2:
        billingAddressLine2 ||
        null,

      billing_city:
        billingCity,

      billing_state:
        billingState,

      billing_postal_code:
        billingPostalCode,

      checkout_token:
        checkoutToken,
    });

  if (orderError) {
    console.error(
      "Failed to create checkout order:",
      orderError
    );

    return {
      error:
        "Unable to create your order. Please try again.",
    };
  }

  /*
   * Snapshot product information.
   */
  const {
    error:
      itemError,
  } = await admin
    .from(
      "order_items"
    )
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

      line_total_cents:
        product.price_cents,
    });

  if (itemError) {
    console.error(
      "Failed to create order item:",
      itemError
    );

    /*
     * Manual rollback.
     */
    await admin
      .from("orders")
      .delete()
      .eq(
        "id",
        orderId
      );

    return {
      error:
        "Unable to create your order. Please try again.",
    };
  }

  /*
   * Update profile name.
   *
   * This uses the user-scoped client.
   */
  await supabase
    .from("profiles")
    .update({
      full_name:
        customerName,
    })
    .eq(
      "id",
      user.id
    );

  /*
   * Order exists.
   *
   * Payment has NOT happened yet.
   */
  redirect(
    `/checkout/success?order=${encodeURIComponent(
      orderNumber
    )}`
  );
}