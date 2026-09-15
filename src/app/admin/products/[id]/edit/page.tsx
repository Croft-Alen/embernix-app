import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ProductForm from "@/components/admin/ProductForm";

import {
  updateProduct,
} from "../../actions";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function toDateTimeLocal(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 16);
}

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      short_description,
      description,
      price_cents,
      currency,
      version,
      image_url,
      active,
      seo_title,
      seo_description,
      demo_url,
      documentation_url
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    productError ||
    !product
  ) {
    notFound();
  }

  const [
    featuresResult,
    galleryResult,
    fileResult,
    versionsResult,
  ] = await Promise.all([
    supabase
      .from(
        "product_features"
      )
      .select(`
        id,
        title,
        description,
        sort_order
      `)
      .eq(
        "product_id",
        product.id
      )
      .order(
        "sort_order",
        {
          ascending:
            true,
        }
      ),

    supabase
      .from(
        "product_images"
      )
      .select(`
        id,
        image_url,
        alt_text,
        sort_order,
        storage_path
      `)
      .eq(
        "product_id",
        product.id
      )
      .order(
        "sort_order",
        {
          ascending:
            true,
        }
      ),

    supabase
      .from(
        "product_files"
      )
      .select(`
        id,
        file_name,
        storage_path,
        file_size,
        mime_type
      `)
      .eq(
        "product_id",
        product.id
      )
      .eq(
        "is_primary",
        true
      )
      .maybeSingle(),

    supabase
      .from(
        "product_versions"
      )
      .select(`
        id,
        version,
        release_notes,
        is_current,
        released_at
      `)
      .eq(
        "product_id",
        product.id
      )
      .order(
        "released_at",
        {
          ascending:
            false,
        }
      ),
  ]);

  if (
    featuresResult.error
  ) {
    console.error(
      "Failed to load product features:",
      featuresResult.error
    );
  }

  if (
    galleryResult.error
  ) {
    console.error(
      "Failed to load product gallery:",
      galleryResult.error
    );
  }

  if (
    fileResult.error
  ) {
    console.error(
      "Failed to load product file:",
      fileResult.error
    );
  }

  if (
    versionsResult.error
  ) {
    console.error(
      "Failed to load product versions:",
      versionsResult.error
    );
  }

  const features =
    (
      featuresResult.data ??
      []
    ).map(
      (feature) => ({
        id:
          feature.id,

        title:
          feature.title,

        description:
          feature.description ??
          "",

        sort_order:
          feature.sort_order,
      })
    );

  const gallery =
    (
      galleryResult.data ??
      []
    ).map(
      (image) => ({
        id:
          image.id,

        image_url:
          image.image_url,

        alt_text:
          image.alt_text ??
          "",

        sort_order:
          image.sort_order,

        storage_path:
          image.storage_path,

        is_new:
          false,
      })
    );

  const versions =
    (
      versionsResult.data ??
      []
    ).map(
      (release) => ({
        id:
          release.id,

        version:
          release.version,

        release_notes:
          release.release_notes ??
          "",

        is_current:
          release.is_current,

        released_at:
          toDateTimeLocal(
            release.released_at
          ),
      })
    );

  const saveProduct =
    updateProduct.bind(
      null,
      product.id
    );

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
            {product.name}
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit the complete product configuration.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      {query.message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {query.message}
        </div>
      )}

      <ProductForm
        mode="edit"
        action={
          saveProduct
        }
        product={
          product
        }
        productFile={
          fileResult.data ??
          null
        }
        features={
          features
        }
        gallery={
          gallery
        }
        versions={
          versions
        }
      />
    </div>
  );
}