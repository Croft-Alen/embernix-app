import {
  randomUUID,
} from "crypto";

import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import ProductForm from "@/components/admin/ProductForm";

import {
  createProduct,
} from "../actions";

type NewProductPageProps = {
  searchParams: Promise<{
    error?: string;
    productId?: string;
  }>;
};

function validUuid(
  value?: string
) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const query =
    await searchParams;

  const productId =
    validUuid(
      query.productId
    )
      ? query.productId!
      : randomUUID();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            Add product
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Create and configure a complete Embernix product.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      <ProductForm
        mode="create"
        action={
          createProduct
        }
        productFile={
          null
        }
        features={[]}
        gallery={[]}
        versions={[]}
        product={{
          id:
            productId,

          name: "",

          slug: "",

          short_description:
            "",

          description:
            "",

          price_cents:
            0,

          currency:
            "USD",

          version:
            null,

          image_url:
            "",

          seo_title:
            "",

          seo_description:
            "",

          demo_url:
            "",

          documentation_url:
            "",

          active:
            true,
        }}
      />
    </div>
  );
}