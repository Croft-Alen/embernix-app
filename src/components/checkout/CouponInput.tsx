"use client";

import { useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Tag,
  X,
} from "lucide-react";

export type AppliedCoupon = {
  code: string;
  description: string | null;
  discountType: "percentage" | "flat";
  amount: number;
  currency: string | null;
  discountCents: number;
  totalCents: number;
};

type CouponInputProps = {
  productSlug: string;
  appliedCoupon: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
};

type CouponResponse = {
  valid?: boolean;
  coupon?: {
    code: string;
    description: string | null;
    discountType: "percentage" | "flat";
    amount: number;
    currency: string | null;
  };
  discountCents?: number;
  totalCents?: number;
  error?: string;
};

export default function CouponInput({
  productSlug,
  appliedCoupon,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (loading || appliedCoupon) {
      return;
    }

    const normalized = code.trim().toUpperCase();

    if (!/^[A-Z0-9]{1,32}$/.test(normalized)) {
      setError(
        "Enter a valid coupon code using letters and numbers."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/checkout/coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalized,
            productSlug,
          }),
          cache: "no-store",
        }
      );

      const data: CouponResponse =
        await response.json().catch(() => ({}));

      if (
        !response.ok ||
        !data.valid ||
        !data.coupon
      ) {
        throw new Error(
          data.error || "Coupon code is invalid."
        );
      }

      const discountCents = data.discountCents;
      const totalCents = data.totalCents;

      if (
        typeof discountCents !== "number" ||
        !Number.isSafeInteger(discountCents) ||
        discountCents <= 0 ||
        typeof totalCents !== "number" ||
        !Number.isSafeInteger(totalCents) ||
        totalCents < 0
      ) {
        throw new Error(
          "Coupon pricing could not be verified."
        );
      }

      if (
        data.coupon.code.toUpperCase() !== normalized ||
        !Number.isSafeInteger(data.coupon.amount) ||
        data.coupon.amount <= 0 ||
        !["percentage", "flat"].includes(
          data.coupon.discountType
        )
      ) {
        throw new Error(
          "Coupon response was invalid."
        );
      }

      onApply({
        code: data.coupon.code,
        description: data.coupon.description,
        discountType: data.coupon.discountType,
        amount: data.coupon.amount,
        currency: data.coupon.currency,
        discountCents,
        totalCents,
      });

      setCode("");
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : "Unable to apply coupon."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    if (loading) {
      return;
    }

    onRemove();
    setCode("");
    setError(null);
  }

  if (appliedCoupon) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />

            <div className="min-w-0">
              <p className="break-all text-sm font-semibold text-green-800">
                {appliedCoupon.code}
              </p>

              <p className="mt-0.5 text-xs text-green-700">
                Coupon validated
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove coupon"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-green-700 transition-colors hover:bg-green-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="checkout-coupon-code"
        className="mb-2 block text-sm font-medium"
      >
        Coupon code
      </label>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

          <input
            id="checkout-coupon-code"
            type="text"
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value.toUpperCase()
              );
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleApply();
              }
            }}
            placeholder="SAVE20"
            maxLength={32}
            autoComplete="off"
            disabled={loading}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm uppercase outline-none transition-colors focus:border-[var(--primary)] disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={loading || !code.trim()}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Checking
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}