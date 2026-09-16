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
  createServiceProject,
} from "@/lib/projects/create-service-project";

export const runtime =
  "nodejs";

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
        transaction.id ??
          ""
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
      typeof customData
        .embernix_payment_type ===
      "string"
        ? customData
            .embernix_payment_type
        : null;

    const admin =
      createAdminClient();

    /*
     * ======================================
     * DIRECT / MANUAL INVOICE PAYMENT
     * ======================================
     */
    if (
      paymentType ===
      "invoice"
    ) {
      const customInvoiceId =
        typeof customData
          .embernix_invoice_id ===
        "string"
          ? customData
              .embernix_invoice_id
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
        const recovery =
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
          recovery.data;

        invoiceError =
          recovery.error;
      }

      if (
        invoiceError ||
        !invoice
      ) {
        console.error(
          "Paddle webhook could not find invoice:",
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
        invoice
          .paddle_transaction_id &&
        invoice
          .paddle_transaction_id !==
          transactionId
      ) {
        console.error(
          "Invoice Paddle transaction mismatch:",
          {
            invoiceId:
              invoice.id,

            stored:
              invoice
                .paddle_transaction_id,

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

      const subtotal =
        Number(
          transaction.details
            ?.totals
            ?.subtotal
        );

      const total =
        Number(
          transaction.details
            ?.totals
            ?.total
        );

      const tax =
        Number(
          transaction.details
            ?.totals
            ?.tax
        );

      const now =
        new Date().toISOString();

      const updateData:
        Record<
          string,
          unknown
        > = {
        status:
          "paid",

        paid_at:
          now,

        payment_provider:
          "paddle",

        paddle_transaction_id:
          transactionId,

        updated_at:
          now,
      };

      if (
        Number.isFinite(
          subtotal
        )
      ) {
        updateData.subtotal_cents =
          subtotal;
      }

      if (
        Number.isFinite(
          total
        )
      ) {
        updateData.total_cents =
          total;
      }

      if (
        Number.isFinite(
          tax
        )
      ) {
        updateData.tax_cents =
          tax;
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
        .from("invoices")
        .update(
          updateData
        )
        .eq(
          "id",
          invoice.id
        );

      if (updateError) {
        console.error(
          "Failed finalizing invoice:",
          updateError
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
     * ======================================
     * CENTRAL CHECKOUT ORDER
     * ======================================
     */

    const customOrderId =
      typeof customData
        .embernix_order_id ===
      "string"
        ? customData
            .embernix_order_id
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
      const recovery =
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
        recovery.data;

      orderError =
        recovery.error;
    }

    if (
      orderError ||
      !order
    ) {
      console.error(
        "Paddle webhook could not find order:",
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
      order
        .paddle_transaction_id &&
      order
        .paddle_transaction_id !==
        transactionId
    ) {
      console.error(
        "Order Paddle transaction mismatch:",
        {
          orderId:
            order.id,

          stored:
            order
              .paddle_transaction_id,

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
      .from("order_items")
      .select(`
        id,
        item_type,
        product_id,
        service_id,
        product_name,
        unit_price_cents,
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

    const itemType =
      String(
        item.item_type ??
          "product"
      );

    const now =
      new Date().toISOString();

    const subtotal =
      Number(
        transaction.details
          ?.totals
          ?.subtotal
      );

    const total =
      Number(
        transaction.details
          ?.totals
          ?.total
      );

    const tax =
      Number(
        transaction.details
          ?.totals
          ?.tax
      );

    /*
     * ======================================
     * PRODUCT FULFILLMENT
     * ======================================
     */
    if (
      itemType ===
      "product"
    ) {
      if (
        !item.product_id
      ) {
        console.error(
          "Paid product order has no product_id:",
          order.id
        );

        return NextResponse.json(
          {
            error:
              "Product information missing.",
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
              now,
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
          "Failed granting product ownership:",
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
    }

    /*
     * ======================================
     * SERVICE FULFILLMENT
     * ======================================
     */
    else if (
      itemType ===
      "service"
    ) {
      if (
        !item.service_id
      ) {
        console.error(
          "Paid service order has no service_id:",
          order.id
        );

        return NextResponse.json(
          {
            error:
              "Service information missing.",
          },
          {
            status: 500,
          }
        );
      }

      const customInvoiceId =
        typeof customData
          .embernix_invoice_id ===
        "string"
          ? customData
              .embernix_invoice_id
          : null;

      let {
        data: invoice,
        error:
          invoiceError,
      } = await admin
        .from("invoices")
        .select(`
          id,
          status,
          order_id,
          service_id,
          user_id,
          paddle_transaction_id
        `)
        .eq(
          "order_id",
          order.id
        )
        .maybeSingle();

      if (
        !invoice &&
        customInvoiceId
      ) {
        const recovery =
          await admin
            .from("invoices")
            .select(`
              id,
              status,
              order_id,
              service_id,
              user_id,
              paddle_transaction_id
            `)
            .eq(
              "id",
              customInvoiceId
            )
            .maybeSingle();

        invoice =
          recovery.data;

        invoiceError =
          recovery.error;
      }

      if (
        invoiceError ||
        !invoice
      ) {
        console.error(
          "Existing service invoice not found:",
          {
            orderId:
              order.id,

            customInvoiceId,

            invoiceError,
          }
        );

        return NextResponse.json(
          {
            error:
              "Service invoice not found.",
          },
          {
            status: 500,
          }
        );
      }

      /*
       * Mark the already-existing unpaid
       * service invoice as paid.
       */
      if (
        invoice.status !==
        "paid"
      ) {
        const invoiceUpdate:
          Record<
            string,
            unknown
          > = {
          status:
            "paid",

          paid_at:
            now,

          payment_provider:
            "paddle",

          paddle_transaction_id:
            transactionId,

          updated_at:
            now,
        };

        if (
          Number.isFinite(
            subtotal
          )
        ) {
          invoiceUpdate.subtotal_cents =
            subtotal;
        }

        if (
          Number.isFinite(
            total
          )
        ) {
          invoiceUpdate.total_cents =
            total;
        }

        if (
          Number.isFinite(
            tax
          )
        ) {
          invoiceUpdate.tax_cents =
            tax;
        }

        if (
          transaction.currencyCode
        ) {
          invoiceUpdate.currency =
            transaction.currencyCode;
        }

        const {
          error:
            invoiceUpdateError,
        } = await admin
          .from("invoices")
          .update(
            invoiceUpdate
          )
          .eq(
            "id",
            invoice.id
          );

        if (
          invoiceUpdateError
        ) {
          console.error(
            "Failed marking service invoice paid:",
            invoiceUpdateError
          );

          return NextResponse.json(
            {
              error:
                "Service invoice finalization failed.",
            },
            {
              status: 500,
            }
          );
        }
      }

      /*
       * Load canonical service.
       */
      const {
        data: service,
        error:
          serviceError,
      } = await admin
        .from("services")
        .select(`
          id,
          name
        `)
        .eq(
          "id",
          item.service_id
        )
        .maybeSingle();

      if (
        serviceError ||
        !service
      ) {
        console.error(
          "Paid service project could not load service:",
          serviceError
        );

        return NextResponse.json(
          {
            error:
              "Service project creation failed.",
          },
          {
            status: 500,
          }
        );
      }

      /*
       * Create project ONLY after confirmed
       * service payment.
       *
       * The helper is idempotent using order_id,
       * so webhook retries cannot create duplicates.
       */
      try {
        await createServiceProject({
          orderId:
            order.id,

          invoiceId:
            invoice.id,

          userId:
            order.user_id,

          serviceId:
            service.id,

          serviceName:
            service.name,
        });
      } catch (
        projectError
      ) {
        console.error(
          "Failed creating project after service payment:",
          projectError
        );

        return NextResponse.json(
          {
            error:
              "Project creation failed.",
          },
          {
            status: 500,
          }
        );
      }
    } else {
      console.error(
        "Unsupported paid order item type:",
        {
          orderId:
            order.id,

          itemType,
        }
      );

      return NextResponse.json(
        {
          error:
            "Unsupported order item.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ======================================
     * FINALIZE CENTRAL ORDER
     * ======================================
     */

    const orderUpdate:
      Record<
        string,
        unknown
      > = {
      status:
        "paid",

      payment_status:
        "paid",

      paid_at:
        now,

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
        now,
    };

    if (
      Number.isFinite(
        subtotal
      )
    ) {
      orderUpdate.subtotal_cents =
        subtotal;
    }

    if (
      Number.isFinite(
        total
      )
    ) {
      orderUpdate.total_cents =
        total;
    }

    if (
      transaction.currencyCode
    ) {
      orderUpdate.currency =
        transaction.currencyCode;
    }

    const {
      error:
        finalOrderError,
    } = await admin
      .from("orders")
      .update(
        orderUpdate
      )
      .eq(
        "id",
        order.id
      );

    if (
      finalOrderError
    ) {
      console.error(
        "Failed finalizing checkout order:",
        finalOrderError
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
        itemType,
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