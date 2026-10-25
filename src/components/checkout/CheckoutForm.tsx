"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import CouponInput, {
  type AppliedCoupon,
} from "@/components/checkout/CouponInput";

import OrderSummary from "@/components/checkout/OrderSummary";
import CheckoutButton from "@/components/checkout/CheckoutButton";

type CheckoutItem = {
  name: string;
  image_url: string | null;
  version: string | null;
  price_cents: number;
  currency: string;
};

type CheckoutFormProps = {
  itemSlug: string;
  email: string;
  item: CheckoutItem;
};

export default function CheckoutForm({
  itemSlug,
  email,
  item,
}: CheckoutFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [appliedCoupon, setAppliedCoupon] =
    useState<AppliedCoupon | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                Your order
              </h2>

              <p className="mt-0.5 text-sm text-[var(--muted)]">
                1 digital product
              </p>
            </div>
          </div>

          <div className="mt-6">
            <OrderSummary
              item={item}
              appliedCoupon={appliedCoupon}
            />
          </div>

          <div className="mt-7 border-t border-[var(--border-light)] pt-6">
            <CouponInput
              productSlug={itemSlug}
              appliedCoupon={appliedCoupon}
              onApply={setAppliedCoupon}
              onRemove={() => setAppliedCoupon(null)}
            />
          </div>

          <div className="mt-7 border-t border-[var(--border-light)] pt-6">
            <p className="text-xs text-[var(--muted)]">
              Purchasing as
            </p>

            <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">
              {email}
            </p>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Complete purchase
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Review your order and continue to secure checkout.
        </p>

        <div className="my-6 border-t border-[var(--border-light)]" />

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) =>
              setAcceptedTerms(event.target.checked)
            }
            className="sr-only"
          />

          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              acceptedTerms
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            {acceptedTerms && (
              <Check className="h-3.5 w-3.5" />
            )}
          </span>

          <span className="text-sm leading-6 text-[var(--muted)]">
            I have read and agree to the{" "}
            <a
              href="https://embernix.org/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--foreground)] underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://embernix.org/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--foreground)] underline underline-offset-4"
            >
              Refund Policy
            </a>
            .
          </span>
        </label>

        <div className="mt-6">
          <CheckoutButton
            itemSlug={itemSlug}
            acceptedTerms={acceptedTerms}
            couponCode={appliedCoupon?.code ?? null}
          />
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">
          Payments are processed securely by our payment
          provider.
        </p>
      </aside>
    </div>
  );
}
