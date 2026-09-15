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

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function buildHostedCheckoutUrl(
  transactionId: string,
  customerEmail: string
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

  url.searchParams.set(
    "transaction_id",
    transactionId
  );

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
  body: Record<
    string,
    unknown
  >,
  invoiceId: string,
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
    "embernix_invoice_checkout",
    invoiceId,
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
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      id,
    } =
      await context.params;

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

    const admin =
      createAdminClient();

    const {
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
        discount_cents,
        tax_cents,
        total_cents,
        paddle_transaction_id
      `)
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      invoiceError ||
      !invoice
    ) {
      return NextResponse.json(
        {
          error:
            "Invoice not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      invoice.status ===
      "paid"
    ) {
      return checkoutResponse(
        {
          alreadyPaid: true,
        },
        invoice.id
      );
    }

    if (
      invoice.status !==
      "unpaid"
    ) {
      return NextResponse.json(
        {
          error:
            "This invoice cannot currently be paid.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      Number(
        invoice.total_cents
      ) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invoice total must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: items,
      error:
        itemsError,
    } = await admin
      .from(
        "invoice_items"
      )
      .select(`
        id,
        title,
        description,
        quantity,
        unit_price_cents,
        sort_order
      `)
      .eq(
        "invoice_id",
        invoice.id
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );

    if (
      itemsError ||
      !items ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invoice has no billable items.",
        },
        {
          status: 400,
        }
      );
    }

    const paddle =
      getPaddle();

    const description =
      items
        .map(
          (item) =>
            item.title
        )
        .join(", ")
        .slice(
          0,
          450
        );

    const transactionItem =
      {
        quantity: 1,

        price: {
          description:
            `Embernix ${invoice.invoice_number}`,

          name:
            invoice.invoice_number,

          billingCycle:
            null,

          trialPeriod:
            null,

          taxMode:
            "internal",

          unitPrice: {
            amount:
              String(
                invoice.total_cents
              ),

            currencyCode:
              invoice.currency,
          },

          product: {
            name:
              `Invoice ${invoice.invoice_number}`,

            description:
              description ||
              "Embernix service invoice",

            taxCategory:
              "professional-services",
          },
        },
      };

    if (
      invoice.paddle_transaction_id
    ) {
      try {
        await paddle.transactions.update(
          invoice.paddle_transaction_id,
          {
            items: [
              transactionItem,
            ],

            customData: {
              embernix_payment_type:
                "invoice",

              embernix_invoice_id:
                invoice.id,

              embernix_invoice_number:
                invoice.invoice_number,

              embernix_user_id:
                user.id,
            },
          } as never
        );

        const checkoutUrl =
          buildHostedCheckoutUrl(
            invoice.paddle_transaction_id,
            user.email ?? ""
          );

        return checkoutResponse(
          {
            checkoutUrl,

            transactionId:
              invoice.paddle_transaction_id,
          },
          invoice.id
        );
      } catch (error) {
        console.error(
          "Failed to reuse invoice Paddle transaction:",
          error
        );
      }
    }

    const transaction =
      await paddle.transactions.create(
        {
          items: [
            transactionItem,
          ],

          collectionMode:
            "automatic",

          customData: {
            embernix_payment_type:
              "invoice",

            embernix_invoice_id:
              invoice.id,

            embernix_invoice_number:
              invoice.invoice_number,

            embernix_user_id:
              user.id,
          },
        } as never
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

    const {
      error:
        updateError,
    } = await admin
      .from("invoices")
      .update({
        payment_provider:
          "paddle",

        paddle_transaction_id:
          transaction.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        invoice.id
      )
      .eq(
        "status",
        "unpaid"
      );

    if (updateError) {
      console.error(
        "Failed to save invoice Paddle transaction:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to connect payment to this invoice.",
        },
        {
          status: 500,
        }
      );
    }

    const checkoutUrl =
      buildHostedCheckoutUrl(
        transaction.id,
        user.email ?? ""
      );

    return checkoutResponse(
      {
        checkoutUrl,

        transactionId:
          transaction.id,
      },
      invoice.id
    );
  } catch (error) {
    console.error(
      "Invoice checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start invoice payment. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}