"use client";

import {
  Check,
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

export type CheckoutItemType =
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
  itemType: CheckoutItemType;
  itemSlug: string;
  email: string;
  item: CheckoutItem;
};

export default function CheckoutForm({
  itemType,
  itemSlug,
  email,
  item,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
            item={item}
            itemType={itemType}
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
                (current) =>
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
          />
        </div>
      </aside>
    </div>
  );
}