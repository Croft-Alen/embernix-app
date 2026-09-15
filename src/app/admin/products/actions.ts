"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MAX_PRODUCT_FILE_SIZE =
  50 * 1024 * 1024;

type FeaturePayload = {
  id?: string | null;
  title?: string;
  description?: string;
  sort_order?: number;
};

type GalleryPayload = {
  id?: string | null;
  image_url?: string;
  alt_text?: string;
  sort_order?: number;
  storage_path?: string | null;
  is_new?: boolean;
};

type VersionPayload = {
  id?: string | null;
  version?: string;
  release_notes?: string;
  is_current?: boolean;
  released_at?: string;
};

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } =
    await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (!admin) {
    redirect("/dashboard");
  }

  return supabase;
}

function cleanString(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function redirectError(
  path: string,
  message: string
): never {
  const separator =
    path.includes("?")
      ? "&"
      : "?";

  redirect(
    `${path}${separator}error=${encodeURIComponent(
      message
    )}`
  );
}

function parseJsonArray<T>(
  formData: FormData,
  field: string,
  errorPath: string
): T[] {
  const raw =
    cleanString(
      formData.get(field)
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      redirectError(
        errorPath,
        `Invalid ${field} data.`
      );
    }

    return parsed as T[];
  } catch {
    redirectError(
      errorPath,
      `Invalid ${field} data.`
    );
  }
}

function getFeatures(
  formData: FormData,
  errorPath: string
) {
  const raw =
    parseJsonArray<FeaturePayload>(
      formData,
      "featuresJson",
      errorPath
    );

  return raw
    .map(
      (
        feature,
        index
      ) => ({
        title: String(
          feature.title ?? ""
        ).trim(),

        description: String(
          feature.description ??
            ""
        ).trim(),

        sort_order: index,
      })
    )
    .filter((feature) => {
      if (
        !feature.title &&
        !feature.description
      ) {
        return false;
      }

      if (!feature.title) {
        redirectError(
          errorPath,
          "Every product feature must have a title."
        );
      }

      return true;
    });
}

function getGallery(
  productId: string,
  formData: FormData,
  errorPath: string
) {
  const raw =
    parseJsonArray<GalleryPayload>(
      formData,
      "galleryJson",
      errorPath
    );

  return raw
    .map(
      (
        image,
        index
      ) => ({
        image_url: String(
          image.image_url ?? ""
        ).trim(),

        alt_text:
          String(
            image.alt_text ?? ""
          ).trim() || null,

        sort_order: index,

        storage_path:
          String(
            image.storage_path ??
              ""
          ).trim() || null,
      })
    )
    .filter(
      (image) =>
        Boolean(
          image.image_url
        )
    )
    .map((image) => {
      if (
        image.storage_path &&
        !image.storage_path.startsWith(
          `${productId}/gallery/`
        )
      ) {
        redirectError(
          errorPath,
          "Invalid gallery image path."
        );
      }

      return image;
    });
}

function getVersions(
  formData: FormData,
  errorPath: string
) {
  const raw =
    parseJsonArray<VersionPayload>(
      formData,
      "versionsJson",
      errorPath
    );

  const versions = raw
    .map((release) => {
      const version =
        String(
          release.version ?? ""
        ).trim();

      const releaseNotes =
        String(
          release.release_notes ??
            ""
        ).trim();

      const releasedAt =
        String(
          release.released_at ??
            ""
        ).trim();

      return {
        version,

        release_notes:
          releaseNotes || null,

        is_current:
          Boolean(
            release.is_current
          ),

        released_at:
          releasedAt ||
          new Date().toISOString(),
      };
    })
    .filter((release) => {
      const hasAnyContent =
        Boolean(
          release.version ||
            release.release_notes
        );

      if (!hasAnyContent) {
        return false;
      }

      if (!release.version) {
        redirectError(
          errorPath,
          "Every release must have a version number."
        );
      }

      return true;
    });

  const normalized =
    versions.map(
      (release) =>
        release.version.toLowerCase()
    );

  const unique =
    new Set(normalized);

  if (
    unique.size !==
    normalized.length
  ) {
    redirectError(
      errorPath,
      "Each release version must be unique."
    );
  }

  const currentCount =
    versions.filter(
      (release) =>
        release.is_current
    ).length;

  if (currentCount > 1) {
    redirectError(
      errorPath,
      "Only one release can be marked as current."
    );
  }

  /*
   * If releases exist but none is marked current,
   * automatically make the first one current.
   */
  if (
    versions.length > 0 &&
    currentCount === 0
  ) {
    versions[0].is_current =
      true;
  }

  for (const release of versions) {
    const date =
      new Date(
        release.released_at
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      redirectError(
        errorPath,
        `Invalid release date for version ${release.version}.`
      );
    }
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
    )?.version ?? null
  );
}

