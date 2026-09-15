import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Package,
  User,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(
  cents: number | null,
  currency: string | null
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency:
        currency || "USD",
    }
  ).format(
    (cents ?? 0) /
      100
  );
}

function formatDate(
  value: string | null
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

  return date.toLocaleString(
    "en-US",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  );
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      order_number,
      status,
      payment_status,
      currency,
      subtotal_cents,
      total_cents,
      customer_email,
      customer_name,
      billing_country,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_postal_code,
      payment_provider,
      provider_transaction_id,
      paddle_transaction_id,
      paddle_customer_id,
      paddle_invoice_number,
      paid_at,
      terms_accepted_at,
      terms_version,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    orderError ||
    !order
  ) {
    notFound();
  }

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      product_name,
      unit_price_cents,
      quantity,
      line_total_cents
    `)
    .eq(
      "order_id",
      order.id
    );

  if (itemsError) {
    console.error(
      "Failed to load order items:",
      itemsError
    );
  }

  const {
    data: ownerships,
  } = await supabase
    .from(
      "customer_products"
    )
    .select(`
      id,
      product_id,
      status,
      purchased_at
    `)
    .eq(
      "order_id",
      order.id
    );

  const paid =
    order.payment_status ===
      "paid" ||
    order.status ===
      "paid";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {order.order_number}
            </h1>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Created{" "}
              {formatDate(
                order.created_at
              )}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
              paid
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {paid
              ? "Paid"
              : order.payment_status ||
                order.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* ORDER ITEMS */}
          <section className="rounded-2xl border border-[var(--border)] bg-white">
            <div className="border-b border-[var(--border-light)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Package className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Order items
                  </h2>

                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    Products included in this order.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-light)]">
              {(items ?? []).map(
                (item) => {
                  const ownership =
                    ownerships?.find(
                      (entry) =>
                        entry.product_id ===
                        item.product_id
                    );

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="flex items-center justify-between gap-4 px-6 py-5"
                    >
                      <div>
                        <p className="font-medium">
                          {
                            item.product_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Quantity{" "}
                          {
                            item.quantity
                          }
                        </p>

                        {ownership && (
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                ownership.status ===
                                "active"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              Access:{" "}
                              {
                                ownership.status
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-medium">
                          {formatMoney(
                            item.line_total_cents ??
                              item.unit_price_cents *
                                item.quantity,
                            order.currency
                          )}
                        </p>

                        <Link
                          href={`/admin/products/${item.product_id}/edit`}
                          className="mt-2 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          Open product
                        </Link>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="border-t border-[var(--border-light)] px-6 py-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    Subtotal
                  </span>

                  <span>
                    {formatMoney(
                      order.subtotal_cents,
                      order.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-base font-semibold">
                  <span>
                    Total
                  </span>

                  <span>
                    {formatMoney(
                      order.total_cents,
                      order.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* PAYMENT */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <CreditCard className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Payment
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Paddle transaction information.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Info
                label="Provider"
                value={
                  order.payment_provider ||
                  "—"
                }
              />

              <Info
                label="Payment status"
                value={
                  order.payment_status ||
                  order.status
                }
              />

              <Info
                label="Paddle transaction"
                value={
                  order.paddle_transaction_id ||
                  order.provider_transaction_id ||
                  "—"
                }
              />

              <Info
                label="Paddle customer"
                value={
                  order.paddle_customer_id ||
                  "—"
                }
              />

              <Info
                label="Invoice number"
                value={
                  order.paddle_invoice_number ||
                  "—"
                }
              />

              <Info
                label="Paid at"
                value={
                  formatDate(
                    order.paid_at
                  )
                }
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* CUSTOMER */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <User className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Customer
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Info
                label="Email"
                value={
                  order.customer_email ||
                  "—"
                }
              />

              <Info
                label="Name"
                value={
                  order.customer_name ||
                  "—"
                }
              />

              <Info
                label="User ID"
                value={
                  order.user_id
                }
              />
            </div>
          </section>

          {/* BILLING */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">
              Billing
            </h2>

            <div className="mt-5 space-y-4">
              <Info
                label="Country"
                value={
                  order.billing_country ||
                  "—"
                }
              />

              <Info
                label="Address"
                value={
                  [
                    order.billing_address_line1,
                    order.billing_address_line2,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(", ") ||
                  "—"
                }
              />

              <Info
                label="City / State"
                value={
                  [
                    order.billing_city,
                    order.billing_state,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(", ") ||
                  "—"
                }
              />

              <Info
                label="Postal code"
                value={
                  order.billing_postal_code ||
                  "—"
                }
              />
            </div>
          </section>

          {/* TERMS */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Terms acceptance
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Recorded at checkout.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Info
                label="Accepted at"
                value={
                  formatDate(
                    order.terms_accepted_at
                  )
                }
              />

              <Info
                label="Terms version"
                value={
                  order.terms_version ||
                  "—"
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-medium">
        {value}
      </p>
    </div>
  );
}