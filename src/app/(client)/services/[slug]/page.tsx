import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  LockKeyhole,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type ServiceDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const {
    slug,
  } = await params;

  const admin =
    createAdminClient();

  const {
    data: service,
    error,
  } = await admin
    .from("services")
    .select(`
      id,
      slug,
      name,
      short_description,
      description,
      price_cents,
      currency,
      image_url,
      active,
      created_at,
      updated_at
    `)
    .eq(
      "slug",
      slug
    )
    .eq(
      "active",
      true
    )
    .maybeSingle();

  if (
    error ||
    !service
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Services
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="aspect-[16/8] overflow-hidden border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
              {service.image_url ? (
                <img
                  src={
                    service.image_url
                  }
                  alt={
                    service.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-[var(--muted-light)]" />
                </div>
              )}
            </div>

            <div className="p-6 lg:p-8">
              <h1 className="text-2xl font-semibold text-[var(--foreground)] lg:text-3xl">
                {
                  service.name
                }
              </h1>

              {service.short_description && (
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                  {
                    service.short_description
                  }
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-6 lg:p-8">
            <h2 className="text-lg font-semibold">
              About this service
            </h2>

            {service.description ? (
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                {
                  service.description
                }
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No additional description is available for this service.
              </p>
            )}
          </section>
        </div>

        <aside>
          <div className="sticky top-6 rounded-2xl border border-[var(--border)] bg-white p-6">
            <p className="text-sm text-[var(--muted)]">
              Service price
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatMoney(
                Number(
                  service.price_cents ??
                    0
                ),
                service.currency ??
                  "USD"
              )}
            </p>

            <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">
              {
                service.currency
              }
            </p>

            <div className="my-6 border-t border-[var(--border-light)]" />

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />

                <span className="text-[var(--muted)]">
                  Secure Embernix checkout
                </span>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />

                <span className="text-[var(--muted)]">
                  Invoice generated automatically
                </span>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />

                <span className="text-[var(--muted)]">
                  Secure payment through Paddle
                </span>
              </div>
            </div>

            <Link
              href={`/checkout/service?service=${encodeURIComponent(
                service.slug
              )}`}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              Continue to checkout
            </Link>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
              <LockKeyhole className="h-3.5 w-3.5" />

              Secure payment
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}