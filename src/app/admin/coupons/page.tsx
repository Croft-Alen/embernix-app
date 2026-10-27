
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  TicketPercent,
  Trash2,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

import { getCreemDiscountByCode } from "@/lib/creem/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  syncCoupon,
  toggleCouponStatus,
} from "./actions";
import { deleteCoupon } from "./delete-action";

export const dynamic = "force-dynamic";

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

type RemoteStatus =
  | "connected"
  | "missing"
  | "mismatch"
  | "unknown";

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
      formatter.resolvedOptions()
        .maximumFractionDigits ?? 2;

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

  return (
    !Number.isFinite(time) ||
    time <= Date.now()
  );
}

async function checkCreemStatus(
  coupon: Coupon
): Promise<RemoteStatus> {
  if (!coupon.creem_discount_id) {
    return "missing";
  }

  try {
    const remote = await getCreemDiscountByCode(
      coupon.code
    );

    if (
      remote.id !== coupon.creem_discount_id ||
      remote.code.toUpperCase() !==
        coupon.code.toUpperCase()
    ) {
      return "mismatch";
    }

    return remote.status.toLowerCase() === "active"
      ? "connected"
      : "mismatch";
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("(404)")
    ) {
      return "missing";
    }

    console.error(
      "Creem coupon verification failed:",
      coupon.code,
      error
    );

    return "unknown";
  }
}

function getStatus(
  coupon: Coupon,
  remoteStatus?: RemoteStatus
) {
  if (
    coupon.creem_discount_id &&
    remoteStatus === "missing"
  ) {
    return {
      text: "Missing in Creem",
      className: "bg-red-50 text-red-700",
      Icon: AlertTriangle,
    };
  }

  if (
    coupon.creem_discount_id &&
    remoteStatus === "mismatch"
  ) {
    return {
      text: "Creem mismatch",
      className: "bg-red-50 text-red-700",
      Icon: AlertTriangle,
    };
  }

  if (
    coupon.creem_discount_id &&
    remoteStatus === "unknown"
  ) {
    return {
      text: "Creem check failed",
      className: "bg-amber-50 text-amber-700",
      Icon: AlertTriangle,
    };
  }

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
    text: "Active",
    className: "bg-green-50 text-green-700",
    Icon: CheckCircle2,
  };
}

export default async function AdminCouponsPage({
  searchParams,
}: Props) {
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentAdmin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!currentAdmin) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id,created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  const coupons = (data ?? []) as Coupon[];

  const remoteStatuses = new Map<
    string,
    RemoteStatus
  >();

  const mappedCoupons = coupons.filter(
    (coupon) => coupon.creem_discount_id
  );

  for (
    let index = 0;
    index < mappedCoupons.length;
    index += 5
  ) {
    const batch = mappedCoupons.slice(
      index,
      index + 5
    );

    const results = await Promise.all(
      batch.map(async (coupon) => ({
        id: coupon.id,
        status: await checkCreemStatus(coupon),
      }))
    );

    for (const result of results) {
      remoteStatuses.set(
        result.id,
        result.status
      );
    }
  }

  const successMessages: Record<string, string> = {
    synced:
      "Coupon synchronized with Creem successfully.",
    enabled:
      "Coupon enabled and connected to Creem.",
    disabled:
      "Coupon disabled and its Creem mapping cleared.",
    deleted:
      "Coupon deleted from Embernix and Creem.",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Coupons
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage Embernix discounts and their Creem
            connections.
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

      {query.success &&
        successMessages[query.success] && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {successMessages[query.success]}
          </div>
        )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        Coupons are checked against Creem when you open
        this page. If a discount was removed directly in
        Creem, its status will show as missing. Use
        Delete to remove its remaining Embernix record.
        Coupons linked to active unpaid checkouts cannot
        be deleted.
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
                  const remoteStatus =
                    remoteStatuses.get(coupon.id);

                  const status = getStatus(
                    coupon,
                    remoteStatus
                  );

                  const StatusIcon = status.Icon;

                  const toggle =
                    toggleCouponStatus.bind(
                      null,
                      coupon.id,
                      !coupon.active
                    );

                  const sync = syncCoupon.bind(
                    null,
                    coupon.id
                  );

                  const remove = deleteCoupon.bind(
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
                              title={
                                coupon.creem_discount_id
                              }
                            >
                              {
                                coupon.creem_discount_id
                              }
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
                        <div className="flex items-center justify-end gap-2">
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

                          <details className="relative">
                            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </summary>

                            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[var(--border)] bg-white p-4 shadow-xl">
                              <p className="text-sm font-semibold text-[var(--foreground)]">
                                Delete {coupon.code}?
                              </p>

                              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                This removes the discount
                                from Creem and deletes the
                                coupon from Embernix.
                              </p>

                              <form
                                action={remove}
                                className="mt-4"
                              >
                                <button
                                  type="submit"
                                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Confirm delete
                                </button>
                              </form>
                            </div>
                          </details>
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
        Creem status is verified on page load.
        Temporary Creem API failures are shown separately
        and never trigger automatic deletion. Checkout
        independently verifies coupon eligibility.
      </p>
    </div>
  );
}
