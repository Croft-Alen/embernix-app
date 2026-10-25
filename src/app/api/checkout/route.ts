
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prepareCheckoutOrder } from "@/app/checkout/actions";
import { createCreemCheckout } from "@/lib/creem/server";
import { validateCheckoutCoupon } from "@/lib/creem/validate-coupon";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type ReservationResult = {
  status: "reserved" | "ready" | "creating" | "conflict";
  orderNumber?: string;
  checkoutUrl?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function fail(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status }
  );
}

function parseReservation(
  value: unknown
): ReservationResult {
  if (!isRecord(value)) {
    throw new Error("Invalid checkout reservation response.");
  }

  const status = value.status;

  if (
    status !== "reserved" &&
    status !== "ready" &&
    status !== "creating" &&
    status !== "conflict"
  ) {
    throw new Error("Unknown checkout reservation status.");
  }

  return {
    status,
    orderNumber:
      typeof value.orderNumber === "string"
        ? value.orderNumber
        : undefined,
    checkoutUrl:
      typeof value.checkoutUrl === "string"
        ? value.checkoutUrl
        : undefined,
  };
}

function requireCheckoutUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "creem.io" ||
      url.hostname.endsWith(".creem.io")
    )
  ) {
    throw new Error("Unexpected checkout URL.");
  }

  return url.toString();
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request
      .json()
      .catch(() => null);

    if (!isRecord(body)) {
      return fail("Invalid checkout request.");
    }

    const productSlug =
      typeof body.productSlug === "string"
        ? body.productSlug.trim()
        : "";

    const couponCode =
      typeof body.couponCode === "string"
        ? body.couponCode.trim().toUpperCase()
        : "";

    if (
      !/^[a-zA-Z0-9_-]{1,200}$/.test(productSlug)
    ) {
      return fail("Invalid digital product.");
    }

    if (body.acceptedTerms !== true) {
      return fail(
        "Please accept the terms before checkout."
      );
    }

    if (
      couponCode &&
      !/^[A-Z0-9]{1,32}$/.test(couponCode)
    ) {
      return fail("Invalid coupon code.");
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return fail("Please sign in.", 401);
    }

    const admin = createAdminClient();

    const {
      data: product,
      error: productError,
    } = await admin
      .from("products")
      .select(
        "id,slug,name,price_cents,currency,active,creem_product_id"
      )
      .eq("slug", productSlug)
      .eq("active", true)
      .maybeSingle();

    if (productError) {
      console.error(
        "Creem product lookup:",
        productError
      );

      return fail("Unable to load product.", 500);
    }

    if (!product) {
      return fail("Product not found.", 404);
    }

    if (!product.creem_product_id) {
      return fail(
        "This product is not configured for Creem.",
        409
      );
    }

    const priceCents = Number(product.price_cents);
    const currency = String(product.currency);

    if (
      !Number.isSafeInteger(priceCents) ||
      priceCents <= 0 ||
      !/^[A-Z]{3}$/.test(currency)
    ) {
      return fail(
        "Invalid product price or currency.",
        409
      );
    }

    const {
      data: ownership,
      error: ownershipError,
    } = await admin
      .from("customer_products")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .eq("status", "active")
      .maybeSingle();

    if (ownershipError) {
      return fail(
        "Unable to verify product ownership.",
        500
      );
    }

    if (ownership) {
      return NextResponse.json({
        ownedProductId: product.id,
      });
    }

    let discountCents = 0;
    let validatedCode: string | null = null;

    if (couponCode) {
      try {
        const coupon = await validateCheckoutCoupon({
          code: couponCode,
          productId: product.id,
          creemProductId: product.creem_product_id,
          productPriceCents: priceCents,
          currency,
        });

        discountCents = coupon.discountCents;
        validatedCode = coupon.code;
      } catch (error) {
        return fail(
          error instanceof Error
            ? error.message
            : "Invalid coupon."
        );
      }
    }

    if (
      !Number.isSafeInteger(discountCents) ||
      discountCents < 0 ||
      discountCents > priceCents
    ) {
      return fail("Invalid discount amount.", 409);
    }

    const expectedTotalCents =
      priceCents - discountCents;

    const prepared = await prepareCheckoutOrder(
      productSlug,
      true
    );

    if (!prepared.success) {
      if (prepared.ownedProductId) {
        return NextResponse.json({
          ownedProductId: prepared.ownedProductId,
        });
      }

      return fail(prepared.error);
    }

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(
        "id,user_id,order_number,status,payment_status,payment_provider,currency,subtotal_cents,total_cents,creem_checkout_id,creem_checkout_state"
      )
      .eq("order_number", prepared.orderNumber)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError || !order) {
      return fail("Checkout order not found.", 500);
    }

    if (
      order.status !== "pending" ||
      order.payment_status !== "unpaid" ||
      order.payment_provider !== "creem"
    ) {
      return fail(
        "Order is not awaiting payment.",
        409
      );
    }

    const {
      data: items,
      error: itemsError,
    } = await admin
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
      Number(items[0].unit_price_cents) !== priceCents ||
      Number(order.subtotal_cents) !== priceCents ||
      order.currency !== currency
    ) {
      return fail(
        "Order contents do not match the product.",
        409
      );
    }

    /*
     * Existing checkout attempts may already be
     * reserved. Only a new/unreserved order may
     * receive updated discount accounting.
     */
    if (
      order.creem_checkout_state === null &&
      order.creem_checkout_id === null
    ) {
      const {
        data: updated,
        error: accountingError,
      } = await admin
        .from("orders")
        .update({
          subtotal_cents: priceCents,
          total_cents: expectedTotalCents,
          creem_discount_code: validatedCode,
          creem_discount_cents: discountCents,
          creem_tax_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .eq("payment_status", "unpaid")
        .is("creem_checkout_id", null)
        .is("creem_checkout_state", null)
        .select("id")
        .maybeSingle();

      if (accountingError) {
        console.error(
          "Checkout pricing update:",
          accountingError
        );

        return fail(
          "Unable to save checkout pricing.",
          500
        );
      }

      if (!updated) {
        return fail(
          "Checkout is already being prepared. Please retry.",
          409
        );
      }
    }

    const claimToken = randomUUID();

    const {
      data: rawReservation,
      error: reservationError,
    } = await admin.rpc(
      "reserve_creem_checkout",
      {
        p_user_id: user.id,
        p_product_id: product.id,
        p_order_id: order.id,
        p_discount_code: validatedCode,
        p_discount_cents: discountCents,
        p_claim_token: claimToken,
      }
    );

    if (reservationError) {
      console.error(
        "Checkout reservation failed:",
        reservationError
      );

      return fail(
        "Unable to reserve checkout.",
        500
      );
    }

    const reservation =
      parseReservation(rawReservation);

    if (reservation.status === "ready") {
      if (
        !reservation.checkoutUrl ||
        !reservation.orderNumber
      ) {
        return fail(
          "Existing checkout is missing its URL.",
          500
        );
      }

      return NextResponse.json({
        checkoutUrl: requireCheckoutUrl(
          reservation.checkoutUrl
        ),
        orderNumber: reservation.orderNumber,
        reused: true,
      });
    }

    if (reservation.status === "creating") {
      return fail(
        "Your checkout is already being prepared. " +
          "Do not submit another payment. " +
          "If this message persists, contact support.",
        409
      );
    }

    if (reservation.status === "conflict") {
      return fail(
        "An existing checkout uses different pricing " +
          "or a different coupon. Complete that " +
          "checkout or contact support.",
        409
      );
    }

    if (
      reservation.status !== "reserved" ||
      reservation.orderNumber !== order.order_number
    ) {
      return fail(
        "Checkout reservation did not match the order.",
        409
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      console.error(
        "NEXT_PUBLIC_APP_URL is not configured."
      );

      return fail(
        "Application checkout URL is not configured.",
        500
      );
    }

    const successUrl = new URL(
      "/checkout/success",
      appUrl
    );

    successUrl.searchParams.set(
      "order",
      order.order_number
    );

    /*
     * Only the request that reserved the order
     * is permitted to create a Creem checkout.
     */
    const checkout = await createCreemCheckout({
      productId: product.creem_product_id,
      orderNumber: order.order_number,
      customerEmail: user.email,
      successUrl: successUrl.toString(),
      metadata: {
        orderNumber: order.order_number,
        userId: user.id,
        productId: product.id,
      },
      discountCode: validatedCode,
    });

    const {
      data: finalized,
      error: finalizeError,
    } = await admin.rpc(
      "finalize_creem_checkout",
      {
        p_order_id: order.id,
        p_claim_token: claimToken,
        p_checkout_id: checkout.id,
        p_checkout_url: checkout.checkoutUrl,
      }
    );

    if (finalizeError || finalized !== true) {
      console.error(
        "Creem checkout finalization failed:",
        finalizeError
      );

      /*
       * Do not automatically create another
       * checkout after this failure.
       *
       * The remote session may already exist.
       */
      return fail(
        "Creem created a checkout, but Embernix " +
          "could not save it. Please contact support " +
          "before trying another payment.",
        500
      );
    }

    return NextResponse.json({
      checkoutUrl: requireCheckoutUrl(
        checkout.checkoutUrl
      ),
      orderNumber: order.order_number,
      reused: false,
    });
  } catch (error) {
    console.error(
      "Creem checkout preparation failed:",
      error
    );

    return fail(
      "Unable to prepare checkout. " +
        "Check your existing order before retrying.",
      500
    );
  }
}
