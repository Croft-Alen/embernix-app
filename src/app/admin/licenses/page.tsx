
import Link from "next/link";
import {
  ArrowUpRight,
  KeyRound,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateLicense } from "./actions";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    success?: string;
    error?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatStatus(status: string) {
  if (status === "renewal_required") return "Renewal required";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700";
    case "revoked":
      return "bg-red-50 text-red-700";
    case "renewal_required":
      return "bg-blue-50 text-blue-700";
    case "refunded":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getMessage(value?: string, error = false) {
  if (error) {
    switch (value) {
      case "invalid":
        return "Invalid license request.";
      case "not_found":
        return "License not found.";
      case "invalid_state":
        return "This action is not available for the current license.";
      case "update_failed":
        return "Unable to update the license.";
      default:
        return null;
    }
  }

  switch (value) {
    case "revoke":
      return "License revoked.";
    case "restore":
      return "License restored.";
    case "renew":
      return "License marked for renewal.";
    default:
      return null;
  }
}

export default async function AdminLicensesPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data: licenses, error: licensesError } = await admin
    .from("customer_products")
    .select(
      "id,user_id,product_id,order_id,status,purchased_at,created_at"
    )
    .order("created_at", { ascending: false });

  if (licensesError) {
    throw new Error("Unable to load licenses.");
  }

  const rows = licenses ?? [];

  const userIds = [...new Set(rows.map((item) => item.user_id))];
  const productIds = [...new Set(rows.map((item) => item.product_id))];

  const [profilesResult, productsResult] = await Promise.all([
    userIds.length
      ? admin
          .from("profiles")
          .select("id,full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),

    productIds.length
      ? admin
          .from("products")
          .select("id,name,slug,image_url")
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || productsResult.error) {
    throw new Error("Unable to load license details.");
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  const productMap = new Map(
    (productsResult.data ?? []).map((product) => [
      product.id,
      product,
    ])
  );

  const customerMap = new Map<
    string,
    { name: string; email: string }
  >();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);

      const customer = data.user;

      customerMap.set(userId, {
        name:
          profileMap.get(userId) ||
          customer?.user_metadata?.full_name ||
          customer?.user_metadata?.name ||
          "Unnamed customer",
        email: customer?.email || "—",
      });
    })
  );

  const search = (query.q ?? "").trim().toLowerCase();

  const filtered = rows.filter((license) => {
    if (!search) return true;

    const customer = customerMap.get(license.user_id);
    const product = productMap.get(license.product_id);

    return [
      customer?.name,
      customer?.email,
      product?.name,
      product?.slug,
      license.status,
      license.id,
    ].some((value) => value?.toLowerCase().includes(search));
  });

  const activeCount = rows.filter(
    (license) => license.status === "active"
  ).length;

  const revokedCount = rows.filter(
    (license) => license.status === "revoked"
  ).length;

  const renewalCount = rows.filter(
    (license) => license.status === "renewal_required"
  ).length;

  const refundedCount = rows.filter(
    (license) => license.status === "refunded"
  ).length;

  const successMessage = getMessage(query.success);
  const errorMessage = getMessage(query.error, true);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Licenses</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage customer access to digital products.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active",
            value: activeCount,
            icon: ShieldCheck,
            color: "text-green-600",
          },
          {
            label: "Revoked",
            value: revokedCount,
            icon: ShieldOff,
            color: "text-red-600",
          },
          {
            label: "Renewal required",
            value: renewalCount,
            icon: RotateCcw,
            color: "text-blue-600",
          },
          {
            label: "Refunded",
            value: refundedCount,
            icon: KeyRound,
            color: "text-amber-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-secondary)]">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form action="/admin/licenses" method="get">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

            <input
              name="q"
              type="search"
              defaultValue={query.q ?? ""}
              placeholder="Search customers, emails or products"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-11 pr-4 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white"
          >
            Search
          </button>

          {query.q && (
            <Link
              href="/admin/licenses"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-[var(--primary)]" />
            <h2 className="mt-4 font-semibold">
              {search ? "No matching licenses" : "No licenses yet"}
            </h2>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                <tr>
                  {[
                    "Product",
                    "Customer",
                    "Purchased",
                    "Status",
                    "Order",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-xs font-semibold text-[var(--muted)]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((license) => {
                  const customer = customerMap.get(license.user_id);
                  const product = productMap.get(license.product_id);

                  return (
                    <tr
                      key={license.id}
                      className="border-b border-[var(--border-light)] last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-[180px] items-center gap-3">
                          <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
                            {product?.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-[var(--muted)]" />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {product?.name || "Unknown product"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {product?.slug || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/customers/${license.user_id}`}
                          className="text-sm font-medium hover:text-[var(--primary)]"
                        >
                          {customer?.name || "Unknown customer"}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {customer?.email || "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--muted)]">
                        {formatDate(license.purchased_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                            license.status
                          )}`}
                        >
                          {formatStatus(license.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {license.order_id ? (
                          <Link
                            href={`/admin/orders/${license.order_id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]"
                          >
                            View
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="text-sm text-[var(--muted)]">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {license.status === "active" && (
                            <form action={updateLicense}>
                              <input
                                type="hidden"
                                name="licenseId"
                                value={license.id}
                              />
                              <input
                                type="hidden"
                                name="action"
                                value="revoke"
                              />
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700"
                              >
                                <ShieldOff className="h-4 w-4" />
                                Revoke
                              </button>
                            </form>
                          )}

                          {license.status === "revoked" && (
                            <>
                              <form action={updateLicense}>
                                <input
                                  type="hidden"
                                  name="licenseId"
                                  value={license.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="restore"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Restore
                                </button>
                              </form>

                              <form action={updateLicense}>
                                <input
                                  type="hidden"
                                  name="licenseId"
                                  value={license.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="renew"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Renew
                                </button>
                              </form>
                            </>
                          )}

                          {license.status === "renewal_required" && (
                            <>
                              <form action={updateLicense}>
                                <input
                                  type="hidden"
                                  name="licenseId"
                                  value={license.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="restore"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700"
                                >
                                  Restore
                                </button>
                              </form>

                              <form action={updateLicense}>
                                <input
                                  type="hidden"
                                  name="licenseId"
                                  value={license.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="revoke"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700"
                                >
                                  Revoke
                                </button>
                              </form>
                            </>
                          )}

                          {license.status === "refunded" && (
                            <span className="text-xs text-[var(--muted)]">
                              Unavailable
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
    </div>
  );
}
