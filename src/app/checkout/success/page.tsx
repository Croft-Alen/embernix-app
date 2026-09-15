import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  ReceiptText,
  RefreshCw,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
    payment?: string;
  }>;
};

function formatPrice(
  cents: number,
  currency: string
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const query =
    await searchParams;

  if (!query.order) {
    redirect("/products");
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      currency,
      subtotal_cents,
      total_cents,
      paddle_invoice_number,
      paid_at
    `)
    .eq(
      "order_number",
      query.order
    )
    .eq(
      "user_id",
      user.id
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

  const productItem =
    items?.[0];

  const isPaid =
    order.status === "paid" &&
    order.payment_status === "paid";

  const totalLabel =
    formatPrice(
      order.total_cents,
      order.currency
    );

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        {/* STATUS */}
        <div className="flex flex-col items-center border-b border-[var(--border-light)] px-6 py-10 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              isPaid
                ? "bg-green-50 text-green-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Clock3 className="h-8 w-8" />
            )}
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            {isPaid
              ? "Payment complete"
              : "Confirming payment"}
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
            {isPaid
              ? "Your payment has been confirmed and your product is now available in your Embernix account."
              : "Your checkout was completed. We're waiting for Paddle's verified confirmation before unlocking your product."}
          </p>
        </div>

        <div className="p-6">
          {/* ORDER DETAILS */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-secondary)] p-4">
              <p className="text-xs text-[var(--muted)]">
                Order number
              </p>

              <p className="mt-2 text-sm font-semibold">
                {order.order_number}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--surface-secondary)] p-4">
              <p className="text-xs text-[var(--muted)]">
                Payment status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPaid
                      ? "bg-green-500"
                      : "bg-amber-500"
                  }`}
                />

                <p className="text-sm font-semibold">
                  {isPaid
                    ? "Paid"
                    : "Processing"}
                </p>
              </div>
            </div>
          </div>

          {/* ITEM */}
          {productItem && (
            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-3 border-b border-[var(--border-light)] px-4 py-3">
                <ReceiptText className="h-4 w-4 text-[var(--primary)]" />

                <p className="text-sm font-semibold">
                  Order item
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
                    <Package className="h-5 w-5 text-[var(--muted)]" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {productItem.product_name}
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Quantity {productItem.quantity}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-semibold">
                  {formatPrice(
                    productItem.line_total_cents,
                    order.currency
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TOTAL */}
          <div className="mt-6 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
            <div>
              <span className="font-semibold">
                Total
              </span>

              <p className="mt-1 text-xs uppercase text-[var(--muted)]">
                {order.currency}
              </p>
            </div>

            <span className="text-xl font-semibold">
              {totalLabel}
            </span>
          </div>

          {/* PROCESSING */}
          {!isPaid && (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Payment confirmation in progress
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Your product will unlock automatically
                after Embernix receives Paddle&apos;s
                verified payment confirmation.
              </p>

              <Link
                href={`/checkout/success?order=${encodeURIComponent(
                  order.order_number
                )}`}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-amber-900"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh status
              </Link>
            </div>
          )}

          {/* SUCCESS */}
          {isPaid && (
            <div className="mt-7 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Product access unlocked
                  </p>

                  <p className="mt-1 text-xs leading-5 text-green-700">
                    This product has been added to your
                    Embernix product library.
                  </p>

                  {order.paddle_invoice_number && (
                    <p className="mt-2 text-xs text-green-700">
                      Paddle invoice:{" "}
                      <span className="font-medium">
                        {order.paddle_invoice_number}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[var(--border-light)] pt-6">
            <Link
              href="/orders"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            >
              View order
            </Link>

            {isPaid &&
            productItem ? (
              <Link
                href={`/products/${productItem.product_id}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
              >
                Open product
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/products"
                className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-5 text-sm font-medium"
              >
                My products
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}