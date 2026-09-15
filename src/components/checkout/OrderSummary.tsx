import {
  Package,
} from "lucide-react";

type Product = {
  name: string;
  image_url: string | null;
  version: string | null;
  price_cents: number;
  currency: string;
};

type OrderSummaryProps = {
  product: Product;
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
    <>
      {/* ITEM */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
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
              <Package className="h-5 w-5 text-[var(--muted)]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">
                {product.name}
              </p>

              {product.version && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Version{" "}
                  {product.version}
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {price}
            </p>
          </div>
        </div>
      </div>

      <div className="my-6 border-t border-[var(--border-light)]" />

      {/* TOTALS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            Subtotal
          </span>

          <span>{price}</span>
        </div>

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
            {product.currency}
          </p>
        </div>

        <p className="text-2xl font-semibold tracking-tight">
          {price}
        </p>
      </div>
    </>
  );
}