import Link from "next/link";

import {
  CreditCard,
  Package,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

type OrdersPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

function formatMoney(
  cents: number | null,
  currency: string | null
) {
  const amount =
    (cents ?? 0) / 100;

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency:
        currency || "USD",
    }
  ).format(amount);
}

function formatDate(
  value: string | null
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

export default async function AdminOrdersPage({
  searchParams,
}: OrdersPageProps) {
  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: orders,
    error,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      user_id,
      customer_email,
      customer_name,
      status,
      payment_status,
      currency,
      total_cents,
      payment_provider,
      paddle_transaction_id,
      paddle_invoice_number,
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Orders
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          View customer purchases and payment status.
        </p>
      </div>

      {query.message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {query.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load orders:{" "}
          {error.message}
        </div>
      )}

      {!error &&
        orders?.length ===
          0 && (
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <CreditCard className="h-6 w-6" />
              </div>

              <h2 className="mt-4 font-semibold">
                No orders yet
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Customer purchases will appear here.
              </p>
            </div>
          </div>
        )}

      {orders &&
        orders.length >
          0 && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Order
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Total
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Date
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(
                    (order) => {
                      const paid =
                        order.payment_status ===
                          "paid" ||
                        order.status ===
                          "paid";

                      return (
                        <tr
                          key={
                            order.id
                          }
                          className="border-b border-[var(--border-light)] last:border-b-0"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                                <Package className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-sm font-medium">
                                  {
                                    order.order_number
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-[var(--muted)]">
                                  {
                                    order.payment_provider ||
                                    "—"
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm">
                              {
                                order.customer_email ||
                                "—"
                              }
                            </p>

                            {order.customer_name && (
                              <p className="mt-0.5 text-xs text-[var(--muted)]">
                                {
                                  order.customer_name
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium">
                            {formatMoney(
                              order.total_cents,
                              order.currency
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                paid
                                  ? "bg-green-50 text-green-700"
                                  : order.payment_status ===
                                      "unpaid"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {paid
                                ? "Paid"
                                : order.payment_status ||
                                  order.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-[var(--muted)]">
                            {formatDate(
                              order.paid_at ||
                                order.created_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                View
                              </Link>
                            </div>
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