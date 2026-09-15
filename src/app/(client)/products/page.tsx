import Link from "next/link";

import {
  Download,
  ExternalLink,
  Package,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: ownerships,
    error: ownershipError,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      product_id,
      order_id,
      status,
      purchased_at
    `)
    .eq("user_id", user.id)
    .order("purchased_at", {
      ascending: false,
    });

  if (ownershipError) {
    console.error(
      "Failed to load owned products:",
      ownershipError
    );
  }

  const ownedProducts = ownerships ?? [];

  const productIds = ownedProducts
    .map((ownership) => ownership.product_id)
    .filter(Boolean);

  const {
    data: products,
    error: productsError,
  } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            short_description,
            image_url,
            version,
            active
          `)
          .in("id", productIds)
      : {
          data: [],
          error: null,
        };

  if (productsError) {
    console.error(
      "Failed to load product details:",
      productsError
    );
  }

  const productMap = new Map(
    (products ?? []).map((product) => [
      product.id,
      product,
    ])
  );

  const items = ownedProducts
    .map((ownership) => {
      const product = productMap.get(
        ownership.product_id
      );

      if (!product) {
        return null;
      }

      return {
        ownership,
        product,
      };
    })
    .filter(
      (
        item
      ): item is NonNullable<typeof item> =>
        Boolean(item)
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">
          My Products
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage and download products you own.
        </p>
      </div>

      {/* EMPTY STATE */}
      {items.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Package className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No products yet
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Products you purchase from Embernix will
            automatically appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          {/* TABLE HEADER / TOP INFO */}
          <div className="flex items-center justify-between border-b border-[var(--border-light)] px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                Owned products
              </h2>

              <p className="mt-1 text-xs text-[var(--muted)]">
                {items.length}{" "}
                {items.length === 1
                  ? "product"
                  : "products"}
              </p>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Product
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Version
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Purchased
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  ({
                    product,
                    ownership,
                  }) => {
                    const activeOwnership =
                      ownership.status === "active";

                    return (
                      <tr
                        key={ownership.id}
                        className="border-b border-[var(--border-light)] last:border-b-0 hover:bg-[var(--surface-hover)]"
                      >
                        {/* PRODUCT */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
                              {product.image_url ? (
                                <img
                                  src={
                                    product.image_url
                                  }
                                  alt={
                                    product.name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-[var(--muted-light)]" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={`/products/${product.id}`}
                                className="block truncate text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                              >
                                {product.name}
                              </Link>

                              <p className="mt-1 max-w-[340px] truncate text-xs text-[var(--muted)]">
                                {product.short_description ||
                                  "Embernix product"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* VERSION */}
                        <td className="px-6 py-4">
                          {product.version ? (
                            <span className="inline-flex rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                              v{product.version}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--muted-light)]">
                              —
                            </span>
                          )}
                        </td>

                        {/* PURCHASE DATE */}
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">
                          {formatDate(
                            ownership.purchased_at
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              activeOwnership
                                ? "bg-green-50 text-green-700"
                                : ownership.status ===
                                    "refunded"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {ownership.status}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${product.id}`}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View
                            </Link>

                            {activeOwnership && (
                              <a
                                href={`/products/${product.id}/download`}
                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE TABLE-LIKE ROWS */}
          <div className="divide-y divide-[var(--border-light)] md:hidden">
            {items.map(
              ({
                product,
                ownership,
              }) => {
                const activeOwnership =
                  ownership.status === "active";

                return (
                  <div
                    key={ownership.id}
                    className="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
                        {product.image_url ? (
                          <img
                            src={
                              product.image_url
                            }
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-[var(--muted-light)]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="block truncate text-sm font-semibold hover:text-[var(--primary)]"
                        >
                          {product.name}
                        </Link>

                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Purchased{" "}
                          {formatDate(
                            ownership.purchased_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium capitalize ${
                          activeOwnership
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ownership.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--muted-light)]">
                          Version
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {product.version
                            ? `v${product.version}`
                            : "—"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View
                        </Link>

                        {activeOwnership && (
                          <a
                            href={`/products/${product.id}/download`}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-medium text-white"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}