function validateProduct(
  productId: string,
  formData: FormData,
  errorPath: string,
  currentVersion: string | null
) {
  const name =
    cleanString(
      formData.get("name")
    );

  const slug =
    cleanString(
      formData.get("slug")
    ).toLowerCase();

  const shortDescription =
    cleanString(
      formData.get(
        "shortDescription"
      )
    );

  const description =
    cleanString(
      formData.get(
        "description"
      )
    );

  const imageUrl =
    cleanString(
      formData.get(
        "imageUrl"
      )
    );

  const seoTitle =
    cleanString(
      formData.get(
        "seoTitle"
      )
    );

  const seoDescription =
    cleanString(
      formData.get(
        "seoDescription"
      )
    );

  const demoUrl =
    cleanString(
      formData.get(
        "demoUrl"
      )
    );

  const documentationUrl =
    cleanString(
      formData.get(
        "documentationUrl"
      )
    );

  const currency =
    cleanString(
      formData.get(
        "currency"
      )
    ).toUpperCase() ||
    "USD";

  const price =
    Number(
      cleanString(
        formData.get("price")
      )
    );

  const active =
    formData.get(
      "active"
    ) === "on";

  if (
    !productId ||
    !isUuid(productId)
  ) {
    redirectError(
      errorPath,
      "Invalid product ID."
    );
  }

  if (!name) {
    redirectError(
      errorPath,
      "Product name is required."
    );
  }

  if (!slug) {
    redirectError(
      errorPath,
      "Product slug is required."
    );
  }

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug
    )
  ) {
    redirectError(
      errorPath,
      "Slug can only contain lowercase letters, numbers, and hyphens."
    );
  }

  if (
    !Number.isFinite(
      price
    ) ||
    price < 0
  ) {
    redirectError(
      errorPath,
      "Enter a valid product price."
    );
  }

  if (
    seoDescription.length >
    160
  ) {
    redirectError(
      errorPath,
      "SEO description must be 160 characters or less."
    );
  }

  return {
    id: productId,
    name,
    slug,

    short_description:
      shortDescription ||
      null,

    description:
      description || null,

    price_cents:
      Math.round(
        price * 100
      ),

    currency,

    /*
     * products.version is now controlled
     * by the release marked as current.
     */
    version:
      currentVersion,

    image_url:
      imageUrl || null,

    seo_title:
      seoTitle || null,

    seo_description:
      seoDescription ||
      null,

    demo_url:
      demoUrl || null,

    documentation_url:
      documentationUrl ||
      null,

    active,
  };
}

function getProductFileInput(
  productId: string,
  formData: FormData,
  errorPath: string
) {
  const path =
    cleanString(
      formData.get(
        "productFilePath"
      )
    );

  const name =
    cleanString(
      formData.get(
        "productFileName"
      )
    );

  const mime =
    cleanString(
      formData.get(
        "productFileMime"
      )
    );

  const size =
    Number(
      cleanString(
        formData.get(
          "productFileSize"
        )
      ) || "0"
    );

  const changed =
    cleanString(
      formData.get(
        "productFileChanged"
      )
    ) === "true";

  const remove =
    cleanString(
      formData.get(
        "productFileRemove"
      )
    ) === "true";

  if (
    path &&
    !path.startsWith(
      `${productId}/`
    )
  ) {
    redirectError(
      errorPath,
      "Invalid product file path."
    );
  }

  if (
    path &&
    (!name ||
      !Number.isFinite(
        size
      ) ||
      size <= 0)
  ) {
    redirectError(
      errorPath,
      "Invalid product file information."
    );
  }

  if (
    size >
    MAX_PRODUCT_FILE_SIZE
  ) {
    redirectError(
      errorPath,
      "Product file must be smaller than 50 MB."
    );
  }

  return {
    path,
    name,

    mime:
      mime ||
      "application/octet-stream",

    size,
    changed,
    remove,
  };
}

type SupabaseClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

