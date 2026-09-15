import Link from "next/link";

import {
  ExternalLink,
  FileArchive,
  History,
  ImageIcon,
  Images,
  Link2,
  ListChecks,
  Package,
  Search,
  ShoppingBag,
} from "lucide-react";

import ProductCoverUploader from "@/components/admin/ProductCoverUploader";
import ProductFeaturesEditor, {
  type ProductFeatureItem,
} from "@/components/admin/ProductFeaturesEditor";

import ProductFileUploader, {
  type ExistingProductFile,
} from "@/components/admin/ProductFileUploader";

import ProductGalleryUploader, {
  type ProductGalleryItem,
} from "@/components/admin/ProductGalleryUploader";

import ProductRichTextEditor from "@/components/admin/ProductRichTextEditor";

import ProductVersionsEditor, {
  type ProductVersionItem,
} from "@/components/admin/ProductVersionsEditor";

/* =========================================================
   TYPES
========================================================= */

export type ProductFormData = {
  id: string;

  name: string;

  slug: string;

  short_description:
    | string
    | null;

  description:
    | string
    | null;

  price_cents: number;

  currency: string;

  version:
    | string
    | null;

  image_url:
    | string
    | null;

  active: boolean;

  demo_url:
    | string
    | null;

  documentation_url:
    | string
    | null;

  seo_title:
    | string
    | null;

  seo_description:
    | string
    | null;

  paddle_product_id:
    | string
    | null;

  paddle_price_id:
    | string
    | null;
};

type ProductFormProps = {
  product: ProductFormData;

  productFile?:
    | ExistingProductFile
    | null;

  features?: ProductFeatureItem[];

  gallery?: ProductGalleryItem[];

  versions?: ProductVersionItem[];

  mode:
    | "create"
    | "edit";

  action:
    | ((formData: FormData) => void)
    | ((formData: FormData) => Promise<void>);
};

/* =========================================================
   STYLES
========================================================= */

const sectionClass =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

const textareaClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]";

const labelClass =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const helperClass =
  "mt-2 text-xs leading-5 text-[var(--muted)]";

/* =========================================================
   COMPONENT
========================================================= */

