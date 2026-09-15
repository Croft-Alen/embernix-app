import Link from "next/link";

import {
  FileText,
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

  return date.toLocaleDateString(
    "en-US",
    {
      dateStyle: "medium",
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

export default async function ClientInvoicesPage() {
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
    data: invoices,
    error,
  } = await supabase
    .from("invoices")
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
        ascending: false,
      }
    );

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load invoices.
        </div>
      </div>
    );
  }

  const rows =
    invoices ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Invoices
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          View your service invoices and payment status.
        </p>
      </div>

      {rows.length ===
      0 ? (
        <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ReceiptText className="h-6 w-6" />
            </div>

            <h2 className="mt-4 font-semibold">
              No invoices
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Your invoices will appear here when available.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Invoice
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Total
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Issued
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Due
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    invoice
                  ) => (
                    <tr
                      key={
                        invoice.id
                      }
                      className="border-b border-[var(--border-light)] last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="font-mono text-sm font-semibold">
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
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold">
                        {formatMoney(
                          Number(
                            invoice.total_cents ??
                              0
                          ),
                          invoice.currency ??
                            "USD"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                            invoice.status
                          )}`}
                        >
                          {
                            invoice.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {formatDate(
                          invoice.issued_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {formatDate(
                          invoice.due_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}