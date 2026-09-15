import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddle } from "@/lib/paddle/server";

export const runtime =
  "nodejs";

export async function POST(
  request: NextRequest
) {
  const signature =
    request.headers.get(
      "paddle-signature"
    );
console.log("Paddle signature header:", {
  exists: Boolean(signature),
  preview: signature?.slice(0, 30),
});
  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Paddle signature.",
      },
      {
        status: 400,
      }
    );
  }

  const secret =
    process.env
      .PADDLE_WEBHOOK_SECRET;

console.log("Paddle webhook config:", {
  secretLoaded: Boolean(secret),
  secretPrefix: secret?.slice(0, 11),
  secretSuffix: secret?.slice(-4),
  secretLength: secret?.length,
});
  if (!secret) {
    console.error(
      "PADDLE_WEBHOOK_SECRET is not configured."
    );

    return NextResponse.json(
      {
        error:
          "Webhook configuration error.",
      },
      {
        status: 500,
      }
    );
  }

  /*
   * IMPORTANT:
   * Read the RAW body as text.
   *
   * Do not call request.json()
   * before verification.
   */
  const rawBody =
    await request.text();

  try {
    const paddle =
      getPaddle();

    /*
     * This verifies:
     * - Paddle-Signature
     * - payload integrity
     * - webhook authenticity
     */
    const event =
      await paddle.webhooks.unmarshal(
        rawBody,
        secret,
        signature
      );

    /*
     * We only provision the product
     * after Paddle says the
     * transaction is COMPLETED.
     */
    if (
      event.eventType !==
      "transaction.completed"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    /*
     * SDK responses use camelCase.
     */
    const transaction =
      event.data as any;

    const transactionId =
      String(
        transaction.id ??
          ""
      );

    if (
      !transactionId
    ) {
      return NextResponse.json(
        {
          error:
            "Transaction ID missing.",
        },
        {
          status: 400,
        }
      );
    }

    const customData =
      (transaction.customData ??
        {}) as Record<
        string,
        unknown
      >;

    const customOrderId =
      typeof customData.embernix_order_id ===
      "string"
        ? customData.embernix_order_id
        : null;

    const admin =
      createAdminClient();

    /*
     * First try the transaction ID
     * that was stored when checkout
     * was created.
     */
    let {
      data: order,
      error:
        orderError,
    } = await admin
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
        "paddle_transaction_id",
        transactionId
      )
      .maybeSingle();

    /*
     * Recovery path:
     *
     * If Paddle transaction creation
     * succeeded but saving txn_... to
     * Supabase failed, customData
     * still contains our internal
     * order ID.
     */
    if (
      !order &&
      customOrderId
    ) {
      const recoveryResult =
        await admin
          .from(
            "orders"
          )
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
            "id",
            customOrderId
          )
          .maybeSingle();

      order =
        recoveryResult.data;

      orderError =
        recoveryResult.error;
    }

    if (
      orderError ||
      !order
    ) {
      console.error(
        "Paddle webhook could not find Embernix order:",
        {
          transactionId,
          customOrderId,
          orderError,
        }
      );

      /*
       * 500 tells Paddle processing
       * failed so delivery can retry.
       */
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Protect against mismatched
     * transaction IDs.
     */
    if (
      order.paddle_transaction_id &&
      order.paddle_transaction_id !==
        transactionId
    ) {
      console.error(
        "Paddle transaction mismatch.",
        {
          orderId:
            order.id,

          stored:
            order.paddle_transaction_id,

          received:
            transactionId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Transaction mismatch.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Find the product purchased.
     *
     * Current Embernix checkout is
     * one product per order.
     */
    const {
      data: item,
      error:
        itemError,
    } = await admin
      .from(
        "order_items"
      )
      .select(`
        id,
        product_id
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
      console.error(
        "Paid order has no order item:",
        itemError
      );

      return NextResponse.json(
        {
          error:
            "Order item missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Provision ownership FIRST.
     *
     * Upsert makes fulfillment
     * idempotent. Paddle may retry
     * the same webhook safely.
     */
    const {
      error:
        ownershipError,
    } = await admin
      .from(
        "customer_products"
      )
      .upsert(
        {
          user_id:
            order.user_id,

          product_id:
            item.product_id,

          order_id:
            order.id,

          status:
            "active",

          purchased_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,product_id",
        }
      );

    if (
      ownershipError
    ) {
      console.error(
        "Failed to grant product ownership:",
        ownershipError
      );

      return NextResponse.json(
        {
          error:
            "Product fulfillment failed.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Paddle amounts are represented
     * as minor-unit strings.
     */
    const paddleSubtotal =
      Number(
        transaction.details
          ?.totals?.subtotal
      );

    const paddleTotal =
      Number(
        transaction.details
          ?.totals?.total
      );

    const updateData: Record<
      string,
      unknown
    > = {
      status:
        "paid",

      payment_status:
        "paid",

      paid_at:
        new Date().toISOString(),

      payment_provider:
        "paddle",

      provider_transaction_id:
        transactionId,

      paddle_transaction_id:
        transactionId,

      paddle_customer_id:
        transaction.customerId ??
        null,

      paddle_invoice_number:
        transaction.invoiceNumber ??
        null,

      updated_at:
        new Date().toISOString(),
    };

    /*
     * Update internal amount with
     * Paddle's final calculated
     * amount including any applicable
     * checkout calculations.
     */
    if (
      Number.isFinite(
        paddleSubtotal
      )
    ) {
      updateData.subtotal_cents =
        paddleSubtotal;
    }

    if (
      Number.isFinite(
        paddleTotal
      )
    ) {
      updateData.total_cents =
        paddleTotal;
    }

    if (
      transaction.currencyCode
    ) {
      updateData.currency =
        transaction.currencyCode;
    }

    const {
      error:
        updateError,
    } = await admin
      .from("orders")
      .update(
        updateData
      )
      .eq(
        "id",
        order.id
      );

    if (
      updateError
    ) {
      console.error(
        "Failed to finalize paid order:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Order finalization failed.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      received: true,
      fulfilled: true,
    });
  } catch (error) {
    /*
     * Includes invalid webhook
     * signatures.
     */
    console.error(
      "Paddle webhook verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid Paddle webhook.",
      },
      {
        status: 401,
      }
    );
  }
}