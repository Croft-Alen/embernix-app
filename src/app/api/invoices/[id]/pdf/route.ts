
import React from "react";
import { NextRequest, NextResponse } from "next/server";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import InvoicePdfDocument, {
  type InvoicePdfData,
} from "@/lib/invoices/InvoicePdfDocument";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { data: adminRecord, error: adminError } =
      await admin
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError) {
      console.error("Invoice PDF admin access error:", adminError);

      return NextResponse.json(
        { error: "Unable to verify invoice access." },
        { status: 500 }
      );
    }

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        user_id,
        order_id,
        source,
        status,
        currency,
        subtotal_cents,
        discount_cents,
        tax_cents,
        total_cents,
        issued_at,
        paid_at,
        payment_provider,
        notes,
        created_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) {
      console.error("Invoice PDF lookup error:", invoiceError);

      return NextResponse.json(
        { error: "Unable to load invoice." },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 }
      );
    }

    const isOwner = invoice.user_id === user.id;
    const isAdmin = Boolean(adminRecord);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this invoice." },
        { status: 403 }
      );
    }

    if (
      !isAdmin &&
      (invoice.source !== "product" || invoice.status !== "paid")
    ) {
      return NextResponse.json(
        { error: "Purchase receipt not available." },
        { status: 404 }
      );
    }

    const [itemsResult, profileResult, authResult, orderResult] =
      await Promise.all([
        admin
          .from("invoice_items")
          .select(`
            id,
            title,
            description,
            quantity,
            unit_price_cents,
            line_total_cents,
            sort_order
          `)
          .eq("invoice_id", invoice.id)
          .order("sort_order", { ascending: true }),

        invoice.user_id
          ? admin
              .from("profiles")
              .select("full_name")
              .eq("id", invoice.user_id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        invoice.user_id
          ? admin.auth.admin.getUserById(invoice.user_id)
          : Promise.resolve({
              data: { user: null },
              error: null,
            }),

        invoice.order_id
          ? admin
              .from("orders")
              .select("order_number")
              .eq("id", invoice.order_id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),
      ]);

    if (itemsResult.error) {
      console.error(
        "Failed to load invoice PDF items:",
        itemsResult.error
      );

      return NextResponse.json(
        { error: "Unable to load purchased products." },
        { status: 500 }
      );
    }

    if (orderResult.error) {
      console.error(
        "Failed to load invoice order:",
        orderResult.error
      );

      return NextResponse.json(
        { error: "Unable to load purchase information." },
        { status: 500 }
      );
    }

    const authUser = authResult.data.user;

    const customerName =
      profileResult.data?.full_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      "Customer";

    const customerEmail = authUser?.email || "—";

    const pdfData: InvoicePdfData = {
      invoice_number: invoice.invoice_number,
      order_number: orderResult.data?.order_number ?? null,
      status: invoice.status,
      currency: invoice.currency,
      subtotal_cents: Number(invoice.subtotal_cents ?? 0),
      discount_cents: Number(invoice.discount_cents ?? 0),
      tax_cents: Number(invoice.tax_cents ?? 0),
      total_cents: Number(invoice.total_cents ?? 0),
      issued_at: invoice.issued_at,
      paid_at: invoice.paid_at,
      payment_provider: invoice.payment_provider,
      customer_name: customerName,
      customer_email: customerEmail,
      items: (itemsResult.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price_cents: Number(item.unit_price_cents),
        line_total_cents: Number(
          item.line_total_cents ??
            Number(item.unit_price_cents) * Number(item.quantity)
        ),
      })),
    };

    const document = React.createElement(InvoicePdfDocument, {
      invoice: pdfData,
    }) as React.ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(document);
    const pdfBytes = new Uint8Array(buffer);

    const safeNumber = invoice.invoice_number.replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    );

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeNumber}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);

    return NextResponse.json(
      { error: "Unable to generate purchase receipt." },
      { status: 500 }
    );
  }
}
