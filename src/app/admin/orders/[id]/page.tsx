import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Package,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

function money(cents: number | null, currency: string | null) {
  const code = currency || "USD";

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    });
    const decimals =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format((cents ?? 0) / 10 ** decimals);
  } catch {
    return `${code} ${((cents ?? 0) / 100).toFixed(2)}`;
  }
}

function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">
        {value ?? "—"}
      </p>
    </div>
  );
}

const card =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
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
      creem_discount_code,
      creem_discount_cents,
      creem_tax_cents,
      creem_checkout_id,
      creem_order_id,
      creem_customer_id,
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
      paid_at,
      terms_accepted_at,
      terms_version,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !order) notFound();

  const [
    { data: items, error: itemsError },
    { data: ownerships },
  ] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id,product_id,product_name,unit_price_cents,quantity,line_total_cents"
      )
      .eq("order_id", order.id),
    supabase
      .from("customer_products")
      .select("id,product_id,status,purchased_at")
      .eq("order_id", order.id),
  ]);

  if (itemsError) {
    console.error("Unable to load order items:", itemsError);
  }

  const paid =
    order.status === "paid" ||
    order.payment_status === "paid";

  const provider =
    order.payment_provider === "creem"
      ? "Creem"
      : order.payment_provider || "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Created {date(order.created_at)}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              paid
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {paid
              ? "Paid"
              : order.payment_status || order.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="flex items-center gap-3 border-b border-[var(--border-light)] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Order items</h2>
                <p className="text-sm text-[var(--muted)]">
                  Products included in this order.
                </p>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-light)]">
              {(items ?? []).map((item) => {
                const ownership = ownerships?.find(
                  (entry) => entry.product_id === item.product_id
                );

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-6 py-5"
                  >
                    <div>
                      <p className="font-medium">
                        {item.product_name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Quantity {item.quantity}
                      </p>

                      {ownership && (
                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            ownership.status === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          Access: {ownership.status}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-medium">
                        {money(
                          item.line_total_cents ??
                            item.unit_price_cents * item.quantity,
                          order.currency
                        )}
                      </p>
                      {item.product_id && (
                        <Link
                          href={`/admin/products/${item.product_id}/edit`}
                          className="mt-2 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          Open product
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 border-t border-[var(--border-light)] px-6 py-5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span>
                  {money(order.subtotal_cents, order.currency)}
                </span>
              </div>

              {Number(order.creem_discount_cents ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    Discount
                    {order.creem_discount_code
                      ? ` (${order.creem_discount_code})`
                      : ""}
                  </span>
                  <span className="text-green-700">
                    −{money(order.creem_discount_cents, order.currency)}
                  </span>
                </div>
              )}

              {Number(order.creem_tax_cents ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Tax</span>
                  <span>
                    {money(order.creem_tax_cents, order.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-[var(--border-light)] pt-3 font-semibold">
                <span>Total</span>
                <span>
                  {money(order.total_cents, order.currency)}
                </span>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Payment</h2>
                <p className="text-sm text-[var(--muted)]">
                  Payment and transaction details.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Info label="Provider" value={provider} />
              <Info
                label="Payment status"
                value={order.payment_status || order.status}
              />
              <Info
                label="Paid at"
                value={date(order.paid_at)}
              />

              {order.payment_provider === "creem" ? (
                <>
                  <Info
                    label="Creem order"
                    value={order.creem_order_id}
                  />
                  <Info
                    label="Creem checkout"
                    value={order.creem_checkout_id}
                  />
                  <Info
                    label="Creem customer"
                    value={order.creem_customer_id}
                  />
                </>
              ) : (
                <Info
                  label="Transaction reference"
                  value={order.provider_transaction_id}
                />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={card}>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="font-semibold">Customer</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Info label="Email" value={order.customer_email} />
              <Info label="Name" value={order.customer_name} />
              <Info label="User ID" value={order.user_id} />
            </div>
          </section>

          <section className={card}>
            <h2 className="font-semibold">Billing</h2>
            <div className="mt-5 space-y-4">
              <Info
                label="Country"
                value={order.billing_country}
              />
              <Info
                label="Address"
                value={
                  [
                    order.billing_address_line1,
                    order.billing_address_line2,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Info
                label="City / State"
                value={
                  [order.billing_city, order.billing_state]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Info
                label="Postal code"
                value={order.billing_postal_code}
              />
            </div>
          </section>

          <section className={card}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
              <h2 className="font-semibold">Terms acceptance</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Info
                label="Accepted at"
                value={date(order.terms_accepted_at)}
              />
              <Info
                label="Terms version"
                value={order.terms_version}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}