
import Link from "next/link";
import {
  ArrowRight,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MarketplaceProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price_cents: number;
  currency: string;
  version: string | null;
  image_url: string | null;
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency || "USD"}`;
  }
}

export default async function MarketplacePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, short_description, price_cents, currency, version, image_url"
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as MarketplaceProduct[];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Store className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Marketplace
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Explore digital products, templates, and resources from Embernix.
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          <Package className="h-4 w-4" />
          My Products
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load marketplace products. {error.message}
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--muted)]">
            <ShoppingBag className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No products available yet
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Products published by Embernix will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Explore products
            </h2>

            <span className="text-sm text-[var(--muted)]">
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-shadow hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
              >
                <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[var(--surface-secondary)]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-[var(--muted)]" />
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  {product.version && (
                    <span className="mb-3 w-fit rounded-lg bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                      Version {product.version}
                    </span>
                  )}

                  <h3 className="line-clamp-2 text-lg font-semibold text-[var(--foreground)]">
                    {product.name}
                  </h3>

                  <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-[var(--muted)]">
                    {product.short_description ||
                      "Discover this digital product from Embernix."}
                  </p>

                  <div className="mt-auto pt-5">
                    <div className="mb-4 border-t border-[var(--border)] pt-4">
                      <p className="text-xs text-[var(--muted)]">
                        Price
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {formatPrice(product.price_cents, product.currency)}
                      </p>
                    </div>

                    <Link
                      href={`/checkout?product=${encodeURIComponent(product.slug)}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      View checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
