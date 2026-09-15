import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  History,
  Package,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

function formatDate(
  value: string | null
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
  ).format(new Date(value));
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Ownership check FIRST.
   */
  const {
    data: ownership,
    error: ownershipError,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      status,
      order_id,
      purchased_at
    `)
    .eq("user_id", user.id)
    .eq("product_id", id)
    .maybeSingle();

  if (
    ownershipError ||
    !ownership
  ) {
    notFound();
  }

  /*
   * Product information.
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
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
    .eq("id", id)
    .maybeSingle();

  if (
    productError ||
    !product
  ) {
    notFound();
  }

  /*
   * Release history.
   */
  const {
    data: versions,
    error: versionsError,
  } = await supabase
    .from("product_versions")
    .select(`
      id,
      version,
      release_notes,
      is_current,
      released_at
    `)
    .eq("product_id", id)
    .order("released_at", {
      ascending: false,
    });

  if (versionsError) {
    console.error(
      "Failed to load version history:",
      versionsError
    );
  }

  /*
   * We only need to know whether a primary
   * downloadable file exists.
   *
   * We do NOT expose its storage path here.
   */
  const {
    data: productFile,
  } = await supabase
    .from("product_files")
    .select("id, file_name, file_size")
    .eq("product_id", id)
    .eq("is_primary", true)
    .maybeSingle();

  const canDownload =
    ownership.status ===
      "active" &&
    Boolean(productFile);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          My Products
        </Link>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="grid lg:grid-cols-[420px_1fr]">
          <div className="aspect-[16/10] bg-[var(--surface-secondary)] lg:aspect-auto">
            {product.image_url ? (
              <img
                src={
                  product.image_url
                }
                alt={
                  product.name
                }
                className="h-full min-h-[280px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center">
                <Package className="h-14 w-14 text-[var(--muted-light)]" />
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  ownership.status ===
                  "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {ownership.status}
              </span>

              {product.version && (
                <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                  v{product.version}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-semibold lg:text-3xl">
              {product.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {product.short_description ||
                "Your purchased Embernix product."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <CalendarDays className="h-4 w-4" />

                  <span className="text-xs">
                    Purchased
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium">
                  {formatDate(
                    ownership.purchased_at
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <History className="h-4 w-4" />

                  <span className="text-xs">
                    Current version
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium">
                  {product.version
                    ? `v${product.version}`
                    : "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-7">
              {canDownload ? (
                <a
                  href={`/products/${product.id}/download`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-5 text-sm font-medium text-gray-400"
                >
                  <Download className="h-4 w-4" />
                  Download unavailable
                </button>
              )}

              {product.documentation_url && (
                <a
                  href={
                    product.documentation_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <FileText className="h-4 w-4" />
                  Documentation
                </a>
              )}

              {product.demo_url && (
                <a
                  href={
                    product.demo_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Demo
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RELEASE HISTORY */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Release history
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Updates and changes released for this product.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!versions ||
          versions.length === 0 ? (
            <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No release history is available yet.
            </div>
          ) : (
            <div className="space-y-6">
              {versions.map(
                (release, index) => (
                  <div
                    key={release.id}
                    className={
                      index ===
                      versions.length -
                        1
                        ? ""
                        : "border-b border-[var(--border-light)] pb-6"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
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
        </div>
      </section>
    </div>
  );
}