import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import CheckoutForm from "@/components/checkout/CheckoutForm";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type CheckoutPageProps = {
  searchParams: Promise<{
    product?: string;
    service?: string;
  }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const query =
    await searchParams;

  const productSlug =
    query.product?.trim();

  const serviceSlug =
    query.service?.trim();

  /*
   * Checkout must contain exactly one type.
   */
  if (
    (!productSlug &&
      !serviceSlug) ||
    (productSlug &&
      serviceSlug)
  ) {
    redirect("/products");
  }

  const itemType:
    | "product"
    | "service" =
    productSlug
      ? "product"
      : "service";

  const slug =
    productSlug ??
    serviceSlug!;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    const next =
      `/checkout?${itemType}=${encodeURIComponent(
        slug
      )}`;

    redirect(
      `/login?next=${encodeURIComponent(
        next
      )}`
    );
  }

  /*
   * ======================================
   * PRODUCT
   * ======================================
   */
  if (
    itemType ===
    "product"
  ) {
    const {
      data: product,
      error:
        productError,
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
      .eq(
        "slug",
        slug
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

    if (
      productError ||
      !product
    ) {
      redirect("/products");
    }

    const {
      data:
        ownership,
    } = await supabase
      .from(
        "customer_products"
      )
      .select(`
        id,
        status
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "product_id",
        product.id
      )
      .eq(
        "status",
        "active"
      )
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
          itemType="product"
          itemSlug={
            product.slug
          }
          email={
            user.email ??
            ""
          }
          item={{
            name:
              product.name,

            image_url:
              product.image_url,

            version:
              product.version,

            price_cents:
              Number(
                product.price_cents
              ),

            currency:
              product.currency,
          }}
        />
      </div>
    );
  }

  /*
   * ======================================
   * SERVICE
   * ======================================
   */

  const admin =
    createAdminClient();

  const {
    data: service,
    error:
      serviceError,
  } = await admin
    .from("services")
    .select(`
      id,
      slug,
      name,
      short_description,
      image_url,
      price_cents,
      currency,
      active
    `)
    .eq(
      "slug",
      slug
    )
    .eq(
      "active",
      true
    )
    .maybeSingle();

  if (
    serviceError ||
    !service
  ) {
    console.error(
      "Checkout service lookup failed:",
      {
        slug,
        serviceError,
      }
    );

    redirect("/services");
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <Link
        href={`/services/${service.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Back to service
      </Link>

      <div className="mb-7 mt-6">
        <h1 className="text-2xl font-semibold">
          Checkout
        </h1>
      </div>

      <CheckoutForm
        itemType="service"
        itemSlug={
          service.slug
        }
        email={
          user.email ??
          ""
        }
        item={{
          name:
            service.name,

          image_url:
            service.image_url,

          version:
            null,

          price_cents:
            Number(
              service.price_cents
            ),

          currency:
            service.currency,
        }}
      />
    </div>
  );
}