import Link from "next/link";

import {
  ArrowLeft,
  Package,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type CustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(
  cents: number,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
    }
  ).format(cents / 100);
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

function statusBadge(
  status:
    | string
    | null
) {
  if (status === "paid") {
    return "bg-green-50 text-green-700";
  }

  if (status === "refunded") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default async function AdminCustomerDetailPage({
  params,
}: CustomerPageProps) {
  const {
    id,
  } = await params;

  const admin =
    createAdminClient();

  const [
    profileResult,
    authResult,
    ordersResult,
    productsResult,
  ] =
    await Promise.all([
      admin
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          created_at,
          updated_at
        `)
        .eq(
          "id",
          id
        )
        .maybeSingle(),

      admin.auth.admin.getUserById(
        id
      ),

      admin
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          currency,
          total_cents,
          paddle_transaction_id,
          paddle_invoice_number,
          paid_at,
          created_at
        `)
        .eq(
          "user_id",
          id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      admin
        .from(
          "customer_products"
        )
        .select(`
          id,
          product_id,
          order_id,
          status,
          purchased_at,
          products (
            id,
            name,
            slug,
            image_url,
            version
          )
        `)
        .eq(
          "user_id",
          id
        )
        .order(
          "purchased_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  const profile =
    profileResult.data;

  const authUser =
    authResult.data.user;

  if (
    !profile &&
    !authUser
  ) {
    notFound();
  }

  const orders =
    ordersResult.data ??
    [];

  const ownedProducts =
    productsResult.data ??
    [];

  const paidOrders =
    orders.filter(
      (
        order
      ) =>
        order.payment_status ===
        "paid"
    );

  const totalSpent =
    paidOrders.reduce(
      (
        total,
        order
      ) =>
        total +
        Number(
          order.total_cents ??
            0
        ),
      0
    );

  const currency =
    paidOrders[0]
      ?.currency ??
    orders[0]
      ?.currency ??
    "USD";

  const activeProducts =
    ownedProducts.filter(
      (
        product
      ) =>
        product.status ===
        "active"
    );

  const lastPurchase =
    paidOrders[0]
      ?.paid_at ??
    null;

  const name =
    profile?.full_name ||
    authUser
      ?.user_metadata
      ?.full_name ||
    authUser
      ?.user_metadata
      ?.name ||
    "Unnamed customer";

  const email =
    authUser?.email ??
    "—";

  const avatar =
    profile?.avatar_url ||
    authUser
      ?.user_metadata
      ?.avatar_url ||
    null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>

        <div className="mt-5 flex items-center gap-4">
          {avatar ? (
            <img
              src={
                avatar
              }
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-lg font-semibold">
              {name
                .charAt(
                  0
                )
                .toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold">
              {name}
            </h1>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShoppingCart className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Orders
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  orders.length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Total spent
              </p>

              <p className="mt-1 text-xl font-semibold">
                {formatMoney(
                  totalSpent,
                  currency
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Products owned
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  activeProducts.length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs text-[var(--muted)]">
            Last purchase
          </p>

          <p className="mt-2 text-sm font-medium">
            {formatDate(
              lastPurchase
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">
              Customer
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">
                  Name
                </p>

                <p className="mt-1 font-medium">
                  {name}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)]">
                  Email
                </p>

                <p className="mt-1 break-all font-medium">
                  {email}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)]">
                  Joined
                </p>

                <p className="mt-1 font-medium">
                  {formatDate(
                    profile?.created_at ??
                      authUser?.created_at ??
                      null
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)]">
                  User ID
                </p>

                <p className="mt-1 break-all font-mono text-xs">
                  {id}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">
              Owned products
            </h2>

            <div className="mt-5 space-y-3">
              {ownedProducts.length ===
              0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No products owned.
                </p>
              ) : (
                ownedProducts.map(
                  (
                    ownership
                  ) => {
                    const product =
                      Array.isArray(
                        ownership.products
                      )
                        ? ownership
                            .products[0]
                        : ownership.products;

                    return (
                      <div
                        key={
                          ownership.id
                        }
                        className="rounded-xl border border-[var(--border-light)] p-3"
                      >
                        <div className="flex items-center gap-3">
                          {product?.image_url ? (
                            <img
                              src={
                                product.image_url
                              }
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
                              <Package className="h-4 w-4 text-[var(--muted)]" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {product?.name ??
                                "Product"}
                            </p>

                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatDate(
                                ownership.purchased_at
                              )}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              ownership.status ===
                              "active"
                                ? "bg-green-50 text-green-700"
                                : ownership.status ===
                                    "refunded"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {
                              ownership.status
                            }
                          </span>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border-light)] px-5 py-4">
            <h2 className="font-semibold">
              Order history
            </h2>
          </div>

          {orders.length ===
          0 ? (
            <div className="p-6 text-sm text-[var(--muted)]">
              No orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Order
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Paid
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(
                    (order) => (
                      <tr
                        key={
                          order.id
                        }
                        className="border-b border-[var(--border-light)] last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium">
                            {
                              order.order_number
                            }
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {formatDate(
                              order.created_at
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium">
                          {formatMoney(
                            Number(
                              order.total_cents ??
                                0
                            ),
                            order.currency ??
                              "USD"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(
                              order.payment_status
                            )}`}
                          >
                            {order.payment_status ??
                              "unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--muted)]">
                          {formatDate(
                            order.paid_at
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
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
          )}
        </section>
      </div>
    </div>
  );
}