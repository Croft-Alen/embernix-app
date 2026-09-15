"use client";

import {
  Camera,
  ImageIcon,
  LoaderCircle,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

type ProductCoverUploaderProps = {
  productId: string;
  productName: string;
  initialImageUrl?: string | null;
};

function getExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";

  return "jpg";
}

export default function ProductCoverUploader({
  productId,
  productName,
  initialImageUrl,
}: ProductCoverUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] =
    useState(initialImageUrl ?? "");

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Use a JPG, PNG, WEBP, or GIF image."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Cover image must be smaller than 10 MB."
      );
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      const extension = getExtension(
        file.type
      );

      await supabase.storage
        .from("product-media")
        .remove([
          `${productId}/cover.jpg`,
          `${productId}/cover.png`,
          `${productId}/cover.webp`,
          `${productId}/cover.gif`,
        ]);

      const path = `${productId}/cover.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-media")
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: "3600",
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("product-media")
        .getPublicUrl(path);

      setImageUrl(
        `${publicUrl}?v=${Date.now()}`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Cover upload failed."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <input
        type="hidden"
        name="imageUrl"
        value={imageUrl}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() =>
          inputRef.current?.click()
        }
        disabled={uploading}
        className="group relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName || "Product cover"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
            <ImageIcon className="h-10 w-10" />

            <span className="text-sm">
              Click to upload cover image
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/45">
          {uploading ? (
            <div className="flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm font-medium text-white">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4" />

              {imageUrl
                ? "Change cover"
                : "Upload cover"}
            </div>
          )}
        </div>
      </button>

      <p className="mt-2 text-xs text-[var(--muted)]">
        JPG, PNG, WEBP or GIF. Maximum 10 MB.
      </p>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}