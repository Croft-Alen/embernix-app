import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  History,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      ownership,
    error:
      ownershipError,
  } = await supabase
    .from(
      "customer_products"
    )
    .select(`
      id,
      status,
      order_id,
      purchased_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "product_id",
      id
    )
    .maybeSingle();

  if (
    ownershipError ||
    !ownership
  ) {
    notFound();
  }

  const {
    data:
      product,
    error:
      productError,
  } = await supabase
    .from(
      "products"
    )
    .select(`
      id,
      name,
      slug,
      short_description,
      image_url,
      version,
      demo_url,
      documentation_url
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    productError ||
    !product
  ) {
    notFound();
  }

  const {
    data:
      versions,
    error:
      versionsError,
  } = await supabase
    .from(
      "product_versions"
    )
    .select(`
      id,
      version,
      release_notes,
      is_current,
      released_at
    `)
    .eq(
      "product_id",
      id
    )
    .order(
      "released_at",
      {
        ascending:
          false,
      }
    );

  if (
    versionsError
  ) {
    console.error(
      "Failed to load version history:",
      versionsError
    );
  }

  const {
    data:
      productFile,
  } = await supabase
    .from(
      "product_files"
    )
    .select(
      "id, file_name, file_size"
    )
    .eq(
      "product_id",
      id
    )
    .eq(
      "is_primary",
      true
    )
    .maybeSingle();

  const canDownload =
    ownership.status ===
      "active" &&
    Boolean(
      productFile
    );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        My Products
      </Link>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            query.error
          }
        </div>
      )}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                  ownership.status ===
                  "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {
                  ownership.status
                }
              </span>

              {product.version && (
                <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                  v
                  {
                    product.version
                  }
                </span>
              )}
            </div>

            <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[30px]">
              {
                product.name
              }
            </h1>

            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--muted)]">
              {product.short_description ||
                "Your purchased Embernix product."}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canDownload ? (
              <a
                href={`/products/${product.id}/download`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-400"
              >
                <Download className="h-4 w-4" />
                Unavailable
              </button>
            )}

            {product.documentation_url && (
              <a
                href={
                  product.documentation_url
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Documentation"
                title="Documentation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}

            {product.demo_url && (
              <a
                href={
                  product.demo_url
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Demo"
                title="Demo"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-px overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
          <InfoBlock
            icon={
              CalendarDays
            }
            label="Purchased"
            value={formatDate(
              ownership.purchased_at
            )}
          />

          <InfoBlock
            icon={
              History
            }
            label="Current version"
            value={
              product.version
                ? `v${product.version}`
                : "Not specified"
            }
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <h2 className="text-base font-semibold">
            Release history
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
            Updates and changes released for this product.
          </p>
        </div>

        {!versions ||
        versions.length ===
          0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--muted)] sm:px-7">
            No release history is available yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {versions.map(
              (
                release
              ) => (
                <div
                  key={
                    release.id
                  }
                  className="px-5 py-5 sm:px-7"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold">
                      v
                      {
                        release.version
                      }
                    </h3>

                    {release.is_current && (
                      <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                        Current
                      </span>
                    )}

                    <span className="text-xs text-[var(--muted)]">
                      {formatDate(
                        release.released_at
                      )}
                    </span>
                  </div>

                  {release.release_notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                      {
                        release.release_notes
                      }
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted-light)]">
                      No release notes provided.
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="h-4 w-4" />

        <p className="text-xs font-medium">
          {
            label
          }
        </p>
      </div>

      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
        {
          value
        }
      </p>
    </div>
  );
}