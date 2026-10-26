import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Plus,
  TicketPercent,
  XCircle,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { toggleCouponStatus } from "./actions";

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

function formatDiscount(coupon: Coupon): string {
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

return formatter.format(coupon.amount / 10 ** decimals);
  } catch {
    return `${coupon.amount} ${currency}`;
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isExpired(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= Date.now();
}

function getStatus(coupon: Coupon) {
  if (!coupon.active) {
    return {
      label: "Inactive",
      className: "bg-gray-100 text-gray-600",
      Icon: XCircle,
    };
  }

  if (!coupon.creem_discount_id) {
    return {
      label: "Needs setup",
      className: "bg-amber-50 text-amber-700",
      Icon: AlertCircle,
    };
  }

  if (isExpired(coupon.expires_at)) {
    return {
      label: "Expired",
      className: "bg-orange-50 text-orange-700",
      Icon: Clock3,
    };
  }

  return {
    label: "Active locally",
    className: "bg-green-50 text-green-700",
    Icon: CheckCircle2,
  };
}

export default async function AdminCouponsPage() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id,created_at"
    )
    .order("created_at", { ascending: false });

  const coupons = (data ?? []) as Coupon[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Coupons
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage discount codes and their Creem connections.
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

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        New active coupons are created in Creem automatically.
        Existing coupons without a Creem connection need to be
        synchronized before customers can use them.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load coupons: {error.message}
        </div>
      )}

      {!error && coupons.length === 0 && (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <TicketPercent className="h-6 w-6" />
            </div>

            <h2 className="mt-4 font-semibold">
              No coupons yet
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Create your first discount code.
            </p>

            <Link
              href="/admin/coupons/new"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white"
            >
              Create coupon
            </Link>
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
                    Usage limit
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

                  const canEnable =
                    !coupon.active &&
                    !coupon.creem_discount_id;

                  const canDisable =
                    coupon.active &&
                    !coupon.creem_discount_id;

                  const canToggle = canEnable || canDisable;

                  const toggleAction = toggleCouponStatus.bind(
                    null,
                    coupon.id,
                    !coupon.active
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
                        {formatDiscount(coupon)}
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {coupon.usage_limit
                          ? `Max ${coupon.usage_limit}`
                          : "Unlimited"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--muted)]">
                        {formatDate(coupon.expires_at)}
                      </td>

                      <td className="px-5 py-4">
                        {coupon.creem_discount_id ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Not mapped
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
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

                          {canToggle ? (
                            <form action={toggleAction}>
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                {coupon.active
                                  ? "Disable"
                                  : "Enable"}
                              </button>
                            </form>
                          ) : (
                            <span
                              title="Status changes for mapped coupons require Creem synchronization."
                              className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl border border-[var(--border)] bg-gray-50 px-3 text-xs text-[var(--muted)]"
                            >
                              <LockKeyhole className="h-3.5 w-3.5" />
                              Locked
                            </span>
                          )}
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
        A saved Creem mapping does not guarantee the remote
        discount is currently valid. Checkout validation
        performs an additional check.
      </p>
    </div>
  );
}