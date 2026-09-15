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

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  const signature =
    request.headers.get(
      "paddle-signature"
    );

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

  const rawBody =
    await request.text();

  try {
    const paddle =
      getPaddle();

    const event =
      await paddle.webhooks.unmarshal(
        rawBody,
        secret,
        signature
      );

    if (
      event.eventType !==
      "transaction.completed"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    const transaction =
      event.data as any;

    const transactionId =
      String(
        transaction.id ?? ""
      );

    if (!transactionId) {
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

    const paymentType =
      typeof customData.embernix_payment_type ===
      "string"
        ? customData.embernix_payment_type
        : null;

    const admin =
      createAdminClient();

    /*
     * =====================================================
     * INVOICE PAYMENT
     * =====================================================
     */

    if (
      paymentType ===
      "invoice"
    ) {
      const customInvoiceId =
        typeof customData.embernix_invoice_id ===
        "string"
          ? customData.embernix_invoice_id
          : null;

      let {
        data: invoice,
        error:
          invoiceError,
      } = await admin
        .from("invoices")
        .select(`
          id,
          invoice_number,
          user_id,
          status,
          currency,
          subtotal_cents,
          total_cents,
          paddle_transaction_id
        `)
        .eq(
          "paddle_transaction_id",
          transactionId
        )
        .maybeSingle();

      if (
        !invoice &&
        customInvoiceId
      ) {
        const recoveryResult =
          await admin
            .from("invoices")
            .select(`
              id,
              invoice_number,
              user_id,
              status,
              currency,
              subtotal_cents,
              total_cents,
              paddle_transaction_id
            `)
            .eq(
              "id",
              customInvoiceId
            )
            .maybeSingle();

        invoice =
          recoveryResult.data;

        invoiceError =
          recoveryResult.error;
      }

      if (
        invoiceError ||
        !invoice
      ) {
        console.error(
          "Paddle webhook could not find Embernix invoice:",
          {
            transactionId,
            customInvoiceId,
            invoiceError,
          }
        );

        return NextResponse.json(
          {
            error:
              "Invoice not found.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        invoice.paddle_transaction_id &&
        invoice.paddle_transaction_id !==
          transactionId
      ) {
        console.error(
          "Paddle invoice transaction mismatch.",
          {
            invoiceId:
              invoice.id,

            stored:
              invoice.paddle_transaction_id,

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

      if (
        invoice.status ===
        "paid"
      ) {
        return NextResponse.json({
          received: true,
          fulfilled: true,
          paymentType:
            "invoice",
        });
      }

      const paddleSubtotal =
        Number(
          transaction.details
            ?.totals
            ?.subtotal
        );

      const paddleTotal =
        Number(
          transaction.details
            ?.totals
            ?.total
        );

      const updateData: Record<
        string,
        unknown
      > = {
        status:
          "paid",

        paid_at:
          new Date().toISOString(),

        payment_provider:
          "paddle",

        paddle_transaction_id:
          transactionId,

        updated_at:
          new Date().toISOString(),
      };

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
          invoiceUpdateError,
      } = await admin
        .from("invoices")
        .update(
          updateData
        )
        .eq(
          "id",
          invoice.id
        );

      if (
        invoiceUpdateError
      ) {
        console.error(
          "Failed to finalize paid invoice:",
          invoiceUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Invoice finalization failed.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        received: true,
        fulfilled: true,
        paymentType:
          "invoice",
      });
    }

    /*
     * =====================================================
     * PRODUCT ORDER PAYMENT
     * =====================================================
     */

    const customOrderId =
      typeof customData.embernix_order_id ===
      "string"
        ? customData.embernix_order_id
        : null;

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

    if (
      !order &&
      customOrderId
    ) {
      const recoveryResult =
        await admin
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

    const paddleSubtotal =
      Number(
        transaction.details
          ?.totals
          ?.subtotal
      );

    const paddleTotal =
      Number(
        transaction.details
          ?.totals
          ?.total
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
      paymentType:
        "product",
    });
  } catch (error) {
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