import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import CheckoutForm from "@/components/checkout/CheckoutForm";

import { createClient } from "@/lib/supabase/server";

type CheckoutPageProps = {
  searchParams: Promise<{
    product?: string;
  }>;
};

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

  const {
    data: ownership,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      status
    `)
    .eq("user_id", user.id)
    .eq(
      "product_id",
      product.id
    )
    .eq("status", "active")
    .maybeSingle();

  if (ownership) {
    redirect(
      `/products/${product.id}`
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <Link
        href={`https://embernix.org/products/${product.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to product
      </Link>

      <div className="mb-7 mt-6">
        <h1 className="text-2xl font-semibold">
          Checkout
        </h1>
      </div>

      <CheckoutForm
        productSlug={product.slug}
        email={user.email ?? ""}
        product={product}
      />
    </div>
  );
}