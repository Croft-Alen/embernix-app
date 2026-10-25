
import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import PaymentStatusWatcher from "@/components/checkout/PaymentStatusWatcher";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { order: orderNumber } = await searchParams;

  if (
    !orderNumber ||
    !/^EMB-\d{8}-[A-Z0-9]{8,12}$/.test(orderNumber)
  ) {
    redirect("/products");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/checkout/success?order=${orderNumber}`
      )}`
    );
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,payment_status"
    )
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    console.error("Checkout status lookup:", orderError);
    throw new Error("Unable to load purchase status.");
  }

  if (!order) {
    notFound();
  }

  const {
    data: items,
    error: itemError,
  } = await supabase
    .from("order_items")
    .select("item_type,product_id,product_name")
    .eq("order_id", order.id);

  if (itemError) {
    console.error("Order item lookup:", itemError);
    throw new Error("Unable to load purchased item.");
  }

  if (
    !items ||
    items.length !== 1 ||
    items[0].item_type !== "product" ||
    !items[0].product_id
  ) {
    notFound();
  }

  const item = items[0];

  const paid =
    order.status === "paid" &&
    order.payment_status === "paid";

  const pending =
    order.status === "pending" &&
    order.payment_status === "unpaid";

  if (pending) {
    return (
      <>
        <PaymentStatusWatcher isPaid={false} />

        <main className="flex min-h-[75vh] items-start justify-center px-5 pt-20">
          <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Clock3 className="h-8 w-8" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">
              Waiting for payment confirmation
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Your payment has not yet been confirmed.
              If you completed checkout, the payment
              notification may still be processing.
            </p>

            <div className="mt-6 rounded-xl bg-[var(--surface-secondary)] p-4">
              <p className="text-xs text-[var(--muted)]">
                Order reference
              </p>
              <p className="mt-1 break-all text-sm font-semibold">
                {order.order_number}
              </p>
            </div>

            <p className="mt-5 text-xs text-[var(--muted)]">
              This page checks for payment confirmation
              automatically.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
            >
              Go to My Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </main>
      </>
    );
  }

  if (!paid) {
    return (
      <main className="flex min-h-[75vh] items-start justify-center px-5 pt-20">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
            <Package className="h-8 w-8 text-[var(--muted)]" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold">
            Payment not completed
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            This order is not marked as paid.
            No new product access has been granted.
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white"
          >
            Back to products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    );
  }

  // Even a paid order must have an active
  // entitlement before the download link is offered.
  const {
    data: ownership,
    error: ownershipError,
  } = await supabase
    .from("customer_products")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", item.product_id)
    .eq("status", "active")
    .maybeSingle();

  if (ownershipError) {
    throw new Error("Unable to verify purchased product.");
  }

  if (!ownership) {
    return (
      <main className="flex min-h-[75vh] items-start justify-center px-5 pt-20">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-xl font-semibold">
            Payment received
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            Your payment is confirmed, but product access
            is not active yet. Please contact support if
            this persists.
          </p>

          <Link
            href="/tickets/new"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white"
          >
            Contact support
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[75vh] items-start justify-center px-5 pt-20">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">
          Payment complete
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Your purchase of{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {item.product_name}
          </span>{" "}
          is confirmed. Your digital product is ready.
        </p>

        <div className="mt-6 rounded-xl bg-[var(--surface-secondary)] px-4 py-4">
          <p className="text-xs text-[var(--muted)]">
            Order number
          </p>

          <p className="mt-1 break-all text-sm font-semibold">
            {order.order_number}
          </p>
        </div>

        <Link
          href={`/products/${item.product_id}`}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          Open purchased product
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/products"
          className="mt-4 block text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          View My Products
        </Link>
      </section>
    </main>
  );
}
