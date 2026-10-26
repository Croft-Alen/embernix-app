
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  ReceiptText,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DownloadInvoiceButton from "@/components/invoices/DownloadInvoiceButton";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  } catch {
    return `${currency || "USD"} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ClientInvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: invoice, error: invoiceError } = await supabase
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
      created_at
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("source", "product")
    .eq("status", "paid")
    .maybeSingle();

  if (invoiceError || !invoice) notFound();

  const { data: items, error: itemsError } = await supabase
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
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error("Unable to load purchased products.");
  }

  const rows = items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All invoices
      </Link>

      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-all font-mono text-[22px] font-semibold tracking-[-0.02em] sm:text-[27px]">
                  {invoice.invoice_number}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paid
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Digital product purchase receipt
              </p>
            </div>

            <DownloadInvoiceButton invoiceId={invoice.id} />
          </div>
        </div>

        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-3">
          <div className="bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <ReceiptText className="h-4 w-4" />
              Amount paid
            </div>
            <p className="mt-2 text-lg font-semibold">
              {formatMoney(Number(invoice.total_cents), invoice.currency)}
            </p>
          </div>

          <div className="bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <CalendarDays className="h-4 w-4" />
              Purchase date
            </div>
            <p className="mt-2 text-sm font-semibold">
              {formatDate(invoice.paid_at)}
            </p>
          </div>

          <div className="bg-[var(--surface)] p-5">
            <p className="text-xs text-[var(--muted)]">
              Payment provider
            </p>
            <p className="mt-2 text-sm font-semibold capitalize">
              {invoice.payment_provider || "—"}
            </p>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <h2 className="text-base font-semibold">
            Purchased products
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Products included in this completed purchase.
          </p>

          {rows.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No purchased products found.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[16px] border border-[var(--border)]">
              <div className="hidden md:block">
                <div className="grid grid-cols-[minmax(200px,1fr)_70px_130px_130px] border-b border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-xs font-semibold text-[var(--muted)]">
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit price</span>
                  <span className="text-right">Amount</span>
                </div>

                {rows.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(200px,1fr)_70px_130px_130px] items-center border-b border-[var(--border-light)] px-4 py-4 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-center text-sm">
                      {item.quantity}
                    </span>
                    <span className="text-right text-sm">
                      {formatMoney(
                        Number(item.unit_price_cents),
                        invoice.currency
                      )}
                    </span>
                    <span className="text-right text-sm font-semibold">
                      {formatMoney(
                        Number(item.line_total_cents),
                        invoice.currency
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-[var(--border-light)] md:hidden">
                {rows.map((item) => (
                  <div key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                      <div>
                        <p className="text-sm font-medium">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>Quantity: {item.quantity}</span>
                      <span>
                        {formatMoney(
                          Number(item.unit_price_cents),
                          invoice.currency
                        )}{" "}
                        each
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Amount</span>
                      <span>
                        {formatMoney(
                          Number(item.line_total_cents),
                          invoice.currency
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 ml-auto max-w-sm space-y-3">
            <div className="flex justify-between gap-6 text-sm">
              <span className="text-[var(--muted)]">
                Subtotal
              </span>
              <span>
                {formatMoney(
                  Number(invoice.subtotal_cents),
                  invoice.currency
                )}
              </span>
            </div>

            {Number(invoice.discount_cents) > 0 && (
              <div className="flex justify-between gap-6 text-sm">
                <span className="text-[var(--muted)]">
                  Discount
                </span>
                <span>
                  −
                  {formatMoney(
                    Number(invoice.discount_cents),
                    invoice.currency
                  )}
                </span>
              </div>
            )}

            {Number(invoice.tax_cents) > 0 && (
              <div className="flex justify-between gap-6 text-sm">
                <span className="text-[var(--muted)]">
                  Tax
                </span>
                <span>
                  {formatMoney(
                    Number(invoice.tax_cents),
                    invoice.currency
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between gap-6 border-t border-[var(--border)] pt-4">
              <span className="font-semibold">
                Total paid
              </span>
              <span className="text-xl font-semibold">
                {formatMoney(
                  Number(invoice.total_cents),
                  invoice.currency
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold">
            Purchase completed
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Your payment has been confirmed. You can access your purchased digital products from your dashboard.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
