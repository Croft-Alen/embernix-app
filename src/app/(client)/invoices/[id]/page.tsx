import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  FileText,
  ReceiptText,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(
  cents: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency:
          currency || "USD",
      }
    ).format(cents / 100);
  } catch {
    return `${currency || "USD"} ${(
      cents / 100
    ).toFixed(2)}`;
  }
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function statusClass(
  status: string
) {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700";

    case "unpaid":
      return "bg-amber-50 text-amber-700";

    case "draft":
      return "bg-gray-100 text-gray-600";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "refunded":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default async function ClientInvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: invoice,
    error:
      invoiceError,
  } = await supabase
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
    .eq(
      "user_id",
      user.id
    )
    .neq(
      "status",
      "draft"
    )
    .maybeSingle();

  if (
    invoiceError ||
    !invoice
  ) {
    notFound();
  }

  const {
    data: items,
    error:
      itemsError,
  } = await supabase
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
    );

  if (itemsError) {
    throw new Error(
      "Unable to load invoice items."
    );
  }

  const rows =
    items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">
            {
              invoice.invoice_number
            }
          </h1>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(
              invoice.status
            )}`}
          >
            {invoice.status}
          </span>
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Created{" "}
          {formatDate(
            invoice.created_at
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <CircleDollarSign className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Total
              </p>

              <p className="mt-1 text-lg font-semibold">
                {formatMoney(
                  Number(
                    invoice.total_cents ??
                      0
                  ),
                  invoice.currency
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Issued
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  invoice.issued_at
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Due
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  invoice.due_at
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--border-light)] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ReceiptText className="h-4 w-4" />
          </div>

          <div>
            <h2 className="font-semibold">
              Invoice items
            </h2>

            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Services and items included in this invoice.
            </p>
          </div>
        </div>

        {rows.length ===
        0 ? (
          <div className="p-6 text-sm text-[var(--muted)]">
            No invoice items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Item
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--muted)]">
                    Qty
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                    Unit price
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    item
                  ) => (
                    <tr
                      key={
                        item.id
                      }
                      className="border-b border-[var(--border-light)] last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
                            <FileText className="h-4 w-4 text-[var(--muted)]" />
                          </div>

                          <div>
                            <p className="text-sm font-medium">
                              {
                                item.title
                              }
                            </p>

                            {item.description && (
                              <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted)]">
                                {
                                  item.description
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center text-sm">
                        {
                          item.quantity
                        }
                      </td>

                      <td className="px-5 py-4 text-right text-sm">
                        {formatMoney(
                          Number(
                            item.unit_price_cents
                          ),
                          invoice.currency
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold">
                        {formatMoney(
                          Number(
                            item.line_total_cents
                          ),
                          invoice.currency
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-[var(--border-light)] px-6 py-5">
          <div className="ml-auto max-w-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">
                Subtotal
              </span>

              <span>
                {formatMoney(
                  Number(
                    invoice.subtotal_cents ??
                      0
                  ),
                  invoice.currency
                )}
              </span>
            </div>

            {Number(
              invoice.discount_cents ??
                0
            ) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Discount
                </span>

                <span>
                  -
                  {formatMoney(
                    Number(
                      invoice.discount_cents
                    ),
                    invoice.currency
                  )}
                </span>
              </div>
            )}

            {Number(
              invoice.tax_cents ??
                0
            ) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Tax
                </span>

                <span>
                  {formatMoney(
                    Number(
                      invoice.tax_cents
                    ),
                    invoice.currency
                  )}
                </span>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-semibold">
                  {formatMoney(
                    Number(
                      invoice.total_cents ??
                        0
                    ),
                    invoice.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Payment
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--muted)]">
                Status
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                    invoice.status
                  )}`}
                >
                  {
                    invoice.status
                  }
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Paid date
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  invoice.paid_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Payment provider
              </p>

              <p className="mt-1 text-sm font-medium capitalize">
                {invoice.payment_provider ||
                  "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Invoice
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--muted)]">
                Invoice number
              </p>

              <p className="mt-1 font-mono text-sm font-medium">
                {
                  invoice.invoice_number
                }
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Currency
              </p>

              <p className="mt-1 text-sm font-medium">
                {
                  invoice.currency
                }
              </p>
            </div>
          </div>
        </section>
      </div>

      {invoice.notes && (
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Notes
          </h2>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
            {invoice.notes}
          </p>
        </section>
      )}

      {invoice.status ===
        "unpaid" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">
            This invoice is unpaid.
          </p>

          <p className="mt-1 text-sm text-amber-700">
            Payment support will be available here in the next step.
          </p>
        </div>
      )}
    </div>
  );
}