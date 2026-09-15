import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type CouponRequest = {
  code?: string;
  productSlug?: string;
};

function normalizeCode(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Please sign in before applying a coupon.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request
        .json()
        .catch(() => null)) as
        | CouponRequest
        | null;

    const code =
      normalizeCode(
        body?.code ?? ""
      );

    const productSlug =
      String(
        body?.productSlug ??
          ""
      ).trim();

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Enter a coupon code.",
        },
        {
          status: 400,
        }
      );
    }

    if (!productSlug) {
      return NextResponse.json(
        {
          error:
            "Product information is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: product,
      error:
        productError,
    } = await admin
      .from("products")
      .select(`
        id,
        slug,
        price_cents,
        currency,
        active
      `)
      .eq(
        "slug",
        productSlug
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
      return NextResponse.json(
        {
          error:
            "This product is unavailable.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: coupon,
      error:
        couponError,
    } = await admin
      .from("coupons")
      .select(`
        id,
        code,
        description,
        discount_type,
        amount,
        currency,
        active,
        expires_at,
        usage_limit,
        paddle_discount_id
      `)
      .eq(
        "code",
        code
      )
      .maybeSingle();

    if (
      couponError ||
      !coupon
    ) {
      return NextResponse.json(
        {
          error:
            "Coupon code is invalid.",
        },
        {
          status: 404,
        }
      );
    }

    if (!coupon.active) {
      return NextResponse.json(
        {
          error:
            "This coupon is no longer active.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !coupon.paddle_discount_id
    ) {
      return NextResponse.json(
        {
          error:
            "This coupon is not ready for checkout yet.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      coupon.expires_at
    ) {
      const expiry =
        new Date(
          coupon.expires_at
        );

      if (
        !Number.isNaN(
          expiry.getTime()
        ) &&
        expiry.getTime() <=
          Date.now()
      ) {
        return NextResponse.json(
          {
            error:
              "This coupon has expired.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      coupon.discount_type ===
        "flat" &&
      String(
        coupon.currency ??
          ""
      ).toUpperCase() !==
        String(
          product.currency
        ).toUpperCase()
    ) {
      return NextResponse.json(
        {
          error:
            "This coupon cannot be used with this currency.",
        },
        {
          status: 400,
        }
      );
    }

    const subtotal =
      Number(
        product.price_cents
      );

    let discountCents =
      0;

    if (
      coupon.discount_type ===
      "percentage"
    ) {
      discountCents =
        Math.round(
          subtotal *
            (Number(
              coupon.amount
            ) /
              100)
        );
    } else {
      discountCents =
        Number(
          coupon.amount
        );
    }

    discountCents =
      Math.max(
        0,
        Math.min(
          discountCents,
          subtotal
        )
      );

    const discountedTotal =
      Math.max(
        0,
        subtotal -
          discountCents
      );

    return NextResponse.json({
      valid: true,

      coupon: {
        code:
          coupon.code,

        description:
          coupon.description,

        discountType:
          coupon.discount_type,

        amount:
          coupon.amount,

        currency:
          coupon.currency,

        paddleDiscountId:
          coupon.paddle_discount_id,
      },

      subtotalCents:
        subtotal,

      discountCents,

      totalCents:
        discountedTotal,
    });
  } catch (error) {
    console.error(
      "Coupon validation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to validate coupon. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}