"use client";

import Link from "next/link";

import {
  CircleDollarSign,
  FileText,
  ImageIcon,
  Link2,
  Settings2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

export type ServiceFormData = {
  id?: string;

  name?: string | null;
  slug?: string | null;

  short_description?:
    | string
    | null;

  description?:
    | string
    | null;

  price_cents?:
    | number
    | null;

  currency?:
    | string
    | null;

  image_url?:
    | string
    | null;

  active?:
    | boolean
    | null;

  sort_order?:
    | number
    | null;
};

type ServiceFormProps = {
  action:
    | ((
        formData: FormData
      ) => void)
    | ((
        formData: FormData
      ) => Promise<void>);

  service?:
    ServiceFormData;

  submitLabel?: string;
};

const sectionClass =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

const labelClass =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

const textareaClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]";

function makeSlug(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

export default function ServiceForm({
  action,
  service,
  submitLabel = "Save service",
}: ServiceFormProps) {
  const [
    name,
    setName,
  ] = useState(
    service?.name ??
      ""
  );

  const [
    slug,
    setSlug,
  ] = useState(
    service?.slug ??
      ""
  );

  const [
    slugTouched,
    setSlugTouched,
  ] = useState(
    Boolean(
      service?.slug
    )
  );

  const [
    currency,
    setCurrency,
  ] = useState(
    service?.currency ??
      "USD"
  );

  const [
    imageUrl,
    setImageUrl,
  ] = useState(
    service?.image_url ??
      ""
  );

  useEffect(() => {
    if (
      slugTouched
    ) {
      return;
    }

    setSlug(
      makeSlug(name)
    );
  }, [
    name,
    slugTouched,
  ]);

  const price =
    Number(
      service?.price_cents ??
        0
    ) / 100;

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Service details
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Basic service information shown to customers.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="name"
              className={
                labelClass
              }
            >
              Service name
            </label>

            <input
              id="name"
              name="name"
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder="Web Development"
              className={
                inputClass
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className={
                labelClass
              }
            >
              Slug
            </label>

            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(
                  event
                ) => {
                  setSlugTouched(
                    true
                  );

                  setSlug(
                    makeSlug(
                      event.target
                        .value
                    )
                  );
                }}
                placeholder="web-development"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="shortDescription"
              className={
                labelClass
              }
            >
              Short description
            </label>

            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              defaultValue={
                service?.short_description ??
                ""
              }
              placeholder="Short summary shown on service cards."
              className={
                textareaClass
              }
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className={
                labelClass
              }
            >
              Full description
            </label>

            <textarea
              id="description"
              name="description"
              rows={8}
              defaultValue={
                service?.description ??
                ""
              }
              placeholder="Describe the service, scope, deliverables, and what the customer receives."
              className={
                textareaClass
              }
            />
          </div>
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <CircleDollarSign className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Pricing
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Set the fixed V1 price for this service.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="price"
              className={
                labelClass
              }
            >
              Price
            </label>

            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                price.toFixed(
                  2
                )
              }
              className={
                inputClass
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="currency"
              className={
                labelClass
              }
            >
              Currency
            </label>

            <input
              id="currency"
              name="currency"
              value={
                currency
              }
              onChange={(
                event
              ) =>
                setCurrency(
                  event.target.value
                    .toUpperCase()
                    .slice(
                      0,
                      3
                    )
                )
              }
              maxLength={3}
              className={`${inputClass} uppercase`}
              required
            />
          </div>
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ImageIcon className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Media
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional image shown for the service.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="imageUrl"
            className={
              labelClass
            }
          >
            Image URL
          </label>

          <input
            id="imageUrl"
            name="imageUrl"
            value={
              imageUrl
            }
            onChange={(
              event
            ) =>
              setImageUrl(
                event.target
                  .value
              )
            }
            placeholder="https://..."
            className={
              inputClass
            }
          />

          {imageUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
              <img
                src={
                  imageUrl
                }
                alt=""
                className="h-56 w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Settings2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Settings
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Control visibility and ordering.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="sortOrder"
              className={
                labelClass
              }
            >
              Sort order
            </label>

            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              step="1"
              defaultValue={
                service?.sort_order ??
                0
              }
              className={
                inputClass
              }
            />
          </div>

          <div className="flex items-end">
            <label className="flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4">
              <div>
                <p className="text-sm font-medium">
                  Active
                </p>

                <p className="text-xs text-[var(--muted)]">
                  Show this service to customers.
                </p>
              </div>

              <input
                type="checkbox"
                name="active"
                defaultChecked={
                  service?.active !==
                  false
                }
                className="h-4 w-4"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/admin/services"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {
            submitLabel
          }
        </button>
      </div>
    </form>
  );
}