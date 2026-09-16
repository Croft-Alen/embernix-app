"use client";

import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  prepareCheckoutOrder,
  type CheckoutItemType,
} from "@/app/checkout/actions";

type PaddleCheckoutButtonProps = {
  itemType: CheckoutItemType;
  itemSlug: string;
  acceptedTerms: boolean;
  couponCode?: string | null;
};

export default function PaddleCheckoutButton({
  itemType,
  itemSlug,
  acceptedTerms,
  couponCode,
}: PaddleCheckoutButtonProps) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  async function handleCheckout() {
    if (loading) {
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Please agree to the Terms of Service."
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const preparation =
        await prepareCheckoutOrder(
          itemType,
          itemSlug,
          acceptedTerms
        );

      if (
        !preparation.success
      ) {
        if (
          preparation.ownedProductId
        ) {
          window.location.href =
            `/products/${preparation.ownedProductId}`;

          return;
        }

        throw new Error(
          preparation.error
        );
      }

      const normalizedCoupon =
        itemType ===
        "product"
          ? couponCode
              ?.trim()
              .toUpperCase() ||
            null
          : null;

      const response =
        await fetch(
          "/api/checkout/paddle",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                orderNumber:
                  preparation.orderNumber,

                couponCode:
                  normalizedCoupon,
              }),
          }
        );

      const data =
        (await response.json()) as {
          checkoutUrl?: string;
          transactionId?: string;
          couponCode?:
            | string
            | null;
          discountId?:
            | string
            | null;
          alreadyPaid?: boolean;
          error?: string;
        };

      if (
        data.alreadyPaid
      ) {
        window.location.href =
          `/checkout/success?order=${encodeURIComponent(
            preparation.orderNumber
          )}`;

        return;
      }

      if (
        !response.ok ||
        !data.checkoutUrl
      ) {
        throw new Error(
          data.error ||
            "Unable to start checkout."
        );
      }

      window.location.href =
        data.checkoutUrl;
    } catch (
      checkoutError
    ) {
      console.error(
        "Checkout error:",
        checkoutError
      );

      setError(
        checkoutError instanceof
          Error
          ? checkoutError.message
          : "Unable to start checkout."
      );

      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={
          handleCheckout
        }
        disabled={
          loading ||
          !acceptedTerms
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />

            Redirecting...
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

        Secure checkout by Paddle
      </div>
    </div>
  );
}