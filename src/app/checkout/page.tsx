
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import CheckoutForm from "@/components/checkout/CheckoutForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CheckoutPageProps = {
  searchParams: Promise<{
    product?: string;
  }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const query = await searchParams;
  const productSlug = query.product?.trim();

  if (!productSlug) {
    redirect("/products");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/checkout?product=${encodeURIComponent(
      productSlug
    )}`;

    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const admin = createAdminClient();

  const {
    data: product,
    error: productError,
  } = await admin
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
    .eq("slug", productSlug)
    .eq("active", true)
    .maybeSingle();

  if (productError) {
    console.error(
      "Product checkout lookup failed:",
      productError
    );

    throw new Error("Unable to load product information.");
  }

  if (!product) {
    redirect("/products");
  }

  const {
    data: ownership,
    error: ownershipError,
  } = await admin
    .from("customer_products")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  if (ownershipError) {
    console.error(
      "Product ownership lookup failed:",
      ownershipError
    );

    throw new Error("Unable to verify product ownership.");
  }

  if (ownership?.status === "active") {
    redirect(`/products/${product.id}`);
  }

  const renewalRequired =
    ownership?.status === "renewal_required";

  if (
    ownership &&
    !renewalRequired
  ) {
    redirect(`/products/${product.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <Link
        href={`https://embernix.org/products/${encodeURIComponent(
          product.slug
        )}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to product
      </Link>

      <div className="mb-7 mt-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          {renewalRequired ? "Renew License" : "Checkout"}
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {renewalRequired
            ? "Complete payment to reactivate access to your digital product."
            : "Review your digital product and complete your purchase."}
        </p>
      </div>

      <CheckoutForm
        itemSlug={product.slug}
        email={user.email ?? ""}
        item={{
          name: product.name,
          image_url: product.image_url,
          version: product.version,
          price_cents: Number(product.price_cents),
          currency: product.currency,
        }}
      />
    </div>
  );
}
