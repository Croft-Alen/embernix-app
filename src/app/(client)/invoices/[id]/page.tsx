import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  FileText,
  LoaderCircle,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import DownloadInvoiceButton from "@/components/invoices/DownloadInvoiceButton";

import InvoicePaymentStatusWatcher from "@/components/invoices/InvoicePaymentStatusWatcher";

import PayInvoiceButton from "@/components/invoices/PayInvoiceButton";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    payment?: string;
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
        style:
          "currency",

        currency:
          currency ||
          "USD",
      }
    ).format(
      cents /
        100
    );
  } catch {
    return `${
      currency ||
      "USD"
    } ${(
      cents /
      100
    ).toFixed(
      2
    )}`;
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
    new Date(
      value
    );

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
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  );
}

function statusClass(
  status: string
) {
  switch (
    status
  ) {
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
  searchParams,
}: InvoiceDetailPageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      invoice,
    error:
      invoiceError,
  } = await supabase
    .from(
      "invoices"
    )
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
    data:
      items,
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
        ascending:
          true,
      }
    );

  if (
    itemsError
  ) {
    throw new Error(
      "Unable to load invoice items."
    );
  }

  const rows =
    items ??
    [];

  const processing =
    query.payment ===
      "processing" &&
    invoice.status ===
      "unpaid";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <InvoicePaymentStatusWatcher
        enabled={
          processing
        }
      />

      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Invoices
      </Link>

      {processing && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <LoaderCircle className="h-4 w-4 animate-spin" />

          Confirming your payment...
        </div>
      )}

      {query.payment ===
        "processing" &&
        invoice.status ===
          "paid" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Payment completed successfully.
          </div>
        )}

      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-[23px] font-semibold tracking-[-0.02em] sm:text-[27px]">
                  {
                    invoice.invoice_number
                  }
                </h1>

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

              <p className="mt-2 text-sm text-[var(--muted)]">
                Created{" "}
                {formatDate(
                  invoice.created_at
                )}
              </p>
            </div>

            <DownloadInvoiceButton
              invoiceId={
                invoice.id
              }
            />
          </div>
        </div>

        <div className="grid gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          <SummaryItem
            label="Total"
            value={formatMoney(
              Number(
                invoice.total_cents ??
                  0
              ),
              invoice.currency
            )}
            large
          />

          <SummaryItem
            label="Issued"
            value={formatDate(
              invoice.issued_at
            )}
          />

          <SummaryItem
            label="Due"
            value={formatDate(
              invoice.due_at
            )}
          />
        </div>

        <div className="px-5 py-6 sm:px-7">
          <h2 className="text-base font-semibold">
            Invoice items
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Items included in this invoice.
          </p>

          {rows.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No invoice items found.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[16px] border border-[var(--border)]">
              {/* Desktop */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[minmax(200px,1fr)_70px_130px_130px] border-b border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
                  <InvoiceHeading>
                    Item
                  </InvoiceHeading>

                  <InvoiceHeading center>
                    Qty
                  </InvoiceHeading>

                  <InvoiceHeading right>
                    Unit price
                  </InvoiceHeading>

                  <InvoiceHeading right>
                    Total
                  </InvoiceHeading>
                </div>

                {rows.map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="grid grid-cols-[minmax(200px,1fr)_70px_130px_130px] items-start border-b border-[var(--border-light)] px-4 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-2.5">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />

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
                      </div>

                      <p className="text-center text-sm">
                        {
                          item.quantity
                        }
                      </p>

                      <p className="text-right text-sm">
                        {formatMoney(
                          Number(
                            item.unit_price_cents
                          ),
                          invoice.currency
                        )}
                      </p>

                      <p className="text-right text-sm font-semibold">
                        {formatMoney(
                          Number(
                            item.line_total_cents
                          ),
                          invoice.currency
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Mobile */}
              <div className="divide-y divide-[var(--border-light)] md:hidden">
                {rows.map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="p-4"
                    >
                      <p className="text-sm font-semibold">
                        {
                          item.title
                        }
                      </p>

                      {item.description && (
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                          {
                            item.description
                          }
                        </p>
                      )}

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <MiniValue
                          label="Qty"
                          value={String(
                            item.quantity
                          )}
                        />

                        <MiniValue
                          label="Unit"
                          value={formatMoney(
                            Number(
                              item.unit_price_cents
                            ),
                            invoice.currency
                          )}
                        />

                        <MiniValue
                          label="Total"
                          value={formatMoney(
                            Number(
                              item.line_total_cents
                            ),
                            invoice.currency
                          )}
                          strong
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="ml-auto mt-6 max-w-sm space-y-3">
            <MoneyRow
              label="Subtotal"
              value={formatMoney(
                Number(
                  invoice.subtotal_cents ??
                    0
                ),
                invoice.currency
              )}
            />

            {Number(
              invoice.discount_cents ??
                0
            ) > 0 && (
              <MoneyRow
                label="Discount"
                value={`-${formatMoney(
                  Number(
                    invoice.discount_cents
                  ),
                  invoice.currency
                )}`}
              />
            )}

            {Number(
              invoice.tax_cents ??
                0
            ) > 0 && (
              <MoneyRow
                label="Tax"
                value={formatMoney(
                  Number(
                    invoice.tax_cents
                  ),
                  invoice.currency
                )}
              />
            )}

            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between gap-6">
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold">
            Payment
          </h2>

          <div className="mt-5 space-y-4">
            <DetailValue
              label="Status"
            >
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                  invoice.status
                )}`}
              >
                {
                  invoice.status
                }
              </span>
            </DetailValue>

            <DetailValue
              label="Paid date"
            >
              {
                formatDate(
                  invoice.paid_at
                )
              }
            </DetailValue>

            <DetailValue
              label="Provider"
            >
              <span className="capitalize">
                {invoice.payment_provider ||
                  "—"}
              </span>
            </DetailValue>
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold">
            Invoice details
          </h2>

          <div className="mt-5 space-y-4">
            <DetailValue
              label="Invoice number"
            >
              <span className="font-mono">
                {
                  invoice.invoice_number
                }
              </span>
            </DetailValue>

            <DetailValue
              label="Currency"
            >
              {
                invoice.currency
              }
            </DetailValue>

            {invoice.paddle_transaction_id && (
              <DetailValue
                label="Transaction"
              >
                <span className="break-all font-mono text-xs">
                  {
                    invoice.paddle_transaction_id
                  }
                </span>
              </DetailValue>
            )}
          </div>
        </div>
      </section>

      {invoice.notes && (
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold">
            Notes
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
            {
              invoice.notes
            }
          </p>
        </section>
      )}

      {invoice.status ===
        "unpaid" &&
        !processing && (
          <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mx-auto max-w-md text-center">
              <h2 className="font-semibold">
                Payment required
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Pay{" "}
                {formatMoney(
                  Number(
                    invoice.total_cents
                  ),
                  invoice.currency
                )}{" "}
                securely through Paddle.
              </p>

              <div className="mt-5">
                <PayInvoiceButton
                  invoiceId={
                    invoice.id
                  }
                />
              </div>
            </div>
          </section>
        )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        <CalendarDays className="h-3.5 w-3.5" />

        {
          label
        }
      </div>

      <p
        className={`mt-2 font-semibold text-[var(--foreground)] ${
          large
            ? "text-xl"
            : "text-sm"
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function InvoiceHeading({
  children,
  right = false,
  center = false,
}: {
  children:
    React.ReactNode;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <div
      className={`text-xs font-semibold text-[var(--muted)] ${
        right
          ? "text-right"
          : center
            ? "text-center"
            : ""
      }`}
    >
      {
        children
      }
    </div>
  );
}

function MiniValue({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-[var(--muted)]">
        {
          label
        }
      </p>

      <p
        className={`mt-1 text-xs ${
          strong
            ? "font-semibold"
            : "font-medium"
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-6 text-sm">
      <span className="text-[var(--muted)]">
        {
          label
        }
      </span>

      <span>
        {
          value
        }
      </span>
    </div>
  );
}

function DetailValue({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--muted)]">
        {
          label
        }
      </p>

      <div className="mt-1.5 text-sm font-medium">
        {
          children
        }
      </div>
    </div>
  );
}