export default function ProductForm({
  product,
  productFile = null,
  features = [],
  gallery = [],
  versions = [],
  mode,
  action,
}: ProductFormProps) {
  const isEdit =
    mode === "edit";

  const paddleConnected =
    Boolean(
      product.paddle_product_id &&
        product.paddle_price_id
    );

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="productId"
        value={product.id}
      />

      {/* ===================================================
          GENERAL
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Package className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              General
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Main product information and pricing.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className={labelClass}
            >
              Product name
            </label>

            <input
              id="name"
              name="name"
              defaultValue={
                product.name
              }
              placeholder="Zircon Modern Paymenter Theme"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className={labelClass}
            >
              Slug
            </label>

            <input
              id="slug"
              name="slug"
              defaultValue={
                product.slug
              }
              placeholder="zircon-modern-paymenter-theme"
              className={inputClass}
              required
            />

            <p className={helperClass}>
              Used by the public product URL.
            </p>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="shortDescription"
              className={labelClass}
            >
              Short description
            </label>

            <textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={
                product.short_description ??
                ""
              }
              rows={3}
              placeholder="Short product summary shown in listings and checkout."
              className={textareaClass}
            />
          </div>

          <div>
            <label
              htmlFor="priceCents"
              className={labelClass}
            >
              Price in cents
            </label>

            <input
              id="priceCents"
              name="priceCents"
              type="number"
              min="0"
              step="1"
              defaultValue={
                product.price_cents
              }
              className={inputClass}
              required
            />

            <p className={helperClass}>
              Example: $12.00 = 1200.
            </p>
          </div>

          <div>
            <label
              htmlFor="currency"
              className={labelClass}
            >
              Currency
            </label>

            <input
              id="currency"
              name="currency"
              defaultValue={
                product.currency ||
                "USD"
              }
              maxLength={3}
              className={inputClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked={
                  product.active
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />

              <span>
                <span className="block text-sm font-medium">
                  Active product
                </span>

                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Active products can appear publicly and be purchased.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* ===================================================
          COVER
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ImageIcon className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Cover image
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Main product image used across Embernix.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductCoverUploader
            productId={product.id}
            initialImageUrl={
              product.image_url
            }
          />
        </div>
      </section>

      {/* ===================================================
          DESCRIPTION
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <FileArchive className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Full description
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Rich content shown on the public product page.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductRichTextEditor
            productId={product.id}
            initialValue={
              product.description ??
              ""
            }
          />
        </div>
      </section>

      {/* ===================================================
          FEATURES
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ListChecks className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Features
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Highlight what customers get with this product.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductFeaturesEditor
            initialFeatures={
              features
            }
          />
        </div>
      </section>

      {/* ===================================================
          GALLERY
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Images className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Gallery
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Screenshots and visual previews for the public product page.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductGalleryUploader
            productId={product.id}
            initialImages={
              gallery
            }
          />
        </div>
      </section>

      {/* ===================================================
          PRODUCT FILE
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <FileArchive className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Private product file
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              File customers receive after purchase.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductFileUploader
            productId={product.id}
            existingFile={
              productFile
            }
          />
        </div>
      </section>

      {/* ===================================================
          RELEASES
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <History className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Releases & version history
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Manage versions and choose the current release.
            </p>
          </div>
        </div>

        {product.version && (
          <div className="mt-5 rounded-xl bg-[var(--surface-secondary)] px-4 py-3">
            <p className="text-xs text-[var(--muted)]">
              Currently saved product version
            </p>

            <p className="mt-1 text-sm font-semibold">
              v{product.version}
            </p>
          </div>
        )}

        <div className="mt-6">
          <ProductVersionsEditor
            initialVersions={
              versions
            }
          />
        </div>
      </section>

      {/* ===================================================
          LINKS
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Link2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Links
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional demo and documentation links.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="demoUrl"
              className={labelClass}
            >
              Demo URL
            </label>

            <input
              id="demoUrl"
              name="demoUrl"
              type="url"
              defaultValue={
                product.demo_url ??
                ""
              }
              placeholder="https://demo.example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="documentationUrl"
              className={labelClass}
            >
              Documentation URL
            </label>

            <input
              id="documentationUrl"
              name="documentationUrl"
              type="url"
              defaultValue={
                product.documentation_url ??
                ""
              }
              placeholder="https://docs.example.com"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ===================================================
          PADDLE
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Paddle
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Paddle catalog product and pricing are synchronized automatically.
              </p>
            </div>
          </div>

          {paddleConnected ? (
            <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Connected
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Not connected
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">
              Paddle Product ID
            </p>

            <div className="mt-2 min-h-11 break-all rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm">
              {product.paddle_product_id ??
                "Created automatically when saved"}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--muted)]">
              Paddle Price ID
            </p>

            <div className="mt-2 min-h-11 break-all rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm">
              {product.paddle_price_id ??
                "Created automatically when saved"}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Changing the product price automatically creates a new Paddle price and switches Embernix to it.
        </p>
      </section>

      {/* ===================================================
          SEO
      =================================================== */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Search className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              SEO
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional search metadata for the public product page.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="seoTitle"
              className={labelClass}
            >
              SEO title
            </label>

            <input
              id="seoTitle"
              name="seoTitle"
              defaultValue={
                product.seo_title ??
                ""
              }
              className={inputClass}
              placeholder={product.name}
            />
          </div>

          <div>
            <label
              htmlFor="seoDescription"
              className={labelClass}
            >
              SEO description
            </label>

            <textarea
              id="seoDescription"
              name="seoDescription"
              defaultValue={
                product.seo_description ??
                ""
              }
              rows={3}
              className={textareaClass}
              placeholder="Search description for this product."
            />
          </div>
        </div>
      </section>

      {/* ===================================================
          ACTIONS
      =================================================== */}
      <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
        <Link
          href="/admin/products"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </Link>

        {isEdit && product.slug && (
          <a
            href={`https://embernix.org/products/${product.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            View product
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {mode === "create"
            ? "Create product"
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}