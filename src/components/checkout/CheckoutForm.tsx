"use client";

import {
  Check,
  MapPin,
  ShoppingBag,
} from "lucide-react";

import {
  useState,
} from "react";

import CouponInput, {
  type AppliedCoupon,
} from "@/components/checkout/CouponInput";

import OrderSummary from "@/components/checkout/OrderSummary";

import PaddleCheckoutButton from "@/components/checkout/PaddleCheckoutButton";

import type {
  ServiceBillingInput,
} from "@/app/checkout/actions";

type CheckoutItemType =
  | "product"
  | "service";

type CheckoutItem = {
  name: string;
  image_url: string | null;
  version: string | null;
  price_cents: number;
  currency: string;
};

type CheckoutFormProps = {
  itemType:
    CheckoutItemType;

  itemSlug: string;

  email: string;

  item:
    CheckoutItem;

  billingProfile:
    | ServiceBillingInput
    | null;
};

export default function CheckoutForm({
  itemType,
  itemSlug,
  email,
  item,
  billingProfile,
}: CheckoutFormProps) {
  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] =
    useState<AppliedCoupon | null>(
      null
    );

  const [
    billing,
    setBilling,
  ] =
    useState<ServiceBillingInput>({
      companyName:
        billingProfile
          ?.companyName ??
        "",

      addressLine1:
        billingProfile
          ?.addressLine1 ??
        "",

      addressLine2:
        billingProfile
          ?.addressLine2 ??
        "",

      city:
        billingProfile
          ?.city ??
        "",

      state:
        billingProfile
          ?.state ??
        "",

      postalCode:
        billingProfile
          ?.postalCode ??
        "",

      country:
        billingProfile
          ?.country ??
        "",
    });

  function updateBilling(
    key:
      keyof ServiceBillingInput,
    value: string
  ) {
    setBilling(
      (current) => ({
        ...current,
        [key]:
          value,
      })
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Your cart
              </h2>

              <p className="mt-0.5 text-sm text-[var(--muted)]">
                1 item
              </p>
            </div>
          </div>

          <div className="mt-6">
            <OrderSummary
              item={
                item
              }
              itemType={
                itemType
              }
              appliedCoupon={
                appliedCoupon
              }
            />
          </div>

          {itemType ===
            "product" && (
            <div className="mt-7 border-t border-[var(--border-light)] pt-6">
              <CouponInput
                productSlug={
                  itemSlug
                }
                appliedCoupon={
                  appliedCoupon
                }
                onApply={
                  setAppliedCoupon
                }
                onRemove={() =>
                  setAppliedCoupon(
                    null
                  )
                }
              />
            </div>
          )}

          <div className="mt-7 border-t border-[var(--border-light)] pt-6">
            <p className="text-xs text-[var(--muted)]">
              Purchasing as
            </p>

            <p className="mt-1 text-sm font-medium">
              {email}
            </p>
          </div>
        </div>

        {itemType ===
          "service" && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Billing details
                </h2>

                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  Used for your service invoice.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Company
                  <span className="ml-1 text-[var(--muted)]">
                    Optional
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    billing.companyName
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "companyName",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Address
                </label>

                <input
                  type="text"
                  required
                  value={
                    billing.addressLine1
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "addressLine1",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Address line 2
                  <span className="ml-1 text-[var(--muted)]">
                    Optional
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    billing.addressLine2
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "addressLine2",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  City
                </label>

                <input
                  type="text"
                  required
                  value={
                    billing.city
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "city",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  State / Province
                </label>

                <input
                  type="text"
                  value={
                    billing.state
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "state",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Postal code
                </label>

                <input
                  type="text"
                  value={
                    billing.postalCode
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "postalCode",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Country
                </label>

                <input
                  type="text"
                  required
                  value={
                    billing.country
                  }
                  onChange={(
                    event
                  ) =>
                    updateBilling(
                      "country",
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-[var(--border)] bg-white p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">
          Checkout
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Complete your purchase securely.
        </p>

        <div className="my-6 border-t border-[var(--border-light)]" />

        <div className="flex items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={
              acceptedTerms
            }
            onClick={() =>
              setAcceptedTerms(
                (
                  current
                ) =>
                  !current
              )
            }
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              acceptedTerms
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-white"
            }`}
          >
            {acceptedTerms && (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>

          <p className="text-sm leading-6 text-[var(--muted)]">
            I agree to the{" "}
            <a
              href="https://embernix.org/terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--foreground)] underline underline-offset-4"
            >
              Terms of Service
            </a>
            .
          </p>
        </div>

        <div className="mt-6">
          <PaddleCheckoutButton
            itemType={
              itemType
            }
            itemSlug={
              itemSlug
            }
            acceptedTerms={
              acceptedTerms
            }
            couponCode={
              itemType ===
              "product"
                ? appliedCoupon
                    ?.code ??
                  null
                : null
            }
            billing={
              itemType ===
              "service"
                ? billing
                : null
            }
          />
        </div>
      </aside>
    </div>
  );
}