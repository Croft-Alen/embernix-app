"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useState,
} from "react";

export type ProductFeatureItem = {
  id?: string;
  title: string;
  description: string;
  sort_order: number;
};

type ProductFeaturesEditorProps = {
  initialFeatures?: ProductFeatureItem[];
};

export default function ProductFeaturesEditor({
  initialFeatures = [],
}: ProductFeaturesEditorProps) {
  const [features, setFeatures] = useState<
    ProductFeatureItem[]
  >(
    initialFeatures.length > 0
      ? initialFeatures
      : []
  );

  function addFeature() {
    setFeatures((current) => [
      ...current,
      {
        title: "",
        description: "",
        sort_order:
          current.length,
      },
    ]);
  }

  function removeFeature(index: number) {
    setFeatures((current) =>
      current
        .filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
        .map((item, itemIndex) => ({
          ...item,
          sort_order:
            itemIndex,
        }))
    );
  }

  function moveFeature(
    index: number,
    direction:
      | "up"
      | "down"
  ) {
    setFeatures((current) => {
      const next = [...current];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >=
          next.length
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

      return next.map(
        (item, itemIndex) => ({
          ...item,
          sort_order:
            itemIndex,
        })
      );
    });
  }

  function updateFeature(
    index: number,
    field:
      | "title"
      | "description",
    value: string
  ) {
    setFeatures((current) =>
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

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="featuresJson"
        value={JSON.stringify(
          features.map(
            (feature, index) => ({
              id:
                feature.id ??
                null,

              title:
                feature.title,

              description:
                feature.description,

              sort_order:
                index,
            })
          )
        )}
      />

      {features.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-6 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No product features yet
          </p>

          <p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">
            Add feature highlights that
            will appear on the public
            product page.
          </p>

          <button
            type="button"
            onClick={addFeature}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add feature
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {features.map(
              (
                feature,
                index
              ) => (
                <div
                  key={
                    feature.id ??
                    `feature-${index}`
                  }
                  className="rounded-2xl border border-[var(--border)] bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          moveFeature(
                            index,
                            "up"
                          )
                        }
                        disabled={
                          index === 0
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-25"
                        aria-label="Move feature up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveFeature(
                            index,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                          features.length -
                            1
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-25"
                        aria-label="Move feature down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid flex-1 gap-3 md:grid-cols-[1fr_2fr]">
                      <div>
                        <label
                          htmlFor={`feature-title-${index}`}
                          className="mb-2 block text-xs font-medium text-[var(--muted)]"
                        >
                          Title
                        </label>

                        <input
                          id={`feature-title-${index}`}
                          value={
                            feature.title
                          }
                          onChange={(event) =>
                            updateFeature(
                              index,
                              "title",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Easy setup"
                          className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`feature-description-${index}`}
                          className="mb-2 block text-xs font-medium text-[var(--muted)]"
                        >
                          Description
                        </label>

                        <input
                          id={`feature-description-${index}`}
                          value={
                            feature.description
                          }
                          onChange={(event) =>
                            updateFeature(
                              index,
                              "description",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Short explanation of this feature."
                          className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFeature(
                          index
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
                      aria-label="Remove feature"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={addFeature}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add another feature
          </button>
        </>
      )}
    </div>
  );
}