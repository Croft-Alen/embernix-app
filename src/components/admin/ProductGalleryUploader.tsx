"use client";

import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

export type ProductGalleryItem = {
  id?: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  storage_path?: string | null;
  is_new?: boolean;
};

type ProductGalleryUploaderProps = {
  productId: string;
  initialImages?: ProductGalleryItem[];
};

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

function getExtension(
  type: string
) {
  if (type === "image/png")
    return "png";

  if (type === "image/webp")
    return "webp";

  if (type === "image/gif")
    return "gif";

  return "jpg";
}

export default function ProductGalleryUploader({
  productId,
  initialImages = [],
}: ProductGalleryUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [images, setImages] =
    useState<ProductGalleryItem[]>(
      initialImages
    );

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  async function uploadImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ?? []
      );

    if (
      selected.length === 0
    ) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase =
        createClient();

      const uploaded: ProductGalleryItem[] =
        [];

      for (const file of selected) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ];

        if (
          !allowedTypes.includes(
            file.type
          )
        ) {
          throw new Error(
            `${file.name}: unsupported image type.`
          );
        }

        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {
          throw new Error(
            `${file.name}: image must be smaller than 10 MB.`
          );
        }

        const extension =
          getExtension(
            file.type
          );

        const path =
          `${productId}/gallery/` +
          `${crypto.randomUUID()}.${extension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "product-media"
          )
          .upload(
            path,
            file,
            {
              upsert: false,
              contentType:
                file.type,
              cacheControl:
                "3600",
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from(
            "product-media"
          )
          .getPublicUrl(path);

        uploaded.push({
          image_url:
            publicUrl,

          alt_text:
            file.name.replace(
              /\.[^/.]+$/,
              ""
            ),

          sort_order:
            images.length +
            uploaded.length,

          storage_path:
            path,

          is_new: true,
        });
      }

      setImages(
        (current) => [
          ...current,
          ...uploaded,
        ]
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gallery upload failed."
      );
    } finally {
      setUploading(false);

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }
    }
  }

  async function removeImage(
    index: number
  ) {
    const item =
      images[index];

    /*
     * If image was uploaded during this
     * unsaved editing session, remove it
     * from Storage immediately.
     *
     * Existing database image cleanup can
     * later be handled by the product save
     * action when comparing submitted data.
     */
    if (
      item.is_new &&
      item.storage_path
    ) {
      const supabase =
        createClient();

      await supabase.storage
        .from(
          "product-media"
        )
        .remove([
          item.storage_path,
        ]);
    }

    setImages(
      (current) =>
        current
          .filter(
            (_, itemIndex) =>
              itemIndex !==
              index
          )
          .map(
            (
              image,
              itemIndex
            ) => ({
              ...image,
              sort_order:
                itemIndex,
            })
          )
    );
  }

  function moveImage(
    index: number,
    direction:
      | "up"
      | "down"
  ) {
    setImages(
      (current) => {
        const next = [
          ...current,
        ];

        const target =
          direction === "up"
            ? index - 1
            : index + 1;

        if (
          target < 0 ||
          target >=
            next.length
        ) {
          return current;
        }

        [
          next[index],
          next[target],
        ] = [
          next[target],
          next[index],
        ];

        return next.map(
          (
            item,
            itemIndex
          ) => ({
            ...item,
            sort_order:
              itemIndex,
          })
        );
      }
    );
  }

  function updateAltText(
    index: number,
    value: string
  ) {
    setImages(
      (current) =>
        current.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex ===
            index
              ? {
                  ...item,
                  alt_text:
                    value,
                }
              : item
        )
    );
  }

  return (
    <div>
      <input
        type="hidden"
        name="galleryJson"
        value={JSON.stringify(
          images.map(
            (
              image,
              index
            ) => ({
              id:
                image.id ??
                null,

              image_url:
                image.image_url,

              alt_text:
                image.alt_text,

              sort_order:
                index,

              storage_path:
                image.storage_path ??
                null,

              is_new:
                image.is_new ??
                false,
            })
          )
        )}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={uploadImages}
        className="hidden"
      />

      {images.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() =>
            inputRef.current?.click()
          }
          className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-6 text-center transition-colors hover:bg-[var(--surface-hover)]"
        >
          {uploading ? (
            <>
              <LoaderCircle className="h-8 w-8 animate-spin text-[var(--primary)]" />

              <p className="mt-3 text-sm font-medium">
                Uploading gallery...
              </p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <ImagePlus className="h-6 w-6" />
              </div>

              <p className="mt-4 text-sm font-semibold">
                Upload gallery images
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Select one or multiple
                JPG, PNG, WEBP or GIF
                images.
              </p>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map(
              (
                image,
                index
              ) => (
                <div
                  key={
                    image.id ??
                    image.image_url
                  }
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-secondary)]">
                    <img
                      src={
                        image.image_url
                      }
                      alt={
                        image.alt_text ||
                        `Gallery image ${index + 1}`
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <label
                        htmlFor={`gallery-alt-${index}`}
                        className="mb-2 block text-xs font-medium text-[var(--muted)]"
                      >
                        Alt text
                      </label>

                      <input
                        id={`gallery-alt-${index}`}
                        value={
                          image.alt_text
                        }
                        onChange={(event) =>
                          updateAltText(
                            index,
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Describe this image"
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)]"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={
                            index ===
                            0
                          }
                          onClick={() =>
                            moveImage(
                              index,
                              "up"
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Move image left"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={
                            index ===
                            images.length -
                              1
                          }
                          onClick={() =>
                            moveImage(
                              index,
                              "down"
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Move image right"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            index
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              inputRef.current?.click()
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            {uploading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}

            Add images
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-[var(--muted)]">
        Gallery images are stored in Supabase Storage and
        can later be displayed on the public product page
        in this order.
      </p>
    </div>
  );
}