"use client";

import {
  CheckCircle2,
  LoaderCircle,
  Tag,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

export type AppliedCoupon = {
  code: string;

  description:
    | string
    | null;

  discountType:
    | "percentage"
    | "flat";

  amount: number;

  currency:
    | string
    | null;

  discountCents: number;

  totalCents: number;
};

type CouponInputProps = {
  productSlug: string;

  appliedCoupon:
    | AppliedCoupon
    | null;

  onApply: (
    coupon: AppliedCoupon
  ) => void;

  onRemove: () => void;
};

export default function CouponInput({
  productSlug,
  appliedCoupon,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [
    code,
    setCode,
  ] = useState("");

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

  async function handleApply() {
    const normalized =
      code
        .trim()
        .toUpperCase();

    if (!normalized) {
      setError(
        "Enter a coupon code."
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/checkout/coupon",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                code:
                  normalized,

                productSlug,
              }),
          }
        );

      const data =
        (await response.json()) as {
          valid?: boolean;

          coupon?: {
            code: string;

            description:
              | string
              | null;

            discountType:
              | "percentage"
              | "flat";

            amount: number;

            currency:
              | string
              | null;
          };

          discountCents?: number;

          totalCents?: number;

          error?: string;
        };

      if (
        !response.ok ||
        !data.valid ||
        !data.coupon
      ) {
        throw new Error(
          data.error ||
            "Coupon code is invalid."
        );
      }

      onApply({
        code:
          data.coupon.code,

        description:
          data.coupon
            .description,

        discountType:
          data.coupon
            .discountType,

        amount:
          data.coupon.amount,

        currency:
          data.coupon.currency,

        discountCents:
          data.discountCents ??
          0,

        totalCents:
          data.totalCents ??
          0,
      });

      setCode("");
    } catch (applyError) {
      setError(
        applyError instanceof
          Error
          ? applyError.message
          : "Unable to apply coupon."
      );
    } finally {
      setLoading(false);
    }
  }

  if (
    appliedCoupon
  ) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-800">
                {
                  appliedCoupon.code
                }
              </p>

              <p className="mt-0.5 text-xs text-green-700">
                Coupon applied
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onRemove
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-green-700 transition-colors hover:bg-green-100"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        Coupon code
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

          <input
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value.toUpperCase()
              );

              if (error) {
                setError(
                  null
                );
              }
            }}
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault();

                void handleApply();
              }
            }}
            placeholder="SAVE20"
            maxLength={32}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm uppercase outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>

        <button
          type="button"
          onClick={
            handleApply
          }
          disabled={
            loading
          }
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}