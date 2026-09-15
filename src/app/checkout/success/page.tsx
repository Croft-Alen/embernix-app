import Link from "next/link";

import {
  ArrowRight,
  LoaderCircle,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import PaymentStatusWatcher from "@/components/checkout/PaymentStatusWatcher";

import { createClient } from "@/lib/supabase/server";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

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
      payment_status
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
    data: item,
  } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name
    `)
    .eq(
      "order_id",
      order.id
    )
    .limit(1)
    .maybeSingle();

  const isPaid =
    order.status === "paid" &&
    order.payment_status ===
      "paid";

  /*
   * Minimal processing screen.
   */
  if (!isPaid) {
    return (
      <>
        <PaymentStatusWatcher
          isPaid={false}
        />

        <div className="flex min-h-[70vh] items-start justify-center px-6 pt-24">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[var(--primary)]" />

            <h1 className="mt-5 text-xl font-semibold">
              Confirming payment...
            </h1>
          </div>
        </div>
      </>
    );
  }

  if (!item) {
    notFound();
  }

  return (
    <div className="flex min-h-[75vh] items-start justify-center px-6 pt-20">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
        <img
          src="https://images.emojiterra.com/google/noto-emoji/animated-emoji/1f389.gif"
          alt=""
          className="mx-auto h-20 w-20"
        />

        <h1 className="mt-5 text-2xl font-semibold">
          Payment complete
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          Yayy! You own{" "}
          <span className="font-medium text-[var(--foreground)]">
            {item.product_name}
          </span>{" "}
          now.
        </p>

        <div className="mt-6 rounded-xl bg-[var(--surface-secondary)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">
            Order number
          </p>

          <p className="mt-1 text-sm font-semibold">
            {order.order_number}
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href={`/products/${item.product_id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Open product
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}