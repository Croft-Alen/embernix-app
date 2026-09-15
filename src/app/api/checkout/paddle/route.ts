import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddle } from "@/lib/paddle/server";

export const runtime =
  "nodejs";

type CheckoutRequest = {
  orderNumber?: string;
};

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

    /*
     * CUSTOMER-SCOPED ORDER LOOKUP.
     *
     * User can only retrieve their
     * own order because of RLS +
     * explicit user_id filter.
     */
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

    /*
     * Payment already done.
     */
    if (
      order.status ===
        "paid" ||
      order.payment_status ===
        "paid"
    ) {
      return NextResponse.json({
        alreadyPaid: true,
      });
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

    /*
     * If we already created a Paddle
     * transaction, reuse it.
     *
     * Prevent duplicate Paddle
     * transactions when the customer
     * closes/reopens checkout.
     */
    if (
      order.paddle_transaction_id
    ) {
      return NextResponse.json({
        transactionId:
          order.paddle_transaction_id,
      });
    }

    const {
      data: item,
      error:
        itemError,
    } = await supabase
      .from(
        "order_items"
      )
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
     * Get the Paddle catalog price
     * from the canonical product.
     */
    const {
      data: product,
      error:
        productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        name,
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
          error:
            "Product was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !product
        .paddle_price_id
    ) {
      return NextResponse.json(
        {
          error:
            "This product has not been connected to Paddle yet.",
        },
        {
          status: 400,
        }
      );
    }

    const paddle =
      getPaddle();

    /*
     * Create real Paddle transaction.
     *
     * Paddle.js will collect the
     * customer/tax/payment details.
     */
    const transaction =
      await paddle.transactions.create(
        {
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
        }
      );

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
     * Now securely bind the Paddle
     * transaction to our internal
     * order.
     */
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
            "Unable to connect the payment to your order.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      transactionId:
        transaction.id,
    });
  } catch (error) {
    console.error(
      "Paddle checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start payment. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}