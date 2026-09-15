import Link from "next/link";

import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Wrench,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  toggleServiceActive,
} from "./actions";

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

export default async function AdminServicesPage() {
  const admin =
    createAdminClient();

  const {
    data: services,
    error,
  } = await admin
    .from("services")
    .select(`
      id,
      slug,
      name,
      short_description,
      price_cents,
      currency,
      image_url,
      active,
      sort_order,
      created_at,
      updated_at
    `)
    .order(
      "sort_order",
      {
        ascending: true,
      }
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load services:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const rows =
    services ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Services
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage the Embernix service catalog.
          </p>
        </div>

        <Link
          href="/admin/services/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus className="h-4 w-4" />

          Create service
        </Link>
      </div>

      {rows.length ===
      0 ? (
        <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Wrench className="h-6 w-6" />
            </div>

            <h2 className="mt-4 font-semibold">
              No services
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Create your first Embernix service.
            </p>

            <Link
              href="/admin/services/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />

              Create service
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
                    Service
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Price
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Sort
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                    Updated
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--muted)]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    service
                  ) => {
                    const toggleAction =
                      toggleServiceActive.bind(
                        null,
                        service.id,
                        !service.active
                      );

                    return (
                      <tr
                        key={
                          service.id
                        }
                        className="border-b border-[var(--border-light)] last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {service.image_url ? (
                              <img
                                src={
                                  service.image_url
                                }
                                alt=""
                                className="h-11 w-11 rounded-xl border border-[var(--border-light)] object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                                <Wrench className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {
                                  service.name
                                }
                              </p>

                              <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                                /
                                {
                                  service.slug
                                }
                              </p>

                              {service.short_description && (
                                <p className="mt-1 max-w-md truncate text-xs text-[var(--muted)]">
                                  {
                                    service.short_description
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold">
                          {formatMoney(
                            Number(
                              service.price_cents ??
                                0
                            ),
                            service.currency ??
                              "USD"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              service.active
                                ? "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                                : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                            }
                          >
                            {service.active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--muted)]">
                          {
                            service.sort_order
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--muted)]">
                          {formatDate(
                            service.updated_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <form
                              action={
                                toggleAction
                              }
                            >
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                {service.active ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Enable
                                  </>
                                )}
                              </button>
                            </form>

                            <Link
                              href={`/admin/services/${service.id}/edit`}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <Pencil className="h-4 w-4" />

                              Edit
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