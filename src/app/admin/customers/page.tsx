import Link from "next/link";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

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
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

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

type CustomerRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

type CustomerStats = {
  customerId: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  currency: string;
  productsOwned: number;
  lastPurchase: string | null;
};

export default async function AdminCustomersPage() {
  const admin =
    createAdminClient();

  const {
    data: profiles,
    error: profilesError,
  } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      avatar_url,
      created_at
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (profilesError) {
    return (
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load customers.
        </div>
      </div>
    );
  }

  const profileRows =
    (profiles ??
      []) as CustomerRow[];

  const customerStats =
    await Promise.all(
      profileRows.map(
        async (
          profile
        ): Promise<CustomerStats> => {
          const [
            authResult,
            ordersResult,
            productsResult,
          ] =
            await Promise.all([
              admin.auth.admin.getUserById(
                profile.id
              ),

              admin
                .from("orders")
                .select(`
                  id,
                  total_cents,
                  currency,
                  payment_status,
                  paid_at,
                  created_at
                `)
                .eq(
                  "user_id",
                  profile.id
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
                .select(
                  "id"
                )
                .eq(
                  "user_id",
                  profile.id
                )
                .eq(
                  "status",
                  "active"
                ),
            ]);

          const email =
            authResult.data.user
              ?.email ??
            "—";

          const orders =
            ordersResult.data ??
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

          const lastPurchase =
            paidOrders[0]
              ?.paid_at ??
            null;

          return {
            customerId:
              profile.id,

            email,

            orderCount:
              orders.length,

            totalSpent,

            currency,

            productsOwned:
              productsResult.data
                ?.length ??
              0,

            lastPurchase,
          };
        }
      )
    );

  const statsByCustomer =
    new Map(
      customerStats.map(
        (stats) => [
          stats.customerId,
          stats,
        ]
      )
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Customers
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          View customer accounts, purchases, and owned products.
        </p>
      </div>

      {profileRows.length ===
      0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
          <div className="text-center">
            <h2 className="font-semibold">
              No customers yet
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Customer accounts will appear here.
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
                    Customer
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Joined
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Orders
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Total spent
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Products
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Last purchase
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {profileRows.map(
                  (profile) => {
                    const stats =
                      statsByCustomer.get(
                        profile.id
                      );

                    return (
                      <tr
                        key={
                          profile.id
                        }
                        className="border-b border-[var(--border-light)] last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {profile.avatar_url ? (
                              <img
                                src={
                                  profile.avatar_url
                                }
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold">
                                {(
                                  profile.full_name ??
                                  stats?.email ??
                                  "C"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {profile.full_name ||
                                  "Unnamed customer"}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                                {stats?.email ??
                                  "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--muted)]">
                          {formatDate(
                            profile.created_at
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {stats?.orderCount ??
                            0}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium">
                          {formatMoney(
                            stats?.totalSpent ??
                              0,
                            stats?.currency ??
                              "USD"
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {stats?.productsOwned ??
                            0}
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--muted)]">
                          {formatDate(
                            stats?.lastPurchase ??
                              null
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/customers/${profile.id}`}
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