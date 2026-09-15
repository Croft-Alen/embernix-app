"use client";

import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

import {
  useActionState,
} from "react";

import {
  createCheckoutOrder,
  type CheckoutState,
} from "@/app/checkout/actions";

type CheckoutFormProps = {
  productSlug: string;

  email: string;

  initialName: string;
};

const initialState: CheckoutState =
  {};

export default function CheckoutForm({
  productSlug,
  email,
  initialName,
}: CheckoutFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    createCheckoutOrder,
    initialState
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

  const labelClass =
    "mb-2 block text-sm font-medium";

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="productSlug"
        value={productSlug}
      />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* CUSTOMER */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] px-6 py-5">
          <h2 className="font-semibold">
            Customer information
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Your account details for
            this order.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="customerName"
              className={
                labelClass
              }
            >
              Full name
            </label>

            <input
              id="customerName"
              name="customerName"
              defaultValue={
                initialName
              }
              autoComplete="name"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.name && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .name
                }
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className={
                labelClass
              }
            >
              Email
            </label>

            <input
              id="email"
              value={email}
              disabled
              className={`${inputClass} cursor-not-allowed bg-[var(--surface-secondary)] text-[var(--muted)]`}
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Uses your Embernix
              account email.
            </p>
          </div>
        </div>
      </section>

      {/* BILLING */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] px-6 py-5">
          <h2 className="font-semibold">
            Billing details
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Billing information stored
            with this order.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="billingCountry"
              className={
                labelClass
              }
            >
              Country
            </label>

            <input
              id="billingCountry"
              name="billingCountry"
              autoComplete="country-name"
              placeholder="Pakistan"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.country && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .country
                }
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="billingAddressLine1"
              className={
                labelClass
              }
            >
              Address line 1
            </label>

            <input
              id="billingAddressLine1"
              name="billingAddressLine1"
              autoComplete="address-line1"
              placeholder="Street address"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.addressLine1 && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .addressLine1
                }
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="billingAddressLine2"
              className={
                labelClass
              }
            >
              Address line 2{" "}
              <span className="font-normal text-[var(--muted)]">
                (optional)
              </span>
            </label>

            <input
              id="billingAddressLine2"
              name="billingAddressLine2"
              autoComplete="address-line2"
              placeholder="Apartment, suite, unit, etc."
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              htmlFor="billingCity"
              className={
                labelClass
              }
            >
              City
            </label>

            <input
              id="billingCity"
              name="billingCity"
              autoComplete="address-level2"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.city && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .city
                }
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="billingState"
              className={
                labelClass
              }
            >
              State / Region
            </label>

            <input
              id="billingState"
              name="billingState"
              autoComplete="address-level1"
              placeholder="Punjab"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.state && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .state
                }
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="billingPostalCode"
              className={
                labelClass
              }
            >
              Postal code
            </label>

            <input
              id="billingPostalCode"
              name="billingPostalCode"
              autoComplete="postal-code"
              className={
                inputClass
              }
              required
            />

            {state.fieldErrors
              ?.postalCode && (
              <p className="mt-2 text-xs text-red-600">
                {
                  state
                    .fieldErrors
                    .postalCode
                }
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CONTINUE */}
      <div className="flex flex-col items-end gap-3 pb-8">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 min-w-[210px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Creating order...
            </>
          ) : (
            <>
              Continue to payment
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <LockKeyhole className="h-3.5 w-3.5" />
          Payment will be handled securely.
        </div>
      </div>
    </form>
  );
}