async function syncFeatures(
  supabase: SupabaseClient,
  productId: string,
  features: ReturnType<
    typeof getFeatures
  >
) {
  const {
    data: existing,
    error: readError,
  } = await supabase
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
    )
    .order(
      "sort_order"
    );

  if (readError) {
    throw readError;
  }

  const { error: deleteError } =
    await supabase
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
  } = await supabase
    .from(
      "product_features"
    )
    .insert(
      features.map(
        (feature) => ({
          product_id:
            productId,

          title:
            feature.title,

          description:
            feature.description ||
            null,

          sort_order:
            feature.sort_order,
        })
      )
    );

  if (!insertError) {
    return;
  }

  if (
    existing &&
    existing.length > 0
  ) {
    await supabase
      .from(
        "product_features"
      )
      .insert(
        existing.map(
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

async function syncGallery(
  supabase: SupabaseClient,
  productId: string,
  gallery: ReturnType<
    typeof getGallery
  >
) {
  const {
    data: existing,
    error: readError,
  } = await supabase
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
    )
    .order(
      "sort_order"
    );

  if (readError) {
    throw readError;
  }

  const submittedPaths =
    new Set(
      gallery
        .map(
          (image) =>
            image.storage_path
        )
        .filter(
          (
            path
          ): path is string =>
            Boolean(path)
        )
    );

  const pathsToRemove =
    (existing ?? [])
      .map(
        (image) =>
          image.storage_path
      )
      .filter(
        (
          path
        ): path is string =>
          Boolean(path) &&
          !submittedPaths.has(
            path
          )
      );

  const {
    error: deleteError,
  } = await supabase
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
    } = await supabase
      .from(
        "product_images"
      )
      .insert(
        gallery.map(
          (image) => ({
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

    if (insertError) {
      if (
        existing &&
        existing.length > 0
      ) {
        await supabase
          .from(
            "product_images"
          )
          .insert(
            existing.map(
              (image) => ({
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

  if (
    pathsToRemove.length >
    0
  ) {
    const {
      error:
        storageDeleteError,
    } = await supabase.storage
      .from("product-media")
      .remove(
        pathsToRemove
      );

    if (
      storageDeleteError
    ) {
      console.error(
        "Failed to remove old gallery images:",
        storageDeleteError
      );
    }
  }
}

async function syncVersions(
  supabase: SupabaseClient,
  productId: string,
  versions: ReturnType<
    typeof getVersions
  >
) {
  const {
    data: existing,
    error: readError,
  } = await supabase
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

  if (readError) {
    throw readError;
  }

  const {
    error: deleteError,
  } = await supabase
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
  } = await supabase
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
            release.release_notes,

          is_current:
            release.is_current,

          released_at:
            release.released_at,
        })
      )
    );

  if (!insertError) {
    return;
  }

  /*
   * Restore old release history if
   * replacement fails.
   */
  if (
    existing &&
    existing.length > 0
  ) {
    await supabase
      .from(
        "product_versions"
      )
      .insert(
        existing.map(
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

async function syncPrimaryFile(
  supabase: SupabaseClient,
  productId: string,
  productFile: ReturnType<
    typeof getProductFileInput
  >
) {
  const {
    data: existingFile,
    error: readError,
  } = await supabase
    .from(
      "product_files"
    )
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

  if (readError) {
    throw readError;
  }

  if (
    !productFile.changed
  ) {
    return;
  }

  if (
    productFile.remove
  ) {
    if (!existingFile) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "product_files"
        )
        .delete()
        .eq(
          "id",
          existingFile.id
        );

    if (error) {
      throw error;
    }

    const {
      error:
        storageError,
    } = await supabase.storage
      .from(
        "product-files"
      )
      .remove([
        existingFile.storage_path,
      ]);

    if (storageError) {
      console.error(
        "Unable to remove old product file:",
        storageError
      );
    }

    return;
  }

  if (
    !productFile.path
  ) {
    return;
  }

  if (existingFile) {
    const { error } =
      await supabase
        .from(
          "product_files"
        )
        .update({
          file_name:
            productFile.name,

          storage_path:
            productFile.path,

          file_size:
            productFile.size,

          mime_type:
            productFile.mime,
        })
        .eq(
          "id",
          existingFile.id
        );

    if (error) {
      await supabase.storage
        .from(
          "product-files"
        )
        .remove([
          productFile.path,
        ]);

      throw error;
    }

    if (
      existingFile.storage_path !==
      productFile.path
    ) {
      const {
        error:
          storageError,
      } = await supabase.storage
        .from(
          "product-files"
        )
        .remove([
          existingFile.storage_path,
        ]);

      if (storageError) {
        console.error(
          "Unable to remove replaced product file:",
          storageError
        );
      }
    }

    return;
  }

  const { error } =
    await supabase
      .from(
        "product_files"
      )
      .insert({
        product_id:
          productId,

        version_id:
          null,

        file_name:
          productFile.name,

        storage_path:
          productFile.path,

        file_size:
          productFile.size,

        mime_type:
          productFile.mime,

        is_primary:
          true,
      });

  if (error) {
    await supabase.storage
      .from(
        "product-files"
      )
      .remove([
        productFile.path,
      ]);

    throw error;
  }
}

export async function createProduct(
  formData: FormData
) {
  const supabase =
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

  /*
   * Parse releases first because
   * products.version comes from
   * the current release.
   */
  const versions =
    getVersions(
      formData,
      errorPath
    );

  const currentVersion =
    getCurrentVersion(
      versions
    );

  const product =
    validateProduct(
      productId,
      formData,
      errorPath,
      currentVersion
    );

  const features =
    getFeatures(
      formData,
      errorPath
    );

  const gallery =
    getGallery(
      productId,
      formData,
      errorPath
    );

  const productFile =
    getProductFileInput(
      productId,
      formData,
      errorPath
    );

  const { error } =
    await supabase
      .from("products")
      .insert(product);

  if (error) {
    redirectError(
      errorPath,
      error.message
    );
  }

  try {
    await syncFeatures(
      supabase,
      productId,
      features
    );

    await syncGallery(
      supabase,
      productId,
      gallery
    );

    await syncVersions(
      supabase,
      productId,
      versions
    );

    await syncPrimaryFile(
      supabase,
      productId,
      productFile
    );
  } catch (error) {
    await supabase
      .from("products")
      .delete()
      .eq(
        "id",
        productId
      );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to save product data.";

    redirectError(
      errorPath,
      message
    );
  }

  revalidatePath(
    "/admin/products"
  );

  redirect(
    `/admin/products/${productId}/edit?message=${encodeURIComponent(
      "Product created successfully."
    )}`
  );
}

export async function updateProduct(
  productId: string,
  formData: FormData
) {
  const supabase =
    await requireAdmin();

  const errorPath =
    `/admin/products/${productId}/edit`;

  const versions =
    getVersions(
      formData,
      errorPath
    );

  const currentVersion =
    getCurrentVersion(
      versions
    );

  const product =
    validateProduct(
      productId,
      formData,
      errorPath,
      currentVersion
    );

  const features =
    getFeatures(
      formData,
      errorPath
    );

  const gallery =
    getGallery(
      productId,
      formData,
      errorPath
    );

  const productFile =
    getProductFileInput(
      productId,
      formData,
      errorPath
    );

  const {
    id: _id,
    ...updates
  } = product;

  const {
    error: productError,
  } = await supabase
    .from("products")
    .update(updates)
    .eq(
      "id",
      productId
    );

  if (productError) {
    redirectError(
      errorPath,
      productError.message
    );
  }

  try {
    await syncFeatures(
      supabase,
      productId,
      features
    );

    await syncGallery(
      supabase,
      productId,
      gallery
    );

    await syncVersions(
      supabase,
      productId,
      versions
    );

    await syncPrimaryFile(
      supabase,
      productId,
      productFile
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save product content.";

    redirectError(
      errorPath,
      message
    );
  }

  revalidatePath(
    "/admin/products"
  );

  revalidatePath(
    `/admin/products/${productId}/edit`
  );

  redirect(
    `/admin/products/${productId}/edit?message=${encodeURIComponent(
      "Product updated successfully."
    )}`
  );
}

export async function toggleProductStatus(
  formData: FormData
) {
  const supabase =
    await requireAdmin();

  const productId =
    cleanString(
      formData.get(
        "productId"
      )
    );

  const currentStatus =
    cleanString(
      formData.get(
        "currentStatus"
      )
    ) === "true";

  if (!productId) {
    redirect(
      "/admin/products"
    );
  }

  const { error } =
    await supabase
      .from("products")
      .update({
        active:
          !currentStatus,
      })
      .eq(
        "id",
        productId
      );

  if (error) {
    redirect(
      `/admin/products?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(
    "/admin/products"
  );

  redirect(
    "/admin/products"
  );
}