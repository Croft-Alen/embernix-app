import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddle } from "@/lib/paddle/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CheckoutRequest = {
  orderNumber?: string;
};

function buildHostedCheckoutUrl(
  transactionId: string,
  customerEmail: string
) {
  const baseUrl =
    process.env.PADDLE_HOSTED_CHECKOUT_URL;

  if (!baseUrl) {
    throw new Error(
      "PADDLE_HOSTED_CHECKOUT_URL is not configured."
    );
  }

  const url = new URL(baseUrl);

  /*
   * Paddle Hosted Checkout supports
   * passing an existing transaction.
   */
  url.searchParams.set(
    "transaction_id",
    transactionId
  );

  /*
   * Prefill the authenticated Embernix
   * customer's email.
   */
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

function checkoutResponse(
  body: Record<string, unknown>,
  orderNumber: string,
  status = 200
) {
  const response =
    NextResponse.json(
      body,
      { status }
    );

  /*
   * Hosted Checkout has a fixed redirect URL.
   *
   * Keep the internal order reference in an
   * HttpOnly first-party cookie so that
   * /checkout/return knows which order the
   * returning browser belongs to.
   */
  response.cookies.set(
    "embernix_checkout_order",
    orderNumber,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    }
  );

  return response;
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
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
        | CheckoutRequest
        | null;

    const orderNumber =
      body?.orderNumber?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        {
          error: "Order number is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Customer-scoped lookup.
     */
    const {
      data: order,
      error: orderError,
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
          error: "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Already completed.
     */
    if (
      order.status === "paid" ||
      order.payment_status === "paid"
    ) {
      return checkoutResponse(
        {
          alreadyPaid: true,
        },
        order.order_number
      );
    }

    if (
      order.status !== "pending" ||
      order.payment_status !== "unpaid"
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

    /*
     * Reuse an existing Paddle transaction.
     */
    if (
      order.paddle_transaction_id
    ) {
      const checkoutUrl =
        buildHostedCheckoutUrl(
          order.paddle_transaction_id,
          order.customer_email ??
            user.email ??
            ""
        );

      return checkoutResponse(
        {
          checkoutUrl,
          transactionId:
            order.paddle_transaction_id,
        },
        order.order_number
      );
    }

    /*
     * Find product snapshot.
     */
    const {
      data: item,
      error: itemError,
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

    /*
     * Canonical Paddle price.
     */
    const {
      data: product,
      error: productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        paddle_price_id,
        active
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
          error: "Product was not found.",
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

    const paddle =
      getPaddle();

    /*
     * Create the actual Paddle transaction.
     *
     * We continue using a server-created
     * transaction so:
     *
     * - amount/product is canonical
     * - webhook has Embernix references
     * - retry/reconciliation remains easy
     */
    const transaction =
      await paddle.transactions.create({
        items: [
          {
            priceId:
              product.paddle_price_id,

            quantity: Math.max(
              Number(
                item.quantity ?? 1
              ),
              1
            ),
          },
        ],

        collectionMode: "automatic",

        customData: {
          embernix_order_id:
            order.id,

          embernix_order_number:
            order.order_number,

          embernix_user_id:
            user.id,

          embernix_product_id:
            product.id,
        },
      });

    if (!transaction?.id) {
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

    const admin =
      createAdminClient();

    const {
      data: updatedOrder,
      error: updateError,
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

    /*
     * THIS is now what we open.
     *
     * Fully hosted by Paddle.
     */
    const checkoutUrl =
      buildHostedCheckoutUrl(
        transaction.id,
        order.customer_email ??
          user.email ??
          ""
      );

    return checkoutResponse(
      {
        checkoutUrl,
        transactionId:
          transaction.id,
      },
      order.order_number
    );
  } catch (error) {
    console.error(
      "Paddle Hosted Checkout error:",
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