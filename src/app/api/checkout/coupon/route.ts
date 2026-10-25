import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCheckoutCoupon } from "@/lib/creem/validate-coupon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in." },
        { status: 401 }
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
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    const code =
      typeof payload.code === "string"
        ? payload.code.trim().toUpperCase()
        : "";

    const slug =
      typeof payload.productSlug === "string"
        ? payload.productSlug.trim()
        : "";

    if (
      !/^[A-Z0-9]{1,32}$/.test(code) ||
      !/^[a-zA-Z0-9_-]{1,200}$/.test(slug)
    ) {
      return NextResponse.json(
        { error: "Invalid coupon or product." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: product, error } = await admin
      .from("products")
      .select(
        "id,price_cents,currency,creem_product_id"
      )
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Unable to load product." },
        { status: 500 }
      );
    }

    if (!product?.creem_product_id) {
      return NextResponse.json(
        { error: "Product unavailable." },
        { status: 404 }
      );
    }

    const coupon = await validateCheckoutCoupon({
      code,
      productId: product.id,
      creemProductId: product.creem_product_id,
      productPriceCents: Number(product.price_cents),
      currency: product.currency,
    });

    return NextResponse.json({
      valid: true,

      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        amount: coupon.amount,
        currency: coupon.currency,
      },

      subtotalCents: Number(product.price_cents),
      discountCents: coupon.discountCents,
      totalCents: coupon.totalCents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not validate coupon.",
      },
      { status: 400 }
    );
  }
}
