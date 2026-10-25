import { Package } from "lucide-react";

import type {
  AppliedCoupon,
} from "@/components/checkout/CouponInput";

type CheckoutItem = {
  name: string;
  image_url: string | null;
  version: string | null;
  price_cents: number;
  currency: string;
};

type OrderSummaryProps = {
  item: CheckoutItem;
  appliedCoupon: AppliedCoupon | null;
};

function formatPrice(
  cents: number,
  currency: string
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function OrderSummary({
  item,
  appliedCoupon,
}: OrderSummaryProps) {
  const subtotal = Math.max(0, item.price_cents);

  const discount = Math.min(
    subtotal,
    Math.max(0, appliedCoupon?.discountCents ?? 0)
  );

  const total = subtotal - discount;

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
          {item.image_url ? (
            // Keep the existing image rendering approach.
            // Remote images will be addressed separately.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-5 w-5 text-[var(--muted)]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="break-words font-semibold">
                {item.name}
              </p>

              {item.version && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Version {item.version}
                </p>
              )}

              <p className="mt-1 text-xs text-[var(--muted)]">
                Digital product
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(subtotal, item.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="my-6 border-t border-[var(--border-light)]" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            Subtotal
          </span>

          <span>
            {formatPrice(subtotal, item.currency)}
          </span>
        </div>

        {appliedCoupon && discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-700">
              Discount ({appliedCoupon.code})
            </span>

            <span className="font-medium text-green-700">
              -{formatPrice(discount, item.currency)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            Taxes
          </span>

          <span className="text-[var(--muted)]">
            At checkout
          </span>
        </div>
      </div>

      <div className="my-5 border-t border-[var(--border-light)]" />

      <div className="flex items-end justify-between">
        <div>
          <p className="font-semibold">
            Estimated total
          </p>

          <p className="mt-1 text-xs uppercase text-[var(--muted)]">
            {item.currency}
          </p>
        </div>

        <p className="text-2xl font-semibold tracking-tight">
          {formatPrice(total, item.currency)}
        </p>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        The payment provider will confirm the final
        amount, including any applicable taxes.
      </p>
    </>
  );
}
