"use server";

import { randomUUID } from "crypto";

import {
  redirect,
} from "next/navigation";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  syncProductToPaddle,
} from "@/lib/paddle/catalog";

/* =========================================================
   TYPES
========================================================= */

type FeaturePayload = {
  id?: string;
  title: string;
  description: string;
  sort_order: number;
};

type GalleryPayload = {
  id?: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  storage_path?: string | null;
  is_new?: boolean;
};

type VersionPayload = {
  id?: string;
  version: string;
  release_notes: string;
  is_current: boolean;
  released_at: string;
};

type ProductFileInput = {
  changed: boolean;
  remove: boolean;

  storagePath:
    | string
    | null;

  fileName:
    | string
    | null;

  fileSize:
    | number
    | null;

  mimeType:
    | string
    | null;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanString(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function nullableString(
  value:
    | FormDataEntryValue
    | null
) {
  const cleaned =
    cleanString(value);

  return cleaned ||
    null;
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseBoolean(
  value:
    | FormDataEntryValue
    | null
) {
  const cleaned =
    cleanString(value);

  return (
    cleaned === "true" ||
    cleaned === "1" ||
    cleaned === "on"
  );
}

function parseInteger(
  value:
    | FormDataEntryValue
    | null,
  fallback = 0
) {
  const parsed =
    Number.parseInt(
      cleanString(value),
      10
    );

  if (
    Number.isNaN(parsed)
  ) {
    return fallback;
  }

  return parsed;
}

function parseJsonArray<T>(
  raw:
    | FormDataEntryValue
    | null
): T[] {
  const value =
    cleanString(raw);

  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function redirectError(
  path: string,
  message: string
): never {
  const url =
    new URL(
      path,
      "https://embernix.local"
    );

  url.searchParams.set(
    "error",
    message
  );

  redirect(
    `${url.pathname}${url.search}`
  );
}

/* =========================================================
   ADMIN AUTH
========================================================= */

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: adminUser,
  } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!adminUser) {
    redirect("/dashboard");
  }

  return {
    supabase,
    user,
  };
}

/* =========================================================
   FEATURES
========================================================= */

function getFeatures(
  formData: FormData
) {
  const raw =
    parseJsonArray<FeaturePayload>(
      formData.get(
        "featuresJson"
      )
    );

  return raw
    .map(
      (
        feature,
        index
      ) => ({
        id:
          feature.id &&
          isUuid(
            feature.id
          )
            ? feature.id
            : undefined,

        title:
          String(
            feature.title ??
              ""
          ).trim(),

        description:
          String(
            feature.description ??
              ""
          ).trim(),

        sort_order:
          Number.isFinite(
            Number(
              feature.sort_order
            )
          )
            ? Number(
                feature.sort_order
              )
            : index,
      })
    )
    .filter(
      (feature) =>
        feature.title.length >
        0
    );
}

async function syncFeatures(
  productId: string,
  features: ReturnType<
    typeof getFeatures
  >
) {
  const admin =
    createAdminClient();

  const {
    data: backup,
  } = await admin
    .from(
      "product_features"
    )
    .select(`
      title,
      description,
      sort_order
    `)
    .eq(
      "product_id",
      productId
    );

  const {
    error: deleteError,
  } = await admin
    .from(
      "product_features"
    )
    .delete()
    .eq(
      "product_id",
      productId
    );

  if (deleteError) {
    throw deleteError;
  }

  if (
    features.length === 0
  ) {
    return;
  }

  const {
    error: insertError,
  } = await admin
    .from(
      "product_features"
    )
    .insert(
      features.map(
        (
          feature,
          index
        ) => ({
          product_id:
            productId,

          title:
            feature.title,

          description:
            feature.description ||
            null,

          sort_order:
            index,
        })
      )
    );

  if (insertError) {
    if (
      backup &&
      backup.length > 0
    ) {
      await admin
        .from(
          "product_features"
        )
        .insert(
          backup.map(
            (feature) => ({
              product_id:
                productId,

              title:
                feature.title,

              description:
                feature.description,

              sort_order:
                feature.sort_order,
            })
          )
        );
    }

    throw insertError;
  }
}

/* =========================================================
   GALLERY
========================================================= */

function getGallery(
  formData: FormData
) {
  const raw =
    parseJsonArray<GalleryPayload>(
      formData.get(
        "galleryJson"
      )
    );

  return raw
    .map(
      (
        image,
        index
      ) => ({
        id:
          image.id &&
          isUuid(image.id)
            ? image.id
            : undefined,

        image_url:
          String(
            image.image_url ??
              ""
          ).trim(),

        alt_text:
          String(
            image.alt_text ??
              ""
          ).trim(),

        sort_order:
          Number.isFinite(
            Number(
              image.sort_order
            )
          )
            ? Number(
                image.sort_order
              )
            : index,

        storage_path:
          image.storage_path
            ? String(
                image.storage_path
              ).trim()
            : null,

        is_new:
          Boolean(
            image.is_new
          ),
      })
    )
    .filter(
      (image) =>
        image.image_url.length >
        0
    );
}

async function syncGallery(
  productId: string,
  gallery: ReturnType<
    typeof getGallery
  >
) {
  const admin =
    createAdminClient();

  const {
    data: existing,
    error:
      existingError,
  } = await admin
    .from(
      "product_images"
    )
    .select(`
      image_url,
      alt_text,
      sort_order,
      storage_path
    `)
    .eq(
      "product_id",
      productId
    );

  if (existingError) {
    throw existingError;
  }

  const oldPaths =
    new Set(
      (existing ?? [])
        .map(
          (image) =>
            image.storage_path
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const newPaths =
    new Set(
      gallery
        .map(
          (image) =>
            image.storage_path
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const removedPaths =
    [...oldPaths].filter(
      (path) =>
        !newPaths.has(path)
    );

  const {
    error: deleteError,
  } = await admin
    .from(
      "product_images"
    )
    .delete()
    .eq(
      "product_id",
      productId
    );

  if (deleteError) {
    throw deleteError;
  }

  if (
    gallery.length > 0
  ) {
    const {
      error: insertError,
    } = await admin
      .from(
        "product_images"
      )
      .insert(
        gallery.map(
          (
            image,
            index
          ) => ({
            product_id:
              productId,

            image_url:
              image.image_url,

            alt_text:
              image.alt_text ||
              null,

            sort_order:
              index,

            storage_path:
              image.storage_path ||
              null,
          })
        )
      );

    if (insertError) {
      /*
       * Restore database
       * snapshot if possible.
       */
      if (
        existing &&
        existing.length >
          0
      ) {
        await admin
          .from(
            "product_images"
          )
          .insert(
            existing.map(
              (
                image
              ) => ({
                product_id:
                  productId,

                image_url:
                  image.image_url,

                alt_text:
                  image.alt_text,

                sort_order:
                  image.sort_order,

                storage_path:
                  image.storage_path,
              })
            )
          );
      }

      throw insertError;
    }
  }

  /*
   * DB is synced successfully.
   * Now remove obsolete files.
   */
  if (
    removedPaths.length >
    0
  ) {
    const {
      error:
        storageError,
    } = await admin.storage
      .from(
        "product-media"
      )
      .remove(
        removedPaths
      );

    if (storageError) {
      console.error(
        "Failed to clean removed gallery images:",
        storageError
      );
    }
  }
}

/* =========================================================
   VERSIONS
========================================================= */

function getVersions(
  formData: FormData
) {
  const raw =
    parseJsonArray<VersionPayload>(
      formData.get(
        "versionsJson"
      )
    );

  const versions =
    raw
      .map(
        (
          release,
          index
        ) => ({
          id:
            release.id &&
            isUuid(
              release.id
            )
              ? release.id
              : undefined,

          version:
            String(
              release.version ??
                ""
            ).trim(),

          release_notes:
            String(
              release.release_notes ??
                ""
            ).trim(),

          is_current:
            Boolean(
              release.is_current
            ),

          released_at:
            String(
              release.released_at ??
                ""
            ).trim(),

          sort_order:
            index,
        })
      )
      .filter(
        (release) =>
          release.version.length >
          0
      );

  const seen =
    new Set<string>();

  for (
    const release of
    versions
  ) {
    const normalized =
      release.version.toLowerCase();

    if (
      seen.has(normalized)
    ) {
      throw new Error(
        `Duplicate version: ${release.version}`
      );
    }

    seen.add(normalized);

    if (
      release.released_at
    ) {
      const parsed =
        new Date(
          release.released_at
        );

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        throw new Error(
          `Invalid release date for version ${release.version}`
        );
      }
    }
  }

  const currentVersions =
    versions.filter(
      (release) =>
        release.is_current
    );

  if (
    currentVersions.length >
    1
  ) {
    throw new Error(
      "Only one release can be marked as current."
    );
  }

  if (
    versions.length > 0 &&
    currentVersions.length ===
      0
  ) {
    versions[0].is_current =
      true;
  }

  return versions;
}

function getCurrentVersion(
  versions: ReturnType<
    typeof getVersions
  >
) {
  return (
    versions.find(
      (release) =>
        release.is_current
    )?.version ??
    versions[0]?.version ??
    null
  );
}

async function syncVersions(
  productId: string,
  versions: ReturnType<
    typeof getVersions
  >
) {
  const admin =
    createAdminClient();

  const {
    data: backup,
  } = await admin
    .from(
      "product_versions"
    )
    .select(`
      version,
      release_notes,
      is_current,
      released_at
    `)
    .eq(
      "product_id",
      productId
    );

  const {
    error: deleteError,
  } = await admin
    .from(
      "product_versions"
    )
    .delete()
    .eq(
      "product_id",
      productId
    );

  if (deleteError) {
    throw deleteError;
  }

  if (
    versions.length === 0
  ) {
    return;
  }

  const {
    error: insertError,
  } = await admin
    .from(
      "product_versions"
    )
    .insert(
      versions.map(
        (release) => ({
          product_id:
            productId,

          version:
            release.version,

          release_notes:
            release.release_notes ||
            null,

          is_current:
            release.is_current,

          released_at:
            release.released_at
              ? new Date(
                  release.released_at
                ).toISOString()
              : new Date().toISOString(),
        })
      )
    );

  if (insertError) {
    if (
      backup &&
      backup.length > 0
    ) {
      await admin
        .from(
          "product_versions"
        )
        .insert(
          backup.map(
            (release) => ({
              product_id:
                productId,

              version:
                release.version,

              release_notes:
                release.release_notes,

              is_current:
                release.is_current,

              released_at:
                release.released_at,
            })
          )
        );
    }

    throw insertError;
  }
}

/* =========================================================
   PRIVATE PRODUCT FILE
========================================================= */

function getProductFileInput(
  formData: FormData
): ProductFileInput {
  const changed =
    parseBoolean(
      formData.get(
        "productFileChanged"
      )
    );

  const remove =
    parseBoolean(
      formData.get(
        "productFileRemove"
      )
    );

  const rawSize =
    cleanString(
      formData.get(
        "productFileSize"
      )
    );

  const parsedSize =
    rawSize
      ? Number(rawSize)
      : null;

  return {
    changed,
    remove,

    storagePath:
      nullableString(
        formData.get(
          "productFilePath"
        )
      ),

    fileName:
      nullableString(
        formData.get(
          "productFileName"
        )
      ),

    fileSize:
      parsedSize !==
        null &&
      Number.isFinite(
        parsedSize
      )
        ? parsedSize
        : null,

    mimeType:
      nullableString(
        formData.get(
          "productFileMime"
        )
      ),
  };
}

async function syncPrimaryFile(
  productId: string,
  input: ProductFileInput
) {
  if (!input.changed) {
    return;
  }

  const admin =
    createAdminClient();

  const {
    data: existing,
  } = await admin
    .from("product_files")
    .select(`
      id,
      storage_path
    `)
    .eq(
      "product_id",
      productId
    )
    .eq(
      "is_primary",
      true
    )
    .maybeSingle();

  /*
   * REMOVE
   */
  if (input.remove) {
    if (existing) {
      const {
        error:
          deleteError,
      } = await admin
        .from(
          "product_files"
        )
        .delete()
        .eq(
          "id",
          existing.id
        );

      if (deleteError) {
        throw deleteError;
      }

      if (
        existing.storage_path
      ) {
        await admin.storage
          .from(
            "product-files"
          )
          .remove([
            existing.storage_path,
          ]);
      }
    }

    return;
  }

  /*
   * REPLACE / CREATE
   */
  if (
    !input.storagePath ||
    !input.fileName
  ) {
    throw new Error(
      "Uploaded product file information is incomplete."
    );
  }

  const oldStoragePath =
    existing?.storage_path ??
    null;

  if (existing) {
    const {
      error: updateError,
    } = await admin
      .from("product_files")
      .update({
        file_name:
          input.fileName,

        storage_path:
          input.storagePath,

        file_size:
          input.fileSize,

        mime_type:
          input.mimeType,

        version_id: null,

        is_primary: true,
      })
      .eq(
        "id",
        existing.id
      );

    if (updateError) {
      throw updateError;
    }
  } else {
    const {
      error: insertError,
    } = await admin
      .from("product_files")
      .insert({
        product_id:
          productId,

        version_id: null,

        file_name:
          input.fileName,

        storage_path:
          input.storagePath,

        file_size:
          input.fileSize,

        mime_type:
          input.mimeType,

        is_primary: true,
      });

    if (insertError) {
      throw insertError;
    }
  }

  /*
   * New DB record succeeded.
   * Now remove replaced object.
   */
  if (
    oldStoragePath &&
    oldStoragePath !==
      input.storagePath
  ) {
    await admin.storage
      .from("product-files")
      .remove([
        oldStoragePath,
      ]);
  }
}

/* =========================================================
   PRODUCT VALIDATION
========================================================= */

function validateProduct(
  productId: string,
  formData: FormData,
  currentVersion:
    | string
    | null
) {
  const name =
    cleanString(
      formData.get("name")
    );

  const slug =
    cleanString(
      formData.get("slug")
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const shortDescription =
    nullableString(
      formData.get(
        "shortDescription"
      )
    );

  const description =
    nullableString(
      formData.get(
        "description"
      )
    );

  const imageUrl =
    nullableString(
      formData.get(
        "imageUrl"
      )
    );

  const priceCents =
    parseInteger(
      formData.get(
        "priceCents"
      )
    );

  const currency =
    cleanString(
      formData.get(
        "currency"
      )
    )
      .toUpperCase();

  const demoUrl =
    nullableString(
      formData.get(
        "demoUrl"
      )
    );

  const documentationUrl =
    nullableString(
      formData.get(
        "documentationUrl"
      )
    );

  const seoTitle =
    nullableString(
      formData.get(
        "seoTitle"
      )
    );

  const seoDescription =
    nullableString(
      formData.get(
        "seoDescription"
      )
    );

  const active =
    parseBoolean(
      formData.get(
        "active"
      )
    );

  if (!isUuid(productId)) {
    throw new Error(
      "Invalid product ID."
    );
  }

  if (
    name.length < 2
  ) {
    throw new Error(
      "Product name is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Product slug is required."
    );
  }

  if (
    priceCents < 0
  ) {
    throw new Error(
      "Product price cannot be negative."
    );
  }

  if (
    currency.length !==
    3
  ) {
    throw new Error(
      "Currency must be a 3-letter code."
    );
  }

  return {
    id: productId,

    name,
    slug,

    short_description:
      shortDescription,

    description,

    price_cents:
      priceCents,

    currency,

    version:
      currentVersion,

    image_url:
      imageUrl,

    active,

    demo_url:
      demoUrl,

    documentation_url:
      documentationUrl,

    seo_title:
      seoTitle,

    seo_description:
      seoDescription,
  };
}

/* =========================================================
   PADDLE CATALOG SYNC
========================================================= */

async function syncSavedProductWithPaddle(
  productId: string
) {
  const admin =
    createAdminClient();

  const {
    data: product,
    error,
  } = await admin
    .from("products")
    .select(`
      id,
      name,
      short_description,
      image_url,
      price_cents,
      currency,
      paddle_product_id,
      paddle_price_id
    `)
    .eq(
      "id",
      productId
    )
    .maybeSingle();

  if (
    error ||
    !product
  ) {
    throw new Error(
      "Unable to load product for Paddle sync."
    );
  }

  const result =
    await syncProductToPaddle({
      productId:
        product.id,

      name:
        product.name,

      shortDescription:
        product.short_description,

      imageUrl:
        product.image_url,

      priceCents:
        product.price_cents,

      currency:
        product.currency,

      paddleProductId:
        product.paddle_product_id,

      paddlePriceId:
        product.paddle_price_id,
    });

  const {
    error: updateError,
  } = await admin
    .from("products")
    .update({
      paddle_product_id:
        result.paddleProductId,

      paddle_price_id:
        result.paddlePriceId,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      productId
    );

  if (updateError) {
    throw new Error(
      "Paddle sync succeeded but Embernix could not save the Paddle IDs."
    );
  }
}

/* =========================================================
   CREATE PRODUCT
========================================================= */

export async function createProduct(
  formData: FormData
) {
  await requireAdmin();

  const productId =
    cleanString(
      formData.get(
        "productId"
      )
    );

  const errorPath =
    `/admin/products/new?productId=${encodeURIComponent(
      productId
    )}`;

  let versions: ReturnType<
    typeof getVersions
  >;

  try {
    versions =
      getVersions(
        formData
      );
  } catch (error) {
    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Invalid release information."
    );
  }

  const currentVersion =
    getCurrentVersion(
      versions
    );

  let product:
    | ReturnType<
        typeof validateProduct
      >
    | undefined;

  try {
    product =
      validateProduct(
        productId,
        formData,
        currentVersion
      );
  } catch (error) {
    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Invalid product information."
    );
  }

  const features =
    getFeatures(
      formData
    );

  const gallery =
    getGallery(
      formData
    );

  const productFile =
    getProductFileInput(
      formData
    );

  const admin =
    createAdminClient();

  const {
    error: productError,
  } = await admin
    .from("products")
    .insert({
      ...product,

      created_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    });

  if (productError) {
    redirectError(
      errorPath,
      productError.code ===
        "23505"
        ? "A product with this slug already exists."
        : "Unable to create product."
    );
  }

  try {
    await syncFeatures(
      productId,
      features
    );

    await syncGallery(
      productId,
      gallery
    );

    await syncVersions(
      productId,
      versions
    );

    await syncPrimaryFile(
      productId,
      productFile
    );
  } catch (error) {
    console.error(
      "Product relation sync failed:",
      error
    );

    /*
     * Creation failed before completion.
     * Remove product and related rows via
     * FK cascades.
     */
    await admin
      .from("products")
      .delete()
      .eq(
        "id",
        productId
      );

    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Unable to finish creating product."
    );
  }

  /*
   * Paddle is intentionally NOT part
   * of the destructive rollback.
   *
   * Product remains usable/admin-editable
   * even if Paddle API is temporarily down.
   */
  try {
    await syncSavedProductWithPaddle(
      productId
    );
  } catch (error) {
    console.error(
      "Paddle catalog sync failed:",
      error
    );
  }

  revalidatePath(
    "/admin/products"
  );

  revalidatePath(
    `/admin/products/${productId}/edit`
  );

  redirect(
    `/admin/products/${productId}/edit?created=1`
  );
}

/* =========================================================
   UPDATE PRODUCT
========================================================= */

export async function updateProduct(
  productId: string,
  formData: FormData
) {
  await requireAdmin();

  if (
    !isUuid(productId)
  ) {
    redirectError(
      "/admin/products",
      "Invalid product ID."
    );
  }

  const errorPath =
    `/admin/products/${productId}/edit`;

  let versions: ReturnType<
    typeof getVersions
  >;

  try {
    versions =
      getVersions(
        formData
      );
  } catch (error) {
    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Invalid release information."
    );
  }

  const currentVersion =
    getCurrentVersion(
      versions
    );

  let product:
    | ReturnType<
        typeof validateProduct
      >
    | undefined;

  try {
    product =
      validateProduct(
        productId,
        formData,
        currentVersion
      );
  } catch (error) {
    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Invalid product information."
    );
  }

  const features =
    getFeatures(
      formData
    );

  const gallery =
    getGallery(
      formData
    );

  const productFile =
    getProductFileInput(
      formData
    );

  const admin =
    createAdminClient();

  const {
    error: updateError,
  } = await admin
    .from("products")
    .update({
      name:
        product.name,

      slug:
        product.slug,

      short_description:
        product.short_description,

      description:
        product.description,

      price_cents:
        product.price_cents,

      currency:
        product.currency,

      version:
        product.version,

      image_url:
        product.image_url,

      active:
        product.active,

      demo_url:
        product.demo_url,

      documentation_url:
        product.documentation_url,

      seo_title:
        product.seo_title,

      seo_description:
        product.seo_description,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      productId
    );

  if (updateError) {
    redirectError(
      errorPath,
      updateError.code ===
        "23505"
        ? "A product with this slug already exists."
        : "Unable to save product."
    );
  }

  /*
   * Existing codebase does not currently
   * wrap all these writes in one DB
   * transaction, so sync them sequentially.
   */
  try {
    await syncFeatures(
      productId,
      features
    );

    await syncGallery(
      productId,
      gallery
    );

    await syncVersions(
      productId,
      versions
    );

    await syncPrimaryFile(
      productId,
      productFile
    );
  } catch (error) {
    console.error(
      "Product relation sync failed:",
      error
    );

    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Product was updated, but some related data could not be saved."
    );
  }

  /*
   * Sync metadata/price into Paddle.
   *
   * A Paddle failure should not destroy
   * the Embernix product edit.
   */
  try {
    await syncSavedProductWithPaddle(
      productId
    );
  } catch (error) {
    console.error(
      "Paddle catalog sync failed:",
      error
    );
  }

  revalidatePath(
    "/admin/products"
  );

  revalidatePath(
    `/admin/products/${productId}/edit`
  );

  revalidatePath(
    "/products"
  );

  redirect(
    `/admin/products/${productId}/edit?saved=1`
  );
}

/* =========================================================
   TOGGLE PRODUCT STATUS
========================================================= */

export async function toggleProductStatus(
  productId: string,
  nextStatus: boolean
) {
  await requireAdmin();

  if (
    !isUuid(productId)
  ) {
    redirect(
      "/admin/products"
    );
  }

  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from("products")
    .update({
      active:
        nextStatus,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      productId
    );

  if (error) {
    console.error(
      "Failed to update product status:",
      error
    );
  }

  revalidatePath(
    "/admin/products"
  );

  revalidatePath(
    `/admin/products/${productId}/edit`
  );

  revalidatePath(
    "/products"
  );
}