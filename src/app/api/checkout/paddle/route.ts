import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getPaddle,
} from "@/lib/paddle/server";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type CheckoutRequest = {
  orderNumber?: string;

  couponCode?:
    | string
    | null;
};

type ResolvedDiscount = {
  discountId:
    | string
    | null;

  code:
    | string
    | null;
};

function normalizeCode(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase();
}

/* =========================================================
   HOSTED CHECKOUT URL
========================================================= */

function buildHostedCheckoutUrl(
  transactionId: string,
  customerEmail: string,
  discount:
    ResolvedDiscount
) {
  const baseUrl =
    process.env
      .PADDLE_HOSTED_CHECKOUT_URL;

  if (!baseUrl) {
    throw new Error(
      "PADDLE_HOSTED_CHECKOUT_URL is not configured."
    );
  }

  const url =
    new URL(baseUrl);

  /*
   * Existing server-created transaction.
   */
  url.searchParams.set(
    "transaction_id",
    transactionId
  );

  /*
   * IMPORTANT:
   *
   * Explicitly give Hosted Checkout
   * the coupon too.
   *
   * Paddle Hosted Checkout supports
   * discount_code and discount_id.
   *
   * We prefer the customer-facing code.
   */
  if (discount.code) {
    url.searchParams.set(
      "discount_code",
      discount.code
    );
  } else if (
    discount.discountId
  ) {
    url.searchParams.set(
      "discount_id",
      discount.discountId
    );
  }

  if (customerEmail) {
    url.searchParams.set(
      "user_email",
      customerEmail
    );
  }

  url.searchParams.set(
    "theme",
    "light"
  );

  return url.toString();
}

/* =========================================================
   RESPONSE
========================================================= */

function checkoutResponse(
  body: Record<
    string,
    unknown
  >,
  orderNumber: string,
  status = 200
) {
  const response =
    NextResponse.json(
      body,
      {
        status,
      }
    );

  response.cookies.set(
    "embernix_checkout_order",
    orderNumber,
    {
      httpOnly: true,

      secure: true,

      sameSite: "lax",

      path: "/",

      maxAge:
        60 * 60,
    }
  );

  return response;
}

/* =========================================================
   RESOLVE COUPON
========================================================= */

async function resolveDiscount(
  couponCode:
    | string
    | null
    | undefined,

  productCurrency: string
): Promise<ResolvedDiscount> {
  const code =
    normalizeCode(
      couponCode
    );

  if (!code) {
    return {
      discountId: null,
      code: null,
    };
  }

  const admin =
    createAdminClient();

  const {
    data: coupon,
    error,
  } = await admin
    .from("coupons")
    .select(`
      id,
      code,
      discount_type,
      amount,
      currency,
      active,
      expires_at,
      paddle_discount_id
    `)
    .eq(
      "code",
      code
    )
    .maybeSingle();

  if (
    error ||
    !coupon
  ) {
    throw new Error(
      "Coupon code is invalid."
    );
  }

  if (!coupon.active) {
    throw new Error(
      "This coupon is no longer active."
    );
  }

  if (
    !coupon.paddle_discount_id
  ) {
    throw new Error(
      "This coupon is not connected to Paddle."
    );
  }

  /*
   * Expiry validation.
   */
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
      throw new Error(
        "This coupon has expired."
      );
    }
  }

  /*
   * Flat Paddle discounts must use
   * the same currency as transaction.
   */
  if (
    coupon.discount_type ===
      "flat" &&
    String(
      coupon.currency ??
        ""
    ).toUpperCase() !==
      String(
        productCurrency
      ).toUpperCase()
  ) {
    throw new Error(
      "This coupon cannot be used with this currency."
    );
  }

  return {
    discountId:
      coupon.paddle_discount_id,

    code:
      coupon.code,
  };
}

