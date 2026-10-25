
"use client";

import { useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

type CheckoutButtonProps = {
  itemSlug: string;
  acceptedTerms: boolean;
  couponCode?: string | null;
};

type CheckoutResponse = {
  checkoutUrl?: string;
  alreadyPaid?: boolean;
  orderNumber?: string;
  ownedProductId?: string;
  error?: string;
};

export default function CheckoutButton({
  itemSlug,
  acceptedTerms,
  couponCode = null,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  async function handleCheckout() {
    if (loading) return;

    if (!acceptedTerms) {
      setError(
        "Please agree to the Terms of Service."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productSlug: itemSlug,
            acceptedTerms: true,
            couponCode:
              couponCode?.trim().toUpperCase() ??
              null,
          }),
        }
      );

      const data =
        (await response.json()) as CheckoutResponse;

      if (data.ownedProductId) {
        window.location.assign(
          `/products/${data.ownedProductId}`
        );
        return;
      }

      if (
        data.alreadyPaid &&
        data.orderNumber
      ) {
        window.location.assign(
          `/checkout/success?order=${encodeURIComponent(
            data.orderNumber
          )}`
        );
        return;
      }

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(
          data.error ||
            "Unable to start checkout."
        );
      }

      const checkoutUrl = new URL(data.checkoutUrl);

      if (
        checkoutUrl.protocol !== "https:" ||
        !(
          checkoutUrl.hostname === "creem.io" ||
          checkoutUrl.hostname.endsWith(
            ".creem.io"
          )
        )
      ) {
        throw new Error(
          "Unexpected checkout destination."
        );
      }

      window.location.assign(
        checkoutUrl.toString()
      );
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || !acceptedTerms}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Continue to checkout
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
        <LockKeyhole className="h-3.5 w-3.5" />
        Secure payment processing
      </div>
    </div>
  );
}
