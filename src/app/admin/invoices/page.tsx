import Link from "next/link";

import {
  Plus,
  ReceiptText,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

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
      cents / 100
    );
  } catch {
    return `${
      currency ||
      "USD"
    } ${(
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
      dateStyle:
        "medium",
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

export default async function AdminInvoicesPage() {
  const admin =
    createAdminClient();

  const {
    data: invoices,
    error,
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
      created_at
    `)
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load invoices:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const rows =
    invoices ?? [];

  const customerIds =
    [
      ...new Set(
        rows
          .map(
            (invoice) =>
              invoice.user_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      ),
    ];

  const customerMap =
    new Map<
      string,
      {
        name: string;
        email: string;
      }
    >();

  await Promise.all(
    customerIds.map(
      async (
        userId
      ) => {
        const [
          profileResult,
          authResult,
        ] =
          await Promise.all([
            admin
              .from(
                "profiles"
              )
              .select(
                "full_name"
              )
              .eq(
                "id",
                userId
              )
              .maybeSingle(),

            admin.auth.admin.getUserById(
              userId
            ),
          ]);

        const authUser =
          authResult.data
            .user;

        customerMap.set(
          userId,
          {
            name:
              profileResult.data
                ?.full_name ||
              authUser
                ?.user_metadata
                ?.full_name ||
              authUser
                ?.user_metadata
                ?.name ||
              "Unnamed customer",

            email:
              authUser?.email ||
              "—",
          }
        );
      }
    )
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Invoices
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage customer billing and service invoices.
          </p>
        </div>

        <Link
          href="/admin/invoices/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Create invoice
        </Link>
      </div>

      {rows.length ===
      0 ? (
        <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ReceiptText className="h-6 w-6" />
            </div>

            <h2 className="mt-4 font-semibold">
              No invoices
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Create your first customer invoice.
            </p>

            <Link
              href="/admin/invoices/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Create invoice
            </Link>
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
                    Customer
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
                  ) => {
                    const customer =
                      invoice.user_id
                        ? customerMap.get(
                            invoice.user_id
                          )
                        : null;

                    return (
                      <tr
                        key={
                          invoice.id
                        }
                        className="border-b border-[var(--border-light)] last:border-b-0"
                      >
                        <td className="px-5 py-4">
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
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium">
                            {customer?.name ??
                              "—"}
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {customer?.email ??
                              "—"}
                          </p>
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
                            href={`/admin/invoices/${invoice.id}`}
                            className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}