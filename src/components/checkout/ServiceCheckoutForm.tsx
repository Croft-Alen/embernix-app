"use client";

import {
  Building2,
  CreditCard,
  MapPin,
  ShieldCheck,
} from "lucide-react";

type BillingProfile = {
  company_name:
    | string
    | null;

  address_line_1:
    | string
    | null;

  address_line_2:
    | string
    | null;

  city:
    | string
    | null;

  state:
    | string
    | null;

  postal_code:
    | string
    | null;

  country:
    | string
    | null;
};

type ServiceCheckoutFormProps = {
  service: {
    id: string;
    slug: string;
    name: string;
    short_description:
      | string
      | null;
    price_cents: number;
    currency: string;
  };

  billingProfile:
    | BillingProfile
    | null;

  action:
    | ((
        formData: FormData
      ) => void)
    | ((
        formData: FormData
      ) => Promise<void>);
};

const labelClass =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

function formatMoney(
  cents: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency,
      }
    ).format(
      cents / 100
    );
  } catch {
    return `${currency} ${(
      cents / 100
    ).toFixed(2)}`;
  }
}

export default function ServiceCheckoutForm({
  service,
  billingProfile,
  action,
}: ServiceCheckoutFormProps) {
  return (
    <form
      action={action}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <input
        type="hidden"
        name="serviceId"
        value={service.id}
      />

      <input
        type="hidden"
        name="serviceSlug"
        value={service.slug}
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <MapPin className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Billing details
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                These details are saved to your billing profile for future service purchases.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="companyName"
                className={
                  labelClass
                }
              >
                Company name
                <span className="ml-1 font-normal text-[var(--muted)]">
                  Optional
                </span>
              </label>

              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                <input
                  id="companyName"
                  name="companyName"
                  defaultValue={
                    billingProfile
                      ?.company_name ??
                    ""
                  }
                  className={`${inputClass} pl-10`}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="addressLine1"
                className={
                  labelClass
                }
              >
                Address
              </label>

              <input
                id="addressLine1"
                name="addressLine1"
                defaultValue={
                  billingProfile
                    ?.address_line_1 ??
                  ""
                }
                placeholder="Street address"
                className={
                  inputClass
                }
                required
              />
            </div>

            <div>
              <label
                htmlFor="addressLine2"
                className={
                  labelClass
                }
              >
                Address line 2
                <span className="ml-1 font-normal text-[var(--muted)]">
                  Optional
                </span>
              </label>

              <input
                id="addressLine2"
                name="addressLine2"
                defaultValue={
                  billingProfile
                    ?.address_line_2 ??
                  ""
                }
                placeholder="Apartment, suite, unit, etc."
                className={
                  inputClass
                }
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="city"
                  className={
                    labelClass
                  }
                >
                  City
                </label>

                <input
                  id="city"
                  name="city"
                  defaultValue={
                    billingProfile
                      ?.city ??
                    ""
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className={
                    labelClass
                  }
                >
                  State / Province
                </label>

                <input
                  id="state"
                  name="state"
                  defaultValue={
                    billingProfile
                      ?.state ??
                    ""
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="postalCode"
                  className={
                    labelClass
                  }
                >
                  Postal code
                </label>

                <input
                  id="postalCode"
                  name="postalCode"
                  defaultValue={
                    billingProfile
                      ?.postal_code ??
                    ""
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className={
                    labelClass
                  }
                >
                  Country
                </label>

                <input
                  id="country"
                  name="country"
                  defaultValue={
                    billingProfile
                      ?.country ??
                    ""
                  }
                  placeholder="Pakistan"
                  className={
                    inputClass
                  }
                  required
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside>
        <div className="sticky top-6 rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Order summary
          </h2>

          <div className="mt-5">
            <p className="text-sm font-medium">
              {service.name}
            </p>

            {service.short_description && (
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {
                  service.short_description
                }
              </p>
            )}
          </div>

          <div className="my-5 border-t border-[var(--border-light)]" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">
              Service
            </span>

            <span className="text-sm font-medium">
              {formatMoney(
                service.price_cents,
                service.currency
              )}
            </span>
          </div>

          <div className="mt-4 border-t border-[var(--border-light)] pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Total
              </span>

              <span className="text-xl font-semibold">
                {formatMoney(
                  service.price_cents,
                  service.currency
                )}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            <CreditCard className="h-4 w-4" />

            Continue
          </button>

          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

            <span>
              An invoice will be created before payment. You can then pay securely through Paddle.
            </span>
          </div>
        </div>
      </aside>
    </form>
  );
}