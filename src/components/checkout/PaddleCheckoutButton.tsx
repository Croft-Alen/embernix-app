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

type PaddleCheckoutButtonProps = {
  orderNumber: string;

  amountLabel: string;
};

let paddlePromise:
  | Promise<
      Paddle | undefined
    >
  | null = null;

function loadPaddle() {
  const token =
    process.env
      .NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing."
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
  orderNumber,
  amountLabel,
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
    let mounted =
      true;

    loadPaddle()
      .then(
        (
          instance
        ) => {
          if (mounted) {
            setPaddle(
              instance
            );
          }
        }
      )
      .catch(
        (loadError) => {
          console.error(
            "Failed to initialize Paddle:",
            loadError
          );

          if (mounted) {
            setError(
              "Payment checkout could not be initialized."
            );
          }
        }
      );

    return () => {
      mounted =
        false;
    };
  }, []);

  async function handlePayment() {
    if (
      !paddle ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/checkout/paddle",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  orderNumber,
                }
              ),
          }
        );

      const data =
        (await response.json()) as {
          transactionId?: string;

          alreadyPaid?: boolean;

          error?: string;
        };

      if (
        data.alreadyPaid
      ) {
        window.location.reload();
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
       * Paddle can open a checkout
       * for the transaction we created
       * on the server.
       *
       * successUrl returns customer
       * to this order after successful
       * checkout.
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

      setLoading(false);
    } catch (paymentError) {
      console.error(
        paymentError
      );

      setError(
        paymentError instanceof
          Error
          ? paymentError.message
          : "Unable to start payment."
      );

      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={
          handlePayment
        }
        disabled={
          loading ||
          !paddle
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        {loading ||
        !paddle ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />

            {loading
              ? "Preparing payment..."
              : "Loading payment..."}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />

            Pay {amountLabel}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
        Secure checkout powered
        by Paddle.
      </p>
    </div>
  );
}