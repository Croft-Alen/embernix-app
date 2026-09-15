"use client";

import {
  Camera,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  removeAvatar,
  uploadAvatar,
} from "@/app/(client)/account/actions";

type ProfileAvatarUploaderProps = {
  avatarUrl: string | null;
  displayName: string;
  initials: string;
  hasCustomAvatar: boolean;
};

export function ProfileAvatarUploader({
  avatarUrl,
  displayName,
  initials,
  hasCustomAvatar,
}: ProfileAvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [uploading, setUploading] = useState(false);

  function openFilePicker() {
    if (uploading) return;

    inputRef.current?.click();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);

    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <form
        ref={formRef}
        action={uploadAvatar}
        encType="multipart/form-data"
      >
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          aria-label="Change profile photo"
          className="group relative block h-24 w-24 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] disabled:cursor-wait"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-[var(--primary-soft)] text-2xl font-semibold text-[var(--primary)]">
              {initials}
            </span>
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
            {uploading ? (
              <LoaderCircle className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </span>
        </button>
      </form>

      <div className="flex-1">
        <h3 className="font-semibold">
          Profile photo
        </h3>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Click your photo to upload a JPG, PNG, or WEBP
          image up to 2 MB.
        </p>

        {!hasCustomAvatar && avatarUrl && (
          <p className="mt-1 text-xs text-[var(--muted-light)]">
            Currently using your connected sign-in
            provider photo.
          </p>
        )}

        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--primary)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Uploading photo...
          </div>
        )}

        {hasCustomAvatar && !uploading && (
          <form action={removeAvatar} className="mt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Remove custom photo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}