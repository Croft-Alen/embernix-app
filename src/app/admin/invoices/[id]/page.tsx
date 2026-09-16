import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FilePenLine,
  ReceiptText,
  UserRound,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import DownloadInvoiceButton from "@/components/invoices/DownloadInvoiceButton";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getProviderAvatar,
} from "@/lib/auth/profile";

type InvoicePageProps = {
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

export default async function AdminInvoicePage({
  params,
}: InvoicePageProps) {
  const {
    id,
  } = await params;

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
      issued_at,
      due_at,
      paid_at,
      payment_provider,
      paddle_transaction_id,
      notes,
      created_by,
      created_at,
      updated_at
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
    notFound();
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
          sort_order,
          created_at
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
              full_name,
              created_at
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
    throw new Error(
      "Unable to load invoice items."
    );
  }

  const items =
    itemsResult.data ??
    [];

  const profile =
    profileResult.data;

  const authUser =
    authResult.data.user;

  const customerName =
    profile?.full_name ||
    authUser
      ?.user_metadata
      ?.full_name ||
    authUser
      ?.user_metadata
      ?.name ||
    "Unnamed customer";

  const customerEmail =
    authUser?.email ||
    "—";

  const customerAvatar =
    authUser
      ? getProviderAvatar(
          authUser
        )
      : null;

  const canEdit =
    invoice.status ===
      "draft" ||
    invoice.status ===
      "unpaid";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/invoices"
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

        <div className="flex flex-wrap items-center gap-2">
          <DownloadInvoiceButton
            invoiceId={
              invoice.id
            }
          />

          {canEdit && (
            <Link
              href={`/admin/invoices/${invoice.id}/edit`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            >
              <FilePenLine className="h-4 w-4" />

              Edit invoice
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <CreditCard className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Paid
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  invoice.paid_at
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
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
                  Services and items billed on this invoice.
                </p>
              </div>
            </div>

            {items.length ===
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
                    {items.map(
                      (item) => (
                        <tr
                          key={
                            item.id
                          }
                          className="border-b border-[var(--border-light)] last:border-b-0"
                        >
                          <td className="px-5 py-4">
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
                <div className="flex items-center justify-between text-sm">
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
                  <div className="flex items-center justify-between text-sm">
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
                  <div className="flex items-center justify-between text-sm">
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

          {invoice.notes && (
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="font-semibold">
                Notes
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {
                  invoice.notes
                }
              </p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <UserRound className="h-4 w-4" />
              </div>

              <h2 className="font-semibold">
                Customer
              </h2>
            </div>

            <div className="mt-5 flex items-center gap-3">
              {customerAvatar ? (
                <img
                  src={
                    customerAvatar
                  }
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold">
                  {customerName
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {
                    customerName
                  }
                </p>

                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {
                    customerEmail
                  }
                </p>
              </div>
            </div>

            {invoice.user_id && (
              <Link
                href={`/admin/customers/${invoice.user_id}`}
                className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[var(--border)] text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              >
                View customer
              </Link>
            )}
          </section>

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
                  Payment provider
                </p>

                <p className="mt-1 text-sm font-medium capitalize">
                  {invoice.payment_provider ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)]">
                  Paddle transaction
                </p>

                <p className="mt-1 break-all font-mono text-xs">
                  {invoice.paddle_transaction_id ||
                    "—"}
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
      </div>
    </div>
  );
}