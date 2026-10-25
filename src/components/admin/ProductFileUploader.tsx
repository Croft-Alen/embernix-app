"use client";

import {
  Archive,
  FileArchive,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

export type ExistingProductFile = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
} | null;

type ProductFileUploaderProps = {
  productId: string;
  existingFile?: ExistingProductFile;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatBytes(bytes?: number | null) {
  if (!bytes) return "Unknown size";

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes / Math.pow(1024, index);

  return `${value.toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}

function sanitizeFileName(
  name: string
) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export default function ProductFileUploader({
  productId,
  existingFile = null,
}: ProductFileUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [fileName, setFileName] =
    useState(
      existingFile?.file_name ?? ""
    );

  const [storagePath, setStoragePath] =
    useState(
      existingFile?.storage_path ?? ""
    );

  const [fileSize, setFileSize] =
    useState(
      existingFile?.file_size ?? 0
    );

  const [mimeType, setMimeType] =
    useState(
      existingFile?.mime_type ?? ""
    );

  const [changed, setChanged] =
    useState(false);

  const [removeFile, setRemoveFile] =
    useState(false);

  async function uploadFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "Product file must be smaller than 50 MB."
      );

      event.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase =
        createClient();

      /*
       * If the admin selected another NEW file before
       * saving the form, remove that temporary upload.
       *
       * We never remove the currently-saved database
       * file here. That happens safely inside the
       * server action after Save succeeds.
       */
      if (
        changed &&
        storagePath &&
        storagePath !==
          existingFile?.storage_path
      ) {
        await supabase.storage
          .from("product-files")
          .remove([
            storagePath,
          ]);
      }

      const safeName =
        sanitizeFileName(
          file.name
        );

      const path =
        `${productId}/main/` +
        `${crypto.randomUUID()}-${safeName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("product-files")
        .upload(path, file, {
          upsert: false,
          contentType:
            file.type ||
            "application/octet-stream",
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      setFileName(file.name);
      setStoragePath(path);
      setFileSize(file.size);

      setMimeType(
        file.type ||
          "application/octet-stream"
      );

      setRemoveFile(false);
      setChanged(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Product file upload failed."
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

  function markForRemoval() {
    /*
     * If this is a newly uploaded unsaved file,
     * remove it immediately from Storage.
     */
    if (
      changed &&
      storagePath &&
      storagePath !==
        existingFile?.storage_path
    ) {
      const supabase =
        createClient();

      void supabase.storage
        .from("product-files")
        .remove([
          storagePath,
        ]);
    }

    setFileName("");
    setStoragePath("");
    setFileSize(0);
    setMimeType("");
    setChanged(true);
    setRemoveFile(true);
  }

  const hasFile =
    Boolean(storagePath) &&
    !removeFile;

  return (
    <div>
      {/* Values submitted with the main Product form */}
      <input
        type="hidden"
        name="productFilePath"
        value={storagePath}
      />

      <input
        type="hidden"
        name="productFileName"
        value={fileName}
      />

      <input
        type="hidden"
        name="productFileSize"
        value={String(fileSize)}
      />

      <input
        type="hidden"
        name="productFileMime"
        value={mimeType}
      />

      <input
        type="hidden"
        name="productFileChanged"
        value={
          changed ? "true" : "false"
        }
      />

      <input
        type="hidden"
        name="productFileRemove"
        value={
          removeFile
            ? "true"
            : "false"
        }
      />

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".zip,.rar,.7z,.jar,.tar,.gz,.tgz"
        onChange={uploadFile}
      />

      {hasFile ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <FileArchive className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {fileName}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatBytes(
                    fileSize
                  )}

                  {changed &&
                    " · New upload"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  inputRef.current?.click()
                }
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              >
                <Upload className="h-4 w-4" />
                Replace
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={
                  markForRemoval
                }
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() =>
            inputRef.current?.click()
          }
          className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-6 text-center transition-colors hover:bg-[var(--surface-hover)]"
        >
          {uploading ? (
            <>
              <LoaderCircle className="h-8 w-8 animate-spin text-[var(--primary)]" />

              <p className="mt-3 text-sm font-medium">
                Uploading product
                file...
              </p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Archive className="h-6 w-6" />
              </div>

              <p className="mt-4 text-sm font-semibold">
                Upload product file
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                ZIP, RAR, 7Z, JAR,
                TAR or GZ · Maximum
                50 MB
              </p>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {changed &&
        hasFile && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            File uploaded securely.
            Finish by saving the
            product.
          </p>
        )}
    </div>
  );
}