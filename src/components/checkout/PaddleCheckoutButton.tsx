"use client";

import {
  CreditCard,
  LoaderCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";

import {
  prepareCheckoutOrder,
} from "@/app/checkout/actions";

type PaddleCheckoutButtonProps = {
  productSlug: string;
  amountLabel: string;
  acceptedTerms: boolean;
};

let paddlePromise:
  | Promise<Paddle | undefined>
  | null = null;

function loadPaddle() {
  const token =
    process.env
      .NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    return Promise.reject(
      new Error(
        "Paddle checkout is not configured."
      )
    );
  }

  if (!paddlePromise) {
    const environment =
      process.env
        .NEXT_PUBLIC_PADDLE_ENVIRONMENT ===
      "production"
        ? "production"
        : "sandbox";

    paddlePromise =
      initializePaddle({
        token,
        environment,
      });
  }

  return paddlePromise;
}

export default function PaddleCheckoutButton({
  productSlug,
  amountLabel,
  acceptedTerms,
}: PaddleCheckoutButtonProps) {
  const [
    paddle,
    setPaddle,
  ] = useState<
    Paddle | undefined
  >();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let mounted = true;

    loadPaddle()
      .then((instance) => {
        if (mounted) {
          setPaddle(instance);
        }
      })
      .catch((loadError) => {
        console.error(
          "Failed to initialize Paddle:",
          loadError
        );

        if (mounted) {
          setError(
            "Payment checkout could not be initialized."
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handlePayment() {
    if (loading) {
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Please agree to the Terms of Service before paying."
      );
      return;
    }

    if (!paddle) {
      setError(
        "Payment checkout is still loading. Please try again."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /*
       * STEP 1:
       * Silently prepare Embernix order.
       */
      const preparation =
        await prepareCheckoutOrder(
          productSlug,
          acceptedTerms
        );

      if (!preparation.success) {
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

      const orderNumber =
        preparation.orderNumber;

      /*
       * STEP 2:
       * Create/reuse Paddle transaction.
       */
      const response =
        await fetch(
          "/api/checkout/paddle",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              orderNumber,
            }),
          }
        );

      const data =
        (await response.json()) as {
          transactionId?: string;
          alreadyPaid?: boolean;
          error?: string;
        };

      if (data.alreadyPaid) {
        window.location.href =
          `/checkout/success?order=${encodeURIComponent(
            orderNumber
          )}`;

        return;
      }

      if (
        !response.ok ||
        !data.transactionId
      ) {
        throw new Error(
          data.error ||
            "Unable to start payment."
        );
      }

      /*
       * STEP 3:
       * Open Paddle immediately.
       */
      paddle.Checkout.open({
        transactionId:
          data.transactionId,

        settings: {
          successUrl:
            `${window.location.origin}` +
            `/checkout/success?order=${encodeURIComponent(
              orderNumber
            )}&payment=processing`,
        },
      });
    } catch (paymentError) {
      console.error(
        "Checkout error:",
        paymentError
      );

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start payment."
      );
    } finally {
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
        onClick={handlePayment}
        disabled={
          loading ||
          !paddle ||
          !acceptedTerms
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Preparing checkout...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay {amountLabel}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-[var(--muted)]">
        Secure checkout powered by Paddle.
      </p>
    </div>
  );
}