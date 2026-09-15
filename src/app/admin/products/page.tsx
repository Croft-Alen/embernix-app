import Link from "next/link";

import {
  Package,
  Plus,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  toggleProductStatus,
} from "./actions";

type ProductsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: products,
    error,
  } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      name,
      short_description,
      price_cents,
      currency,
      version,
      image_url,
      active,
      paddle_product_id,
      paddle_price_id,
      created_at
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Products
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage products sold by Embernix.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add product
        </Link>
      </div>

      {params.message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {params.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load products:{" "}
          {error.message}
        </div>
      )}

      {!error &&
        products?.length ===
          0 && (
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Package className="h-6 w-6" />
              </div>

              <h2 className="mt-4 font-semibold">
                No products
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Create your first Embernix product.
              </p>
            </div>
          </div>
        )}

      {products &&
        products.length >
          0 && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Product
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Price
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Version
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-[var(--muted)]">
                      Paddle
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
                  {products.map(
                    (product) => {
                      const paddleConnected =
                        Boolean(
                          product.paddle_product_id &&
                            product.paddle_price_id
                        );

                      const toggleAction =
                        toggleProductStatus.bind(
                          null,
                          product.id,
                          !product.active
                        );

                      return (
                        <tr
                          key={
                            product.id
                          }
                          className="border-b border-[var(--border-light)] last:border-b-0"
                        >
                          {/* PRODUCT */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <img
                                  src={
                                    product.image_url
                                  }
                                  alt={
                                    product.name
                                  }
                                  className="h-11 w-11 rounded-xl border border-[var(--border)] object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)]">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                                  {
                                    product.slug
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* PRICE */}
                          <td className="px-5 py-4 text-sm">
                            {new Intl.NumberFormat(
                              "en-US",
                              {
                                style:
                                  "currency",

                                currency:
                                  product.currency ||
                                  "USD",
                              }
                            ).format(
                              product.price_cents /
                                100
                            )}
                          </td>

                          {/* VERSION */}
                          <td className="px-5 py-4 text-sm text-[var(--muted)]">
                            {product.version ||
                              "—"}
                          </td>

                          {/* PADDLE */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                paddleConnected
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {paddleConnected
                                ? "Connected"
                                : "Not connected"}
                            </span>
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                product.active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {product.active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                Edit
                              </Link>

                              <form
                                action={
                                  toggleAction
                                }
                              >
                                <button
                                  type="submit"
                                  className="h-9 rounded-xl border border-[var(--border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                                >
                                  {product.active
                                    ? "Disable"
                                    : "Enable"}
                                </button>
                              </form>
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