import Link from "next/link";

import {
  ExternalLink,
  History,
  ImageIcon,
  Images,
  ListChecks,
  Package,
  Search,
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

export type ProductFormData = {
  id: string;

  name?: string | null;
  slug?: string | null;

  short_description?: string | null;
  description?: string | null;

  price_cents?: number | null;
  currency?: string | null;

  version?: string | null;
  image_url?: string | null;

  seo_title?: string | null;
  seo_description?: string | null;

  demo_url?: string | null;
  documentation_url?: string | null;

  active?: boolean | null;
};

type ProductFormProps = {
  product: ProductFormData;

  productFile?: ExistingProductFile;

  features?: ProductFeatureItem[];

  gallery?: ProductGalleryItem[];

  versions?: ProductVersionItem[];

  mode: "create" | "edit";

  action:
    | ((
        formData: FormData
      ) => void)
    | ((
        formData: FormData
      ) => Promise<void>);
};

export default function ProductForm({
  product,
  productFile = null,
  features = [],
  gallery = [],
  versions = [],
  mode,
  action,
}: ProductFormProps) {
  const isCreate =
    mode === "create";

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

      {/* GENERAL */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <h2 className="font-semibold">
            General
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Main product information used across Embernix.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium"
            >
              Product name
            </label>

            <input
              id="name"
              name="name"
              defaultValue={
                product.name ??
                ""
              }
              placeholder="Zircon Modern Paymenter Theme"
              required
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="slug"
              className="mb-2 block text-sm font-medium"
            >
              Slug
            </label>

            <input
              id="slug"
              name="slug"
              defaultValue={
                product.slug ??
                ""
              }
              placeholder="zircon-modern-paymenter-theme"
              required
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Used for the public product URL on embernix.org.
            </p>
          </div>

          <div>
            <label
              htmlFor="price"
              className="mb-2 block text-sm font-medium"
            >
              Price
            </label>

            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={(
                (product.price_cents ??
                  0) / 100
              ).toFixed(2)}
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="currency"
              className="mb-2 block text-sm font-medium"
            >
              Currency
            </label>

            <select
              id="currency"
              name="currency"
              defaultValue={
                product.currency ??
                "USD"
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm focus:border-[var(--primary)]"
            >
              <option value="USD">
                USD
              </option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4">
              <input
                type="checkbox"
                name="active"
                defaultChecked={
                  product.active ??
                  true
                }
                className="h-4 w-4"
              />

              <div>
                <span className="block text-sm font-medium">
                  Active product
                </span>

                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Controls whether the product can be shown publicly.
                </span>
              </div>
            </label>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="shortDescription"
              className="mb-2 block text-sm font-medium"
            >
              Short description
            </label>

            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              defaultValue={
                product.short_description ??
                ""
              }
              placeholder="Short summary shown on product cards and previews."
              className="w-full resize-none rounded-xl border border-[var(--border)] px-4 py-3 text-sm focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </section>

      {/* COVER */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ImageIcon className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Cover image
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Primary image used on product listings and the public product page.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl p-6">
          <ProductCoverUploader
            productId={
              product.id
            }
            productName={
              product.name ??
              "Product"
            }
            initialImageUrl={
              product.image_url
            }
          />
        </div>
      </section>

      {/* DESCRIPTION */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <h2 className="font-semibold">
            Full description
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Build the full public product description with headings, lists,
            links, and inline images.
          </p>
        </div>

        <div className="p-6">
          <ProductRichTextEditor
            productId={
              product.id
            }
            initialContent={
              product.description
            }
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ListChecks className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Features
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Highlight the main capabilities and selling points of this product.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ProductFeaturesEditor
            initialFeatures={
              features
            }
          />
        </div>
      </section>

      {/* GALLERY */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Images className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Gallery
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Screenshots and product images shown on the public product page.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ProductGalleryUploader
            productId={
              product.id
            }
            initialImages={
              gallery
            }
          />
        </div>
      </section>

      {/* PRODUCT FILE */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Product file
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Private downloadable resource delivered only to customers
                who own this product.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ProductFileUploader
            productId={
              product.id
            }
            existingFile={
              productFile
            }
          />
        </div>
      </section>

      {/* RELEASES */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Releases & version history
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Manage changelogs and choose the current product release.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ProductVersionsEditor
            initialVersions={
              versions
            }
          />

          {product.version && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
              <p className="text-xs text-[var(--muted)]">
                Currently saved product version
              </p>

              <p className="mt-1 text-sm font-semibold">
                {product.version}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* LINKS */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-[var(--primary)]" />

            <div>
              <h2 className="font-semibold">
                Product links
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Optional demo and documentation links.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="demoUrl"
              className="mb-2 block text-sm font-medium"
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
              placeholder="https://..."
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="documentationUrl"
              className="mb-2 block text-sm font-medium"
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
              placeholder="https://..."
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--primary)]" />

            <div>
              <h2 className="font-semibold">
                SEO
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Search metadata for the public product page.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6">
          <div>
            <label
              htmlFor="seoTitle"
              className="mb-2 block text-sm font-medium"
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
              placeholder={
                product.name ??
                "Product SEO title"
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="seoDescription"
              className="mb-2 block text-sm font-medium"
            >
              SEO description
            </label>

            <textarea
              id="seoDescription"
              name="seoDescription"
              maxLength={160}
              rows={3}
              defaultValue={
                product.seo_description ??
                ""
              }
              className="w-full resize-none rounded-xl border border-[var(--border)] px-4 py-3 text-sm focus:border-[var(--primary)]"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Maximum 160 characters.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL ACTIONS */}
      <div className="flex items-center justify-end gap-3 pb-8 pt-2">
        <Link
          href="/admin/products"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {isCreate
            ? "Create product"
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}