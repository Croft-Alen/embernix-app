"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Plus,
  Trash2,
} from "lucide-react";

import { useState } from "react";

export type ProductVersionItem = {
  id?: string;
  version: string;
  release_notes: string;
  is_current: boolean;
  released_at: string;
};

type ProductVersionsEditorProps = {
  initialVersions?: ProductVersionItem[];
};

function createEmptyVersion(): ProductVersionItem {
  return {
    version: "",
    release_notes: "",
    is_current: false,
    released_at: new Date()
      .toISOString()
      .slice(0, 16),
  };
}

export default function ProductVersionsEditor({
  initialVersions = [],
}: ProductVersionsEditorProps) {
  const [versions, setVersions] = useState<
    ProductVersionItem[]
  >(
    [...initialVersions].sort((a, b) => {
      const aTime = new Date(
        a.released_at
      ).getTime();

      const bTime = new Date(
        b.released_at
      ).getTime();

      return bTime - aTime;
    })
  );

  function addVersion() {
    setVersions((current) => [
      createEmptyVersion(),
      ...current,
    ]);
  }

  function removeVersion(index: number) {
    setVersions((current) => {
      const removed = current[index];

      const next = current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

      /*
       * If the current release was removed,
       * automatically promote the newest
       * remaining release.
       */
      if (
        removed?.is_current &&
        next.length > 0
      ) {
        return next.map(
          (item, itemIndex) => ({
            ...item,
            is_current:
              itemIndex === 0,
          })
        );
      }

      return next;
    });
  }

  function updateVersion(
    index: number,
    field:
      | "version"
      | "release_notes"
      | "released_at",
    value: string
  ) {
    setVersions((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      )
    );
  }

  function setCurrent(index: number) {
    setVersions((current) =>
      current.map(
        (item, itemIndex) => ({
          ...item,
          is_current:
            itemIndex === index,
        })
      )
    );
  }

  function moveVersion(
    index: number,
    direction: "up" | "down"
  ) {
    setVersions((current) => {
      const next = [...current];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      [
        next[index],
        next[targetIndex],
      ] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });
  }

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="versionsJson"
        value={JSON.stringify(
          versions.map((item) => ({
            id: item.id ?? null,

            version:
              item.version.trim(),

            release_notes:
              item.release_notes,

            is_current:
              item.is_current,

            released_at:
              item.released_at,
          }))
        )}
      />

      {versions.length === 0 ? (
        <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Clock3 className="h-6 w-6" />
          </div>

          <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
            No releases yet
          </p>

          <p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">
            Add version history and
            changelog information for
            this product.
          </p>

          <button
            type="button"
            onClick={addVersion}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add release
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {versions.map(
              (release, index) => (
                <div
                  key={
                    release.id ??
                    `release-${index}`
                  }
                  className="rounded-2xl border border-[var(--border)] bg-white"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            moveVersion(
                              index,
                              "up"
                            )
                          }
                          disabled={
                            index === 0
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Move release up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveVersion(
                              index,
                              "down"
                            )
                          }
                          disabled={
                            index ===
                            versions.length -
                              1
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Move release down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {release.version ||
                              `Release ${
                                index + 1
                              }`}
                          </p>

                          {release.is_current && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                              <Check className="h-3 w-3" />
                              Current
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          Version release
                          information
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeVersion(
                          index
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
                      aria-label="Remove release"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 p-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`version-${index}`}
                        className="mb-2 block text-xs font-medium text-[var(--muted)]"
                      >
                        Version
                      </label>

                      <input
                        id={`version-${index}`}
                        value={
                          release.version
                        }
                        onChange={(event) =>
                          updateVersion(
                            index,
                            "version",
                            event.target
                              .value
                          )
                        }
                        placeholder="1.0.0"
                        className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`released-at-${index}`}
                        className="mb-2 block text-xs font-medium text-[var(--muted)]"
                      >
                        Release date
                      </label>

                      <input
                        id={`released-at-${index}`}
                        type="datetime-local"
                        value={
                          release.released_at
                        }
                        onChange={(event) =>
                          updateVersion(
                            index,
                            "released_at",
                            event.target
                              .value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor={`release-notes-${index}`}
                        className="mb-2 block text-xs font-medium text-[var(--muted)]"
                      >
                        Release notes
                      </label>

                      <textarea
                        id={`release-notes-${index}`}
                        rows={5}
                        value={
                          release.release_notes
                        }
                        onChange={(event) =>
                          updateVersion(
                            index,
                            "release_notes",
                            event.target
                              .value
                          )
                        }
                        placeholder={`What's new in ${
                          release.version ||
                          "this version"
                        }?`}
                        className="w-full resize-y rounded-xl border border-[var(--border)] px-3 py-3 text-sm leading-6 focus:border-[var(--primary)]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrent(
                            index
                          )
                        }
                        disabled={
                          release.is_current
                        }
                        className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                          release.is_current
                            ? "cursor-default bg-green-50 text-green-700"
                            : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <Check className="h-4 w-4" />

                        {release.is_current
                          ? "Current release"
                          : "Set as current"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={addVersion}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add another release
          </button>
        </>
      )}

      <p className="text-xs leading-5 text-[var(--muted)]">
        One release can be marked as current. When we wire
        this into the product actions, that release will also
        control the product&apos;s current version.
      </p>
    </div>
  );
}