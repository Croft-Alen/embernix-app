import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCheckoutCoupon } from "@/lib/creem/validate-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CouponRequest = {
  code?: unknown;
  productSlug?: unknown;
};

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      valid: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Please sign in to apply a coupon.",
        401
      );
    }

    const body: unknown = await request
      .json()
      .catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request.", 400);
    }

    const payload = body as CouponRequest;

    const code =
      typeof payload.code === "string"
        ? payload.code.trim().toUpperCase()
        : "";

    const slug =
      typeof payload.productSlug === "string"
        ? payload.productSlug.trim()
        : "";

    if (!/^[A-Z0-9]{1,32}$/.test(code)) {
      return errorResponse(
        "Enter a valid coupon code.",
        400
      );
    }

    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(slug)) {
      return errorResponse(
        "Invalid product.",
        400
      );
    }

    const admin = createAdminClient();

    const { data: product, error: productError } =
      await admin
        .from("products")
        .select(
          "id,price_cents,currency,creem_product_id"
        )
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

    if (productError) {
      console.error(
        "Coupon product lookup failed:",
        productError
      );

      return errorResponse(
        "Unable to load product.",
        500
      );
    }

    if (!product || !product.creem_product_id) {
      return errorResponse(
        "Product unavailable.",
        404
      );
    }

    const priceCents = Number(product.price_cents);

    if (
      !Number.isSafeInteger(priceCents) ||
      priceCents <= 0
    ) {
      return errorResponse(
        "Product pricing is unavailable.",
        400
      );
    }

    const coupon = await validateCheckoutCoupon({
      code,
      productId: product.id,
      creemProductId: product.creem_product_id,
      productPriceCents: priceCents,
      currency: product.currency,
    });

    return NextResponse.json(
      {
        valid: true,
        coupon: {
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          amount: coupon.amount,
          currency: coupon.currency,
        },
        subtotalCents: priceCents,
        discountCents: coupon.discountCents,
        totalCents: coupon.totalCents,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Coupon validation failed:",
      error instanceof Error ? error.message : error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to validate coupon.",
      400
    );
  }
}