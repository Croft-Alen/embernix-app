import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  TicketPercent,
  XCircle,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  syncCoupon,
  toggleCouponStatus,
} from "./actions";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string | null;
  amount: number;
  currency: string | null;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  creem_discount_id: string | null;
  created_at: string;
};

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function discountLabel(coupon: Coupon): string {
  if (coupon.discount_type === "percentage") {
    return `${coupon.amount}%`;
  }

  const currency = coupon.currency ?? "USD";

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    });

    const decimals =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;

    return formatter.format(
      coupon.amount / 10 ** decimals
    );
  } catch {
    return `${coupon.amount} ${currency}`;
  }
}

function dateLabel(value: string | null): string {
  if (!value) return "Never";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function expired(value: string | null): boolean {
  if (!value) return false;

  const time = new Date(value).getTime();

  return !Number.isFinite(time) || time <= Date.now();
}

function getStatus(coupon: Coupon) {
  if (!coupon.active) {
    return {
      text: "Inactive",
      className: "bg-gray-100 text-gray-600",
      Icon: XCircle,
    };
  }

  if (!coupon.creem_discount_id) {
    return {
      text: "Needs sync",
      className: "bg-amber-50 text-amber-700",
      Icon: AlertTriangle,
    };
  }

  if (expired(coupon.expires_at)) {
    return {
      text: "Expired",
      className: "bg-orange-50 text-orange-700",
      Icon: Clock3,
    };
  }

  return {
    text: "Active locally",
    className: "bg-green-50 text-green-700",
    Icon: CheckCircle2,
  };
}

export default async function AdminCouponsPage({
  searchParams,
}: Props) {
  const query = await searchParams;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id,created_at"
    )
    .order("created_at", { ascending: false });

  const coupons = (data ?? []) as Coupon[];

  const successMessages: Record<string, string> = {
    synced: "Coupon synchronized with Creem successfully.",
    enabled: "Coupon enabled and connected to Creem.",
    disabled: "Coupon disabled and its Creem mapping cleared.",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Coupons
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage Embernix discounts and their Creem connections.
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add coupon
        </Link>
      </div>

      {query.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {query.error}
        </div>
      )}

      {query.success && successMessages[query.success] && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {successMessages[query.success]}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        To change a synchronized coupon's discount rules,
        disable it first, edit the settings, then enable it
        again. Disabling is blocked while an active unpaid
        checkout is using that coupon.
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load coupons: {error.message}
        </div>
      )}

      {!error && coupons.length === 0 && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-8">
          <div className="text-center">
            <TicketPercent className="mx-auto h-10 w-10 text-[var(--primary)]" />

            <h2 className="mt-4 font-semibold">
              No coupons yet
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Create your first discount code.
            </p>
          </div>
        </div>
      )}

      {!error && coupons.length > 0 && (
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
                    Creem
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
                {coupons.map((coupon) => {
                  const status = getStatus(coupon);
                  const StatusIcon = status.Icon;

                  const toggle = toggleCouponStatus.bind(
                    null,
                    coupon.id,
                    !coupon.active
                  );

                  const sync = syncCoupon.bind(
                    null,
                    coupon.id
                  );

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-[var(--border-light)] last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold">
                          {coupon.code}
                        </p>

                        {coupon.description && (
                          <p className="mt-1 max-w-[260px] truncate text-xs text-[var(--muted)]">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium">
                        {discountLabel(coupon)}
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {coupon.usage_limit === null
                          ? "Unlimited"
                          : `Max ${coupon.usage_limit}`}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--muted)]">
                        {dateLabel(coupon.expires_at)}
                      </td>

                      <td className="px-5 py-4">
                        {coupon.creem_discount_id ? (
                          <div>
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Mapped
                            </span>

                            <p
                              className="mt-1 max-w-[150px] truncate font-mono text-xs text-[var(--muted)]"
                              title={coupon.creem_discount_id}
                            >
                              {coupon.creem_discount_id}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Not mapped
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.text}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/coupons/${coupon.id}/edit`}
                            className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)]"
                          >
                            Edit
                          </Link>

                          {coupon.active &&
                            !coupon.creem_discount_id && (
                              <form action={sync}>
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Sync
                                </button>
                              </form>
                            )}

                          <form action={toggle}>
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)]"
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        Mapping status is local. Checkout performs a separate
        verification against Creem before accepting a coupon.
      </p>
    </div>
  );
}