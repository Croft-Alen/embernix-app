
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

function fail(
  error: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error,
      ...details,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function parseReservation(
  value: unknown
): ReservationResult {
  if (!isRecord(value)) {
    throw new Error(
      "Invalid checkout reservation response."
    );
  }

  const status = value.status;

  if (
    status !== "reserved" &&
    status !== "ready" &&
    status !== "creating" &&
    status !== "conflict"
  ) {
    throw new Error(
      "Unknown checkout reservation status."
    );
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
    throw new Error(
      "Unexpected checkout URL."
    );
  }

  return url.toString();
}

export async function POST(request: Request) {
  try {
    const body: unknown =
      await request.json().catch(() => null);

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
        "Creem product lookup failed:",
        productError
      );

      return fail(
        "Unable to load product.",
        500
      );
    }

    if (!product) {
      return fail(
        "Product not found.",
        404
      );
    }

    if (!product.creem_product_id) {
      return fail(
        "This product is not configured for Creem.",
        409
      );
    }

    const priceCents = Number(
      product.price_cents
    );

    const currency = String(
      product.currency
    );

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

    /*
     * License ownership checks.
     *
     * Active:
     *   Already owned.
     *
     * Revoked / refunded:
     *   Cannot purchase again.
     *
     * renewal_required:
     *   Allowed through ordinary checkout.
     */

    const {
      data: ownership,
      error: ownershipError,
    } = await admin
      .from("customer_products")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (ownershipError) {
      return fail(
        "Unable to verify product ownership.",
        500
      );
    }

    if (ownership?.status === "active") {
      return NextResponse.json({
        ownedProductId: product.id,
      });
    }

    if (ownership?.status === "revoked") {
      return fail(
        "Your product access has been revoked. Contact support.",
        403
      );
    }

    if (ownership?.status === "refunded") {
      return fail(
        "This purchase was refunded. Contact support.",
        403
      );
    }

    if (
      ownership &&
      ownership.status !== "renewal_required"
    ) {
      return fail(
        "This license is not available for checkout.",
        409
      );
    }

    /*
     * Validate discount against Embernix
     * and Creem before preparing payment.
     */

    let discountCents = 0;
    let validatedCode: string | null = null;

    if (couponCode) {
      try {
        const coupon =
          await validateCheckoutCoupon({
            code: couponCode,
            productId: product.id,
            creemProductId:
              product.creem_product_id,
            productPriceCents: priceCents,
            currency,
          });

        discountCents =
          coupon.discountCents;

        validatedCode =
          coupon.code;
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
      return fail(
        "Invalid discount amount.",
        409
      );
    }

    /*
     * Prepare a local order.
     *
     * The reservation RPC is responsible
     * for atomically assigning the coupon
     * and checkout pricing.
     */

    const prepared =
      await prepareCheckoutOrder(
        productSlug,
        true
      );

    if (!prepared.success) {
      if (prepared.ownedProductId) {
        return NextResponse.json({
          ownedProductId:
            prepared.ownedProductId,
        });
      }

      return fail(
        prepared.error
      );
    }

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(
        "id,user_id,order_number,status,payment_status,payment_provider,currency,subtotal_cents,total_cents,creem_checkout_id,creem_checkout_state"
      )
      .eq(
        "order_number",
        prepared.orderNumber
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError || !order) {
      return fail(
        "Checkout order not found.",
        500
      );
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

    /*
     * Verify the order still represents
     * this exact single digital product.
     */

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
      Number(
        items[0].unit_price_cents
      ) !== priceCents ||
      Number(
        order.subtotal_cents
      ) !== priceCents ||
      order.currency !== currency
    ) {
      return fail(
        "Order contents do not match the product.",
        409
      );
    }

    /*
     * Reserve the checkout atomically.
     *
     * This prevents concurrent requests
     * from creating duplicate sessions.
     */

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
        p_discount_code:
          validatedCode,
        p_discount_cents:
          discountCents,
        p_claim_token: claimToken,
      }
    );

    if (reservationError) {
      console.error(
        "Creem checkout reservation failed:",
        reservationError
      );

      return fail(
        "Unable to reserve checkout. Please retry.",
        500
      );
    }

    const reservation =
      parseReservation(
        rawReservation
      );

    /*
     * Identical checkout already exists.
     * Reuse it instead of creating another.
     */

    if (
      reservation.status === "ready"
    ) {
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
        checkoutUrl:
          requireCheckoutUrl(
            reservation.checkoutUrl
          ),
        orderNumber:
          reservation.orderNumber,
        reused: true,
      });
    }

    /*
     * Creem session creation is currently
     * running or may have been interrupted.
     */

    if (
      reservation.status === "creating"
    ) {
      console.warn(
        "Creem checkout creation already in progress:",
        reservation.orderNumber
      );

      return fail(
        "A previous checkout is still being prepared. " +
          "Please retry shortly. If the issue continues, " +
          "contact support with your order number.",
        409,
        {
          code: "CHECKOUT_CREATING",
          orderNumber:
            reservation.orderNumber,
        }
      );
    }

    /*
     * FIX: DIFFERENT COUPON / PRICE.
     *
     * Instead of returning only a generic
     * error, locate the existing checkout
     * and expose its original payment URL.
     *
     * We must not overwrite that checkout's
     * coupon or original total because it
     * may still be payable at Creem.
     */

    if (
      reservation.status === "conflict"
    ) {
      if (!reservation.orderNumber) {
        return fail(
          "Unable to identify the previous checkout.",
          409,
          {
            code: "CHECKOUT_CONFLICT",
          }
        );
      }

      const {
        data: previousOrder,
        error: previousError,
      } = await admin
        .from("orders")
        .select(
          "id,order_number,status,payment_status,creem_checkout_id,creem_checkout_url,creem_checkout_state,creem_discount_code,creem_discount_cents,total_cents,currency"
        )
        .eq(
          "order_number",
          reservation.orderNumber
        )
        .eq("user_id", user.id)
        .eq(
          "payment_provider",
          "creem"
        )
        .eq("status", "pending")
        .eq(
          "payment_status",
          "unpaid"
        )
        .maybeSingle();

      if (
        previousError ||
        !previousOrder
      ) {
        return fail(
          "Unable to retrieve the previous checkout. Please refresh and try again.",
          409,
          {
            code: "CHECKOUT_CONFLICT",
            orderNumber:
              reservation.orderNumber,
          }
        );
      }

      /*
       * Verify the existing order belongs
       * to the same requested product.
       */

      const {
        data: previousItems,
        error: previousItemsError,
      } = await admin
        .from("order_items")
        .select(
          "item_type,product_id,quantity"
        )
        .eq(
          "order_id",
          previousOrder.id
        );

      if (
        previousItemsError ||
        !previousItems ||
        previousItems.length !== 1 ||
        previousItems[0].item_type !==
          "product" ||
        previousItems[0].product_id !==
          product.id ||
        Number(
          previousItems[0].quantity
        ) !== 1
      ) {
        return fail(
          "The previous checkout could not be verified.",
          409,
          {
            code: "CHECKOUT_CONFLICT",
            orderNumber:
              reservation.orderNumber,
          }
        );
      }

      /*
       * A ready session with its saved
       * Creem URL can be continued using
       * the ORIGINAL price.
       *
       * A different coupon cannot be
       * applied to that old session.
       */

      if (
        previousOrder.creem_checkout_state ===
          "ready" &&
        previousOrder.creem_checkout_id &&
        previousOrder.creem_checkout_url
      ) {
        let existingCheckoutUrl: string;

        try {
          existingCheckoutUrl =
            requireCheckoutUrl(
              previousOrder.creem_checkout_url
            );
        } catch {
          return fail(
            "The previous checkout URL is invalid. Contact support with your order number.",
            409,
            {
              code: "CHECKOUT_CONFLICT",
              orderNumber:
                previousOrder.order_number,
            }
          );
        }

        return fail(
          "You already have an open checkout for this product with different coupon settings. You can continue the previous checkout at its original price. Your new coupon cannot be applied to that existing payment session.",
          409,
          {
            code: "CHECKOUT_CONFLICT",
            orderNumber:
              previousOrder.order_number,
            existingCheckoutUrl,
            existingCouponCode:
              previousOrder.creem_discount_code,
            existingDiscountCents:
              Number(
                previousOrder.creem_discount_cents ??
                  0
              ),
            existingTotalCents:
              Number(
                previousOrder.total_cents
              ),
            existingCurrency:
              previousOrder.currency,
          }
        );
      }

      /*
       * An incomplete reservation is not
       * assumed safe to replace; a Creem
       * session may have been created even
       * if finalization failed locally.
       */

      return fail(
        "An earlier checkout is still being prepared or requires recovery. Its payment status must be resolved before creating a checkout with different coupon settings.",
        409,
        {
          code: "CHECKOUT_CREATING",
          orderNumber:
            previousOrder.order_number,
        }
      );
    }

    /*
     * Only the reserved order may create
     * a new Creem checkout.
     */

    if (
      reservation.status !== "reserved" ||
      reservation.orderNumber !==
        order.order_number
    ) {
      return fail(
        "Checkout reservation did not match the order.",
        409
      );
    }

    /*
     * Prepare Creem success URL.
     */

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

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

    let checkout: {
      id: string;
      checkoutUrl: string;
    };

    /*
     * Create Creem checkout with the
     * already-validated coupon.
     */

    try {
      checkout =
        await createCreemCheckout({
          productId:
            product.creem_product_id,
          orderNumber:
            order.order_number,
          customerEmail:
            user.email,
          successUrl:
            successUrl.toString(),
          metadata: {
            orderNumber:
              order.order_number,
            userId: user.id,
            productId: product.id,
          },
          discountCode:
            validatedCode,
        });
    } catch (error) {
      console.error(
        "Creem checkout creation failed after reservation:",
        {
          orderNumber:
            order.order_number,
          error,
        }
      );

      return fail(
        "We couldn't complete checkout setup. " +
          "The order has been kept for safe recovery. " +
          "Contact support if this persists.",
        503,
        {
          code:
            "CHECKOUT_SETUP_FAILED",
          orderNumber:
            order.order_number,
        }
      );
    }

    /*
     * Save Creem checkout ID and URL
     * through the existing atomic RPC.
     */

    const {
      data: finalized,
      error: finalizeError,
    } = await admin.rpc(
      "finalize_creem_checkout",
      {
        p_order_id: order.id,
        p_claim_token:
          claimToken,
        p_checkout_id:
          checkout.id,
        p_checkout_url:
          checkout.checkoutUrl,
      }
    );

    if (
      finalizeError ||
      finalized !== true
    ) {
      console.error(
        "Creem checkout created but finalization failed:",
        {
          orderNumber:
            order.order_number,
          checkoutId:
            checkout.id,
          error:
            finalizeError,
          finalized,
        }
      );

      return fail(
        "A Creem payment session was created, but " +
          "Embernix could not finish saving it. " +
          "Contact support with the order number before " +
          "attempting another payment.",
        503,
        {
          code:
            "CHECKOUT_FINALIZATION_FAILED",
          orderNumber:
            order.order_number,
        }
      );
    }

    /*
     * New checkout successfully created.
     */

    return NextResponse.json({
      checkoutUrl:
        requireCheckoutUrl(
          checkout.checkoutUrl
        ),
      orderNumber:
        order.order_number,
      reused: false,
    });
  } catch (error) {
    console.error(
      "Creem checkout preparation failed:",
      error
    );

    return fail(
      "Unable to prepare checkout. Check your existing order before retrying.",
      500
    );
  }
}
