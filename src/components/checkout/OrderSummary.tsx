import {
  Package,
  Wrench,
} from "lucide-react";

import type {
  AppliedCoupon,
} from "@/components/checkout/CouponInput";

type CheckoutItemType =
  | "product"
  | "service";

type CheckoutItem = {
  name: string;
  image_url: string | null;
  version: string | null;
  price_cents: number;
  currency: string;
};

type OrderSummaryProps = {
  item: CheckoutItem;
  itemType: CheckoutItemType;
  appliedCoupon:
    | AppliedCoupon
    | null;
};

function formatPrice(
  cents: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }
  ).format(
    cents / 100
  );
}

export default function OrderSummary({
  item,
  itemType,
  appliedCoupon,
}: OrderSummaryProps) {
  const subtotal =
    item.price_cents;

  const discount =
    appliedCoupon
      ?.discountCents ??
    0;

  const total =
    Math.max(
      0,
      subtotal -
        discount
    );

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
          {item.image_url ? (
            <img
              src={
                item.image_url
              }
              alt={
                item.name
              }
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {itemType ===
              "service" ? (
                <Wrench className="h-5 w-5 text-[var(--muted)]" />
              ) : (
                <Package className="h-5 w-5 text-[var(--muted)]" />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">
                {item.name}
              </p>

              {itemType ===
                "product" &&
                item.version && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Version{" "}
                    {
                      item.version
                    }
                  </p>
                )}

              {itemType ===
                "service" && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Professional service
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(
                subtotal,
                item.currency
              )}
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
            {formatPrice(
              subtotal,
              item.currency
            )}
          </span>
        </div>

        {appliedCoupon &&
          discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">
                Discount (
                {
                  appliedCoupon.code
                }
                )
              </span>

              <span className="font-medium text-green-700">
                -
                {formatPrice(
                  discount,
                  item.currency
                )}
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
            Total
          </p>

          <p className="mt-1 text-xs uppercase text-[var(--muted)]">
            {item.currency}
          </p>
        </div>

        <p className="text-2xl font-semibold tracking-tight">
          {formatPrice(
            total,
            item.currency
          )}
        </p>
      </div>
    </>
  );
}