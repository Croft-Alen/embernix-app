import Link from "next/link";

import {
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import CheckoutForm from "@/components/checkout/CheckoutForm";
import OrderSummary from "@/components/checkout/OrderSummary";

import { createClient } from "@/lib/supabase/server";

type CheckoutPageProps = {
  searchParams: Promise<{
    product?: string;
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

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const query =
    await searchParams;

  const slug =
    query.product?.trim();

  if (!slug) {
    redirect("/products");
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next =
      `/checkout?product=${encodeURIComponent(
        slug
      )}`;

    redirect(
      `/login?next=${encodeURIComponent(
        next
      )}`
    );
  }

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      name,
      short_description,
      image_url,
      version,
      price_cents,
      currency,
      active
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (
    productError ||
    !product
  ) {
    redirect("/products");
  }

  /*
   * Already owned?
   */
  const {
    data: ownership,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      status
    `)
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("status", "active")
    .maybeSingle();

  if (ownership) {
    redirect(
      `/products/${product.id}`
    );
  }

  const amountLabel =
    formatPrice(
      product.price_cents,
      product.currency
    );

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Link
        href={`https://embernix.org/products/${product.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to product
      </Link>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ShoppingCart className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">
              Checkout
            </h1>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Review your order and complete payment.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT */}
        <CheckoutForm
          productSlug={
            product.slug
          }
          email={
            user.email ?? ""
          }
          amountLabel={
            amountLabel
          }
        />

        {/* RIGHT */}
        <div className="lg:sticky lg:top-24">
          <OrderSummary
            product={
              product
            }
          />
        </div>
      </div>
    </div>
  );
}