/* =========================================================
   POST
========================================================= */

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
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request
        .json()
        .catch(
          () => null
        )) as
        | CheckoutRequest
        | null;

    const orderNumber =
      body?.orderNumber?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        {
          error:
            "Order number is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ORDER
    ===================================================== */

    const {
      data: order,
      error:
        orderError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        order_number,
        status,
        payment_status,
        currency,
        customer_email,
        paddle_transaction_id
      `)
      .eq(
        "order_number",
        orderNumber
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      order.status ===
        "paid" ||
      order.payment_status ===
        "paid"
    ) {
      return checkoutResponse(
        {
          alreadyPaid:
            true,
        },
        order.order_number
      );
    }

    if (
      order.status !==
        "pending" ||
      order.payment_status !==
        "unpaid"
    ) {
      return NextResponse.json(
        {
          error:
            "This order cannot currently be paid.",
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       ORDER ITEM
    ===================================================== */

    const {
      data: item,
      error:
        itemError,
    } = await supabase
      .from("order_items")
      .select(`
        id,
        product_id,
        quantity
      `)
      .eq(
        "order_id",
        order.id
      )
      .limit(1)
      .maybeSingle();

    if (
      itemError ||
      !item
    ) {
      return NextResponse.json(
        {
          error:
            "Order item was not found.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       PRODUCT
    ===================================================== */

    const {
      data: product,
      error:
        productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        paddle_price_id,
        active,
        currency
      `)
      .eq(
        "id",
        item.product_id
      )
      .maybeSingle();

    if (
      productError ||
      !product
    ) {
      return NextResponse.json(
        {
          error:
            "Product was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !product.paddle_price_id
    ) {
      return NextResponse.json(
        {
          error:
            "This product is not connected to checkout yet.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       DISCOUNT
    ===================================================== */

    let discount:
      ResolvedDiscount;

    try {
      discount =
        await resolveDiscount(
          body?.couponCode,
          product.currency
        );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof
              Error
              ? error.message
              : "Coupon is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const paddle =
      getPaddle();

    /* =====================================================
       EXISTING PADDLE TRANSACTION
    ===================================================== */

    if (
      order.paddle_transaction_id
    ) {
      try {
        /*
         * Paddle allows a catalog discount
         * to be applied to an unbilled
         * transaction.
         */
        const updatedTransaction =
          await paddle.transactions.update(
            order.paddle_transaction_id,
            {
              discountId:
                discount.discountId,
            }
          );

        /*
         * Useful log while testing.
         */
        console.log(
          "Updated Paddle transaction discount:",
          {
            transactionId:
              updatedTransaction.id,

            requestedDiscountId:
              discount.discountId,

            transactionDiscountId:
              updatedTransaction.discountId,

            couponCode:
              discount.code,
          }
        );
      } catch (error) {
        console.error(
          "Failed to update Paddle transaction discount:",
          error
        );

        return NextResponse.json(
          {
            error:
              "Unable to apply this coupon to Paddle checkout.",
          },
          {
            status: 400,
          }
        );
      }

      const checkoutUrl =
        buildHostedCheckoutUrl(
          order.paddle_transaction_id,

          order.customer_email ??
            user.email ??
            "",

          discount
        );

      console.log(
        "Opening Paddle Hosted Checkout:",
        {
          transactionId:
            order.paddle_transaction_id,

          couponCode:
            discount.code,

          discountId:
            discount.discountId,
        }
      );

      return checkoutResponse(
        {
          checkoutUrl,

          transactionId:
            order.paddle_transaction_id,

          couponCode:
            discount.code,

          discountId:
            discount.discountId,
        },
        order.order_number
      );
    }

    /* =====================================================
       NEW PADDLE TRANSACTION
    ===================================================== */

    const transaction =
      await paddle.transactions.create({
        items: [
          {
            priceId:
              product.paddle_price_id,

            quantity:
              Math.max(
                Number(
                  item.quantity ??
                    1
                ),
                1
              ),
          },
        ],

        collectionMode:
          "automatic",

        /*
         * REAL Paddle discount.
         */
        discountId:
          discount.discountId,

        customData: {
          embernix_order_id:
            order.id,

          embernix_order_number:
            order.order_number,

          embernix_user_id:
            user.id,

          embernix_product_id:
            product.id,

          embernix_coupon_code:
            discount.code,
        },
      });

    if (
      !transaction?.id
    ) {
      return NextResponse.json(
        {
          error:
            "Paddle did not return a transaction.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * Debug confirmation.
     */
    console.log(
      "Created Paddle transaction:",
      {
        transactionId:
          transaction.id,

        requestedDiscountId:
          discount.discountId,

        transactionDiscountId:
          transaction.discountId,

        couponCode:
          discount.code,
      }
    );

    /*
     * VERY IMPORTANT TEST:
     *
     * If a coupon was requested but Paddle
     * didn't actually attach it, fail instead
     * of silently charging full price.
     */
    if (
      discount.discountId &&
      transaction.discountId !==
        discount.discountId
    ) {
      console.error(
        "Paddle transaction was created without expected discount.",
        {
          expected:
            discount.discountId,

          received:
            transaction.discountId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Paddle did not apply the selected coupon. Checkout was stopped.",
        },
        {
          status: 502,
        }
      );
    }

    /* =====================================================
       SAVE TRANSACTION
    ===================================================== */

    const admin =
      createAdminClient();

    const {
      data:
        updatedOrder,

      error:
        updateError,
    } = await admin
      .from("orders")
      .update({
        payment_provider:
          "paddle",

        provider_transaction_id:
          transaction.id,

        paddle_transaction_id:
          transaction.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        order.id
      )
      .eq(
        "payment_status",
        "unpaid"
      )
      .select("id")
      .maybeSingle();

    if (
      updateError ||
      !updatedOrder
    ) {
      console.error(
        "Failed to save Paddle transaction:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to connect payment to your order.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       HOSTED CHECKOUT
    ===================================================== */

    const checkoutUrl =
      buildHostedCheckoutUrl(
        transaction.id,

        order.customer_email ??
          user.email ??
          "",

        discount
      );

    return checkoutResponse(
      {
        checkoutUrl,

        transactionId:
          transaction.id,

        couponCode:
          discount.code,

        discountId:
          discount.discountId,
      },
      order.order_number
    );
  } catch (error) {
    console.error(
      "Paddle checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start checkout. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}