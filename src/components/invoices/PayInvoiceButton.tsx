"use client";

import {
  CreditCard,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

import {
  useState,
} from "react";

type PayInvoiceButtonProps = {
  invoiceId: string;
};

export default function PayInvoiceButton({
  invoiceId,
}: PayInvoiceButtonProps) {
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

  async function handlePayment() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/invoices/${invoiceId}/checkout`,
          {
            method:
              "POST",
          }
        );

      const data =
        (await response.json()) as {
          checkoutUrl?: string;
          transactionId?: string;
          alreadyPaid?: boolean;
          error?: string;
        };

      if (
        data.alreadyPaid
      ) {
        window.location.href =
          `/invoices/${invoiceId}`;

        return;
      }

      if (
        !response.ok ||
        !data.checkoutUrl
      ) {
        throw new Error(
          data.error ||
            "Unable to start payment."
        );
      }

      window.location.href =
        data.checkoutUrl;
    } catch (paymentError) {
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
    <div>
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
          loading
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />

            Redirecting...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />

            Pay invoice
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
        <LockKeyhole className="h-3.5 w-3.5" />

        Secure payment by Paddle
      </div>
    </div>
  );
}