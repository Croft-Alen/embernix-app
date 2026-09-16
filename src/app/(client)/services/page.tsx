import Link from "next/link";

import {
  ArrowRight,
  ImageIcon,
  Wrench,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

function formatMoney(
  cents: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency:
          currency || "USD",
      }
    ).format(
      cents / 100
    );
  } catch {
    return `${currency || "USD"} ${(
      cents / 100
    ).toFixed(2)}`;
  }
}

export default async function ServicesPage() {
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
      sort_order
    `)
    .eq(
      "active",
      true
    )
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
    console.error(
      "Failed to load services:",
      error
    );

    return (
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load services.
        </div>
      </div>
    );
  }

  const rows =
    services ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Services
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Explore professional services available from Embernix.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Wrench className="h-6 w-6" />
            </div>

            <h2 className="mt-4 font-semibold">
              No services available
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              New services will appear here when they become available.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(
            (service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-white transition-colors hover:border-[var(--primary)]"
              >
                <div className="aspect-[16/9] overflow-hidden border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-[var(--muted-light)]" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[var(--foreground)]">
                        {service.name}
                      </h2>

                      {service.short_description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                          {
                            service.short_description
                          }
                        </p>
                      )}
                    </div>

                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)] transition-colors group-hover:text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--border-light)] pt-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Starting at
                      </p>

                      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                        {formatMoney(
                          Number(
                            service.price_cents ??
                              0
                          ),
                          service.currency ??
                            "USD"
                        )}
                      </p>
                    </div>

                    <span className="text-sm font-medium text-[var(--primary)]">
                      View service
                    </span>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}