import Link from "next/link";

import {
  Eye,
  ReceiptText,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

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

  return date.toLocaleDateString(
    "en-US",
    {
      dateStyle:
        "medium",
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

export default async function ClientInvoicesPage() {
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
      invoices,
    error,
  } = await supabase
    .from(
      "invoices"
    )
    .select(`
      id,
      invoice_number,
      status,
      currency,
      total_cents,
      issued_at,
      due_at,
      paid_at,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .neq(
      "status",
      "draft"
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (
    error
  ) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load invoices.
        </div>
      </div>
    );
  }

  const rows =
    invoices ??
    [];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] sm:text-[27px]">
          Invoices
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
          View invoices and payment status.
        </p>
      </section>

      {rows.length ===
      0 ? (
        <section className="flex min-h-[300px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5">
          <div className="text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-[var(--primary)]" />

            <h2 className="mt-4 font-semibold">
              No invoices
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Your invoices will appear here when available.
            </p>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-[minmax(180px,1.3fr)_120px_110px_140px_140px_60px] items-center border-b border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-3">
              <HeaderCell>
                Invoice
              </HeaderCell>

              <HeaderCell>
                Total
              </HeaderCell>

              <HeaderCell>
                Status
              </HeaderCell>

              <HeaderCell>
                Issued
              </HeaderCell>

              <HeaderCell>
                Due
              </HeaderCell>

              <HeaderCell right>
                Action
              </HeaderCell>
            </div>

            {rows.map(
              (
                invoice
              ) => (
                <div
                  key={
                    invoice.id
                  }
                  className="grid grid-cols-[minmax(180px,1.3fr)_120px_110px_140px_140px_60px] items-center border-b border-[var(--border-light)] px-6 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold">
                      {
                        invoice.invoice_number
                      }
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Created{" "}
                      {formatDate(
                        invoice.created_at
                      )}
                    </p>
                  </div>

                  <p className="text-sm font-semibold">
                    {formatMoney(
                      Number(
                        invoice.total_cents ??
                          0
                      ),
                      invoice.currency ??
                        "USD"
                    )}
                  </p>

                  <div>
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

                  <p className="text-sm text-[var(--muted)]">
                    {formatDate(
                      invoice.issued_at
                    )}
                  </p>

                  <p className="text-sm text-[var(--muted)]">
                    {formatDate(
                      invoice.due_at
                    )}
                  </p>

                  <div className="flex justify-end">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      aria-label="View invoice"
                      title="View invoice"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Tablet / mobile */}
          <div className="divide-y divide-[var(--border-light)] lg:hidden">
            {rows.map(
              (
                invoice
              ) => (
                <div
                  key={
                    invoice.id
                  }
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold">
                        {
                          invoice.invoice_number
                        }
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatDate(
                          invoice.issued_at
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                        invoice.status
                      )}`}
                    >
                      {
                        invoice.status
                      }
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Total
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatMoney(
                          Number(
                            invoice.total_cents ??
                              0
                          ),
                          invoice.currency ??
                            "USD"
                        )}
                      </p>
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

                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      aria-label="View invoice"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function HeaderCell({
  children,
  right = false,
}: {
  children:
    React.ReactNode;
  right?: boolean;
}) {
  return (
    <div
      className={`text-xs font-semibold text-[var(--muted)] ${
        right
          ? "text-right"
          : ""
      }`}
    >
      {
        children
      }
    </div>
  );
}