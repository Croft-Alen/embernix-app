
"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
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
  code?: string;
  existingCheckoutUrl?: string;
  existingCouponCode?: string | null;
  existingDiscountCents?: number;
  existingTotalCents?: number;
  existingCurrency?: string;
};

type PreviousCheckout = {
  url: string;
  orderNumber: string | null;
  couponCode: string | null;
  totalCents: number | null;
  currency: string | null;
};

function safeCreemUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "creem.io" ||
      url.hostname.endsWith(".creem.io")
    )
  ) {
    throw new Error(
      "Unexpected checkout destination."
    );
  }

  return url.toString();
}

function formatAmount(
  cents: number | null,
  currency: string | null
): string | null {
  if (
    cents === null ||
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return null;
  }

  try {
    const formatter = new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
      }
    );

    const decimals =
      formatter.resolvedOptions()
        .maximumFractionDigits ?? 2;

    return formatter.format(
      cents / 10 ** decimals
    );
  } catch {
    return null;
  }
}

export default function CheckoutButton({
  itemSlug,
  acceptedTerms,
  couponCode = null,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [
    previousCheckout,
    setPreviousCheckout,
  ] = useState<PreviousCheckout | null>(
    null
  );

  /*
   * If the customer changes the selected
   * coupon or product, remove the old
   * conflict UI before another attempt.
   */
  useEffect(() => {
    setError(null);
    setPreviousCheckout(null);
  }, [itemSlug, couponCode]);

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
    setPreviousCheckout(null);

    try {
      const response = await fetch(
        "/api/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            productSlug: itemSlug,
            acceptedTerms: true,
            couponCode:
              couponCode
                ?.trim()
                .toUpperCase() || null,
          }),
        }
      );

      const data =
        (await response.json()) as CheckoutResponse;

      /*
       * Existing active license.
       */
      if (data.ownedProductId) {
        window.location.assign(
          `/products/${encodeURIComponent(
            data.ownedProductId
          )}`
        );

        return;
      }

      /*
       * Order already paid.
       */
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

      /*
       * An existing Creem checkout uses
       * different coupon settings.
       *
       * Display its original checkout
       * details and allow the customer
       * to continue that session.
       *
       * Do not attempt to change the
       * previous checkout amount.
       */
      if (
        !response.ok &&
        data.code === "CHECKOUT_CONFLICT" &&
        data.existingCheckoutUrl
      ) {
        const oldUrl = safeCreemUrl(
          data.existingCheckoutUrl
        );

        setPreviousCheckout({
          url: oldUrl,
          orderNumber:
            data.orderNumber ?? null,
          couponCode:
            data.existingCouponCode ?? null,
          totalCents:
            typeof data.existingTotalCents ===
            "number"
              ? data.existingTotalCents
              : null,
          currency:
            data.existingCurrency ?? null,
        });

        setError(
          "You already have an open payment session for this product with different coupon settings. The new coupon cannot be applied to that existing session."
        );

        return;
      }

      /*
       * Normal API error.
       */
      if (
        !response.ok ||
        !data.checkoutUrl
      ) {
        throw new Error(
          data.error ||
            "Unable to start checkout."
        );
      }

      /*
       * New checkout or matching
       * existing checkout.
       */
      const checkoutUrl = safeCreemUrl(
        data.checkoutUrl
      );

      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const previousTotal =
    previousCheckout
      ? formatAmount(
          previousCheckout.totalCents,
          previousCheckout.currency
        )
      : null;

  return (
    <div className="space-y-3">
      {previousCheckout ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Previous checkout still open
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                {error}
              </p>

              {previousCheckout.orderNumber && (
                <p className="mt-3 text-xs text-amber-800">
                  Order:{" "}
                  <span className="font-mono font-medium">
                    {
                      previousCheckout.orderNumber
                    }
                  </span>
                </p>
              )}

              <div className="mt-3 space-y-1.5 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm text-amber-900">
                <div className="flex justify-between gap-3">
                  <span>Original coupon</span>

                  <span className="font-semibold">
                    {previousCheckout.couponCode ??
                      "None"}
                  </span>
                </div>

                {previousTotal && (
                  <div className="flex justify-between gap-3">
                    <span>Original total</span>

                    <span className="font-semibold">
                      {previousTotal}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-amber-800">
                Continuing the previous checkout
                uses its original price. Your
                currently selected coupon will not
                be applied to that payment.
              </p>

              <a
                href={previousCheckout.url}
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                Continue previous checkout

                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={
          loading ||
          !acceptedTerms ||
          Boolean(previousCheckout)
        }
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

      <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
        <LockKeyhole className="h-3.5 w-3.5" />
        Secure payment processing
      </div>
    </div>
  );
}
