import Link from "next/link";

import {
  Download,
  Eye,
  Package,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

function statusClass(
  status: string
) {
  if (
    status ===
    "active"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    status ===
    "refunded"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-gray-100 text-gray-600";
}

export default async function ProductsPage() {
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
      ownerships,
    error:
      ownershipError,
  } = await supabase
    .from(
      "customer_products"
    )
    .select(`
      id,
      product_id,
      order_id,
      status,
      purchased_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "purchased_at",
      {
        ascending:
          false,
      }
    );

  if (
    ownershipError
  ) {
    console.error(
      "Failed to load owned products:",
      ownershipError
    );
  }

  const ownedProducts =
    ownerships ??
    [];

  const productIds =
    ownedProducts
      .map(
        (
          ownership
        ) =>
          ownership.product_id
      )
      .filter(
        Boolean
      );

  const {
    data:
      products,
    error:
      productsError,
  } =
    productIds.length >
    0
      ? await supabase
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
            active
          `)
          .in(
            "id",
            productIds
          )
      : {
          data: [],
          error: null,
        };

  if (
    productsError
  ) {
    console.error(
      "Failed to load product details:",
      productsError
    );
  }

  const productMap =
    new Map(
      (
        products ??
        []
      ).map(
        (
          product
        ) => [
          product.id,
          product,
        ]
      )
    );

  const items =
    ownedProducts
      .map(
        (
          ownership
        ) => {
          const product =
            productMap.get(
              ownership.product_id
            );

          if (
            !product
          ) {
            return null;
          }

          return {
            ownership,
            product,
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          Boolean(
            item
          )
      );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[27px]">
          My Products
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
          Manage and download products you own.
        </p>
      </section>

      {items.length ===
      0 ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5">
          <div className="max-w-sm text-center">
            <Package className="mx-auto h-7 w-7 text-[var(--primary)]" />

            <h2 className="mt-4 text-base font-semibold">
              No products yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Products you purchase from Embernix
              will appear here.
            </p>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Owned products
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {
                items.length
              }{" "}
              {items.length ===
              1
                ? "product"
                : "products"}
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[minmax(220px,1.6fr)_110px_150px_110px_100px] items-center border-b border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-3">
              <TableHeading>
                Product
              </TableHeading>

              <TableHeading>
                Version
              </TableHeading>

              <TableHeading>
                Purchased
              </TableHeading>

              <TableHeading>
                Status
              </TableHeading>

              <TableHeading right>
                Actions
              </TableHeading>
            </div>

            <div>
              {items.map(
                ({
                  product,
                  ownership,
                }) => {
                  const activeOwnership =
                    ownership.status ===
                    "active";

                  return (
                    <div
                      key={
                        ownership.id
                      }
                      className="grid grid-cols-[minmax(220px,1.6fr)_110px_150px_110px_100px] items-center border-b border-[var(--border-light)] px-6 py-4 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
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
                              <Package className="h-4 w-4 text-[var(--muted-light)]" />
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/products/${product.id}`}
                          className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]"
                        >
                          {
                            product.name
                          }
                        </Link>
                      </div>

                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {product.version
                          ? `v${product.version}`
                          : "—"}
                      </div>

                      <div className="text-sm text-[var(--muted)]">
                        {formatDate(
                          ownership.purchased_at
                        )}
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                            ownership.status
                          )}`}
                        >
                          {
                            ownership.status
                          }
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/products/${product.id}`}
                          aria-label={`View ${product.name}`}
                          title="View product"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {activeOwnership && (
                          <a
                            href={`/products/${product.id}/download`}
                            aria-label={`Download ${product.name}`}
                            title="Download"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--primary)]"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-[var(--border-light)] md:hidden">
            {items.map(
              ({
                product,
                ownership,
              }) => {
                const activeOwnership =
                  ownership.status ===
                  "active";

                return (
                  <div
                    key={
                      ownership.id
                    }
                    className="p-4 sm:p-5"
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
                            <Package className="h-4 w-4 text-[var(--muted-light)]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="block truncate text-sm font-semibold text-[var(--foreground)]"
                        >
                          {
                            product.name
                          }
                        </Link>

                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatDate(
                            ownership.purchased_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium capitalize ${statusClass(
                          ownership.status
                        )}`}
                      >
                        {
                          ownership.status
                        }
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-medium text-[var(--muted)]">
                          Version
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {product.version
                            ? `v${product.version}`
                            : "—"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/products/${product.id}`}
                          aria-label="View product"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {activeOwnership && (
                          <a
                            href={`/products/${product.id}/download`}
                            aria-label="Download product"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--primary)]"
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
        </section>
      )}
    </div>
  );
}

function TableHeading({
  children,
  right = false,
}: {
  children:
    React.ReactNode;
  right?: boolean;
}) {
  return (
    <div
      className={`text-xs font-semibold text-[var(--muted)] ${
        right
          ? "text-right"
          : ""
      }`}
    >
      {
        children
      }
    </div>
  );
}