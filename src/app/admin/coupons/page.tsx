import Link from "next/link";

import {
  Plus,
  TicketPercent,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  toggleCouponStatus,
} from "./actions";

function formatCouponValue(
  coupon: {
    discount_type:
      | string
      | null;

    amount: number;

    currency:
      | string
      | null;
  }
) {
  if (
    coupon.discount_type ===
    "percentage"
  ) {
    return `${coupon.amount}%`;
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        coupon.currency ??
        "USD",
    }
  ).format(
    coupon.amount /
      100
  );
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Never";
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

export default async function AdminCouponsPage() {
  const admin =
    createAdminClient();

  const {
    data: coupons,
    error,
  } = await admin
    .from("coupons")
    .select(`
      id,
      code,
      description,
      discount_type,
      amount,
      currency,
      active,
      expires_at,
      usage_limit,
      paddle_discount_id,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Coupons
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage discount codes and promotions.
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus className="h-4 w-4" />

          Add coupon
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load coupons:{" "}
          {error.message}
        </div>
      )}

      {!error &&
        coupons?.length ===
          0 && (
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <TicketPercent className="h-6 w-6" />
              </div>

              <h2 className="mt-4 font-semibold">
                No coupons
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Create your first discount code.
              </p>
            </div>
          </div>
        )}

      {coupons &&
        coupons.length >
          0 && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Coupon
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Discount
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Usage
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Expires
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Paddle
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {coupons.map(
                    (coupon) => {
                      const toggleAction =
                        toggleCouponStatus.bind(
                          null,
                          coupon.id,
                          !coupon.active
                        );

                      return (
                        <tr
                          key={
                            coupon.id
                          }
                          className="border-b border-[var(--border-light)] last:border-b-0"
                        >
                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold">
                              {coupon.code}
                            </p>

                            {coupon.description && (
                              <p className="mt-1 max-w-[260px] truncate text-xs text-[var(--muted)]">
                                {
                                  coupon.description
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium">
                            {formatCouponValue(
                              coupon
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-[var(--muted)]">
                            {coupon.usage_limit
                              ? `Max ${coupon.usage_limit}`
                              : "Unlimited"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--muted)]">
                            {formatDate(
                              coupon.expires_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                coupon.paddle_discount_id
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {coupon.paddle_discount_id
                                ? "Connected"
                                : "Not connected"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                coupon.active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {coupon.active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/admin/coupons/${coupon.id}/edit`}
                                className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                Edit
                              </Link>

                              <form
                                action={
                                  toggleAction
                                }
                              >
                                <button
                                  type="submit"
                                  className="h-9 rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                                >
                                  {coupon.active
                                    ? "Disable"
                                    : "Enable"}
                                </button>
                              </form>
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