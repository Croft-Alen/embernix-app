import React from "react";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import InvoicePdfDocument, {
  type InvoicePdfData,
} from "@/lib/invoices/InvoicePdfDocument";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

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
      data: adminRecord,
      error:
        adminRecordError,
    } = await admin
      .from("admin_users")
      .select("user_id")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (adminRecordError) {
      console.error(
        "Failed to check invoice PDF admin access:",
        adminRecordError
      );
    }

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
        issued_at,
        due_at,
        paid_at,
        payment_provider,
        paddle_transaction_id,
        notes,
        created_at
      `)
      .eq(
        "id",
        id
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

    const isOwner =
      invoice.user_id ===
      user.id;

    const isAdmin =
      Boolean(
        adminRecord
      );

    if (
      !isOwner &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this invoice.",
        },
        {
          status: 403,
        }
      );
    }

    const [
      itemsResult,
      profileResult,
      authResult,
    ] =
      await Promise.all([
        admin
          .from(
            "invoice_items"
          )
          .select(`
            id,
            title,
            description,
            quantity,
            unit_price_cents,
            line_total_cents,
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
          ),

        invoice.user_id
          ? admin
              .from(
                "profiles"
              )
              .select(`
                id,
                full_name
              `)
              .eq(
                "id",
                invoice.user_id
              )
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        invoice.user_id
          ? admin.auth.admin.getUserById(
              invoice.user_id
            )
          : Promise.resolve({
              data: {
                user: null,
              },
              error: null,
            }),
      ]);

    if (
      itemsResult.error
    ) {
      console.error(
        "Failed to load invoice PDF items:",
        itemsResult.error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load invoice items.",
        },
        {
          status: 500,
        }
      );
    }

    const authUser =
      authResult.data.user;

    const customerName =
      profileResult.data
        ?.full_name ||
      authUser
        ?.user_metadata
        ?.full_name ||
      authUser
        ?.user_metadata
        ?.name ||
      "Customer";

    const customerEmail =
      authUser?.email ||
      "—";

    const pdfData:
      InvoicePdfData = {
      invoice_number:
        invoice.invoice_number,

      status:
        invoice.status,

      currency:
        invoice.currency,

      subtotal_cents:
        Number(
          invoice.subtotal_cents ??
            0
        ),

      discount_cents:
        Number(
          invoice.discount_cents ??
            0
        ),

      tax_cents:
        Number(
          invoice.tax_cents ??
            0
        ),

      total_cents:
        Number(
          invoice.total_cents ??
            0
        ),

      issued_at:
        invoice.issued_at,

      due_at:
        invoice.due_at,

      paid_at:
        invoice.paid_at,

      payment_provider:
        invoice.payment_provider,

      paddle_transaction_id:
        invoice.paddle_transaction_id,

      notes:
        invoice.notes,

      customer_name:
        customerName,

      customer_email:
        customerEmail,

      items:
        (
          itemsResult.data ??
          []
        ).map(
          (item) => ({
            id:
              item.id,

            title:
              item.title,

            description:
              item.description,

            quantity:
              Number(
                item.quantity
              ),

            unit_price_cents:
              Number(
                item.unit_price_cents
              ),

            line_total_cents:
              Number(
                item.line_total_cents
              ),
          })
        ),
    };

    const pdfDocument =
      React.createElement(
        InvoicePdfDocument,
        {
          invoice:
            pdfData,
        }
      ) as React.ReactElement<DocumentProps>;

    const pdfBuffer =
      await renderToBuffer(
        pdfDocument
      );

    const pdfBytes =
      new Uint8Array(
        pdfBuffer
      );

    const safeInvoiceNumber =
      invoice.invoice_number.replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      );

    return new NextResponse(
      pdfBytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeInvoiceNumber}.pdf"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Invoice PDF generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate invoice PDF.",
      },
      {
        status: 500,
      }
    );
  }
}