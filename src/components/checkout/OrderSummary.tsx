import {
  Package,
  ShieldCheck,
} from "lucide-react";

type OrderSummaryProps = {
  product: {
    name: string;
    short_description:
      | string
      | null;

    image_url:
      | string
      | null;

    version:
      | string
      | null;

    price_cents: number;
    currency: string;
  };
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
      minimumFractionDigits:
        cents % 100 === 0
          ? 0
          : 2,
    }
  ).format(cents / 100);
}

export default function OrderSummary({
  product,
}: OrderSummaryProps) {
  const price =
    formatPrice(
      product.price_cents,
      product.currency
    );

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] px-6 py-5">
          <h2 className="font-semibold">
            Order summary
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Review your purchase
            before continuing.
          </p>
        </div>

        <div className="p-6">
          <div className="flex gap-4">
            <div className="flex h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
              {product.image_url ? (
                <img
                  src={
                    product.image_url
                  }
                  alt={
                    product.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-6 w-6 text-[var(--muted-light)]" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-semibold leading-6">
                {product.name}
              </p>

              {product.version && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Version{" "}
                  {product.version}
                </p>
              )}

              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                {price}
              </p>
            </div>
          </div>

          {product.short_description && (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {
                product.short_description
              }
            </p>
          )}

          <div className="my-6 h-px bg-[var(--border-light)]" />

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">
                Subtotal
              </span>

              <span>
                {price}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">
                Additional fees
              </span>

              <span>—</span>
            </div>
          </div>

          <div className="my-5 h-px bg-[var(--border-light)]" />

          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold">
                Total
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                {
                  product.currency
                }
              </p>
            </div>

            <p className="text-2xl font-semibold tracking-tight">
              {price}
            </p>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--surface-secondary)] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />

            <p className="text-xs leading-5 text-[var(--muted)]">
              Your product is added
              to your Embernix account
              only after payment is
              successfully confirmed.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}