
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Hash,
  Info,
  Search,
  TicketPercent,
  TriangleAlert,
  X,
} from "lucide-react";

export type CouponFormData = {
  id: string | null;
  code: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  amount: number;
  currency: string | null;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  creem_discount_id: string | null;
};

type ProductOption = {
  id: string;
  name: string;
};

type Props = {
  coupon: CouponFormData;
  mode: "create" | "edit";
  products: ProductOption[];
  selectedProductIds: string[];
  action:
    | ((formData: FormData) => void)
    | ((formData: FormData) => Promise<void>);
};

const section =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

const label =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const input =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

function currencyDecimals(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function amountForDisplay(
  amount: number,
  currency: string
): string {
  const decimals = currencyDecimals(currency);

  return (amount / 10 ** decimals).toFixed(decimals);
}

export default function CouponForm({
  coupon,
  mode,
  action,
  products,
  selectedProductIds,
}: Props) {
  const [discountType, setDiscountType] = useState<
    "percentage" | "flat"
  >(coupon.discount_type);

  const [currency, setCurrency] = useState(
    coupon.currency ?? "USD"
  );

  const [active, setActive] = useState(coupon.active);

  const [selected, setSelected] = useState<string[]>(
    selectedProductIds
  );

  const [productDropdownOpen, setProductDropdownOpen] =
    useState(false);

  const [productSearch, setProductSearch] = useState("");

  const editing = mode === "edit";
  const mapped = Boolean(coupon.creem_discount_id);

  const decimals = currencyDecimals(currency);

  const fixedStep =
    decimals === 0
      ? "1"
      : `0.${"0".repeat(decimals - 1)}1`;

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const selectedSet = useMemo(
    () => new Set(selected),
    [selected]
  );

  const allSelected =
    products.length > 0 &&
    products.every((product) => selectedSet.has(product.id));

  const selectedNames = products
    .filter((product) => selectedSet.has(product.id))
    .map((product) => product.name);

  const selectionLabel =
    selectedNames.length === 0
      ? "Select products"
      : allSelected
        ? `All products (${products.length})`
        : selectedNames.length === 1
          ? selectedNames[0]
          : `${selectedNames.length} products selected`;

  function toggleProduct(id: string) {
    if (mapped) return;

    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function selectAllProducts() {
    if (mapped) return;

    setSelected(products.map((product) => product.id));
  }

  function clearProducts() {
    if (mapped) return;

    setSelected([]);
  }

  return (
    <form action={action} className="space-y-6">
      <section className={section}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <TicketPercent className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Coupon details
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure a discount customers can use during
              checkout.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="code" className={label}>
              Coupon code
            </label>

            <input
              id="code"
              name="code"
              defaultValue={coupon.code}
              placeholder="SAVE20"
              maxLength={32}
              pattern="[A-Za-z0-9]+"
              autoComplete="off"
              className={`${input} uppercase`}
              required
            />
          </div>

          <div>
            <label htmlFor="discountType" className={label}>
              Discount type
            </label>

            <select
              id="discountType"
              name="discountType"
              value={discountType}
              onChange={(event) =>
                setDiscountType(
                  event.target.value as
                    | "percentage"
                    | "flat"
                )
              }
              className={input}
            >
              <option value="percentage">
                Percentage
              </option>

              <option value="flat">
                Fixed amount
              </option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className={label}>
              Description
            </label>

            <textarea
              id="description"
              name="description"
              defaultValue={coupon.description ?? ""}
              rows={3}
              maxLength={500}
              placeholder="Optional internal description"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </section>

      <section className={section}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            {discountType === "percentage" ? (
              <BadgePercent className="h-5 w-5" />
            ) : (
              <CircleDollarSign className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="font-semibold">
              Discount value
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Set how much this coupon reduces the price.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="amount" className={label}>
              {discountType === "percentage"
                ? "Discount percentage"
                : `Fixed discount (${currency.toUpperCase()})`}
            </label>

            <input
              key={`${discountType}-${currency}`}
              id="amount"
              name="amount"
              type="number"
              min={
                discountType === "percentage"
                  ? "1"
                  : fixedStep
              }
              max={
                discountType === "percentage"
                  ? 100
                  : undefined
              }
              step={
                discountType === "percentage"
                  ? "1"
                  : fixedStep
              }
              defaultValue={
                discountType === coupon.discount_type
                  ? discountType === "percentage"
                    ? coupon.amount
                    : amountForDisplay(
                        coupon.amount,
                        coupon.currency ?? "USD"
                      )
                  : discountType === "percentage"
                    ? 10
                    : 5
              }
              required
              className={input}
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              {discountType === "percentage"
                ? "Example: 20 means 20% off."
                : "Enter the normal currency amount, not cents."}
            </p>
          </div>

          {discountType === "flat" && (
            <div>
              <label htmlFor="currency" className={label}>
                Currency
              </label>

              <input
                id="currency"
                name="currency"
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value.toUpperCase()
                  )
                }
                maxLength={3}
                minLength={3}
                pattern="[A-Za-z]{3}"
                className={`${input} uppercase`}
                required
              />
            </div>
          )}
        </div>
      </section>

      <section className={section}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Availability
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Set optional expiry and redemption limits.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="expiresAt" className={label}>
              Expiration
            </label>

            <input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              defaultValue={coupon.expires_at ?? ""}
              className={input}
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Leave empty for no expiration.
            </p>
          </div>

          <div>
            <label htmlFor="usageLimit" className={label}>
              Usage limit
            </label>

            <div className="relative">
              <Hash className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <input
                id="usageLimit"
                name="usageLimit"
                type="number"
                min="1"
                step="1"
                defaultValue={coupon.usage_limit ?? ""}
                placeholder="Unlimited"
                className={`${input} pl-10`}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--border-light)] pt-6">
          {editing ? (
            <div>
              {coupon.active && (
                <input
                  type="hidden"
                  name="active"
                  value="on"
                />
              )}

              <p className="text-sm font-medium">
                {coupon.active
                  ? "Active locally"
                  : "Inactive locally"}
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Status changes are managed from the coupon
                list.
              </p>
            </div>
          ) : (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(event) =>
                  setActive(event.target.checked)
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />

              <span className="text-sm font-medium">
                Activate coupon
              </span>
            </label>
          )}
        </div>
      </section>

      <section className={section}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <TicketPercent className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Applicable products
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Select any one product, multiple products,
              or all products. There is no fixed product
              selection limit.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="product-picker"
            className={label}
          >
            Products eligible for this coupon
          </label>

          <div className="relative">
            <button
              id="product-picker"
              type="button"
              disabled={mapped}
              aria-expanded={productDropdownOpen}
              aria-controls="coupon-product-options"
              onClick={() =>
                setProductDropdownOpen((open) => !open)
              }
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm transition-colors hover:border-[var(--primary)] ${
                mapped
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                {selectionLabel}
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  productDropdownOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {productDropdownOpen && !mapped && (
              <div
                id="coupon-product-options"
                className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl"
              >
                <div className="border-b border-[var(--border-light)] p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                    <input
                      type="search"
                      value={productSearch}
                      onChange={(event) =>
                        setProductSearch(event.target.value)
                      }
                      placeholder="Search products..."
                      className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-light)] px-3 py-2">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    Select all
                  </button>

                  <span className="text-xs text-[var(--muted)]">
                    {selected.length} selected
                  </span>

                  <button
                    type="button"
                    onClick={clearProducts}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredProducts.length === 0 ? (
                    <p className="px-3 py-5 text-center text-sm text-[var(--muted)]">
                      No products found.
                    </p>
                  ) : (
                    filteredProducts.map((product) => {
                      const isSelected =
                        selectedSet.has(product.id);

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() =>
                            toggleProduct(product.id)
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)]"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {product.name}
                          </span>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[var(--border-light)] p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setProductDropdownOpen(false)
                    }
                    className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedNames.length > 0 && !allSelected && (
            <div className="mt-3 flex flex-wrap gap-2">
              {products
                .filter((product) =>
                  selectedSet.has(product.id)
                )
                .map((product) => (
                  <span
                    key={product.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs"
                  >
                    <span className="max-w-48 truncate">
                      {product.name}
                    </span>

                    {!mapped && (
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() =>
                          toggleProduct(product.id)
                        }
                        className="text-[var(--muted)] hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
            </div>
          )}

          {selected.map((id) => (
            <input
              key={id}
              type="hidden"
              name="productIds"
              value={id}
            />
          ))}

          {products.length === 0 && (
            <p className="mt-3 text-sm text-red-600">
              No active products connected to Creem.
            </p>
          )}

          {selected.length === 0 && (
            <p className="mt-3 text-sm text-amber-700">
              Choose at least one product before saving.
            </p>
          )}

          {mapped && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Disable this coupon before changing its
              applicable products.
            </p>
          )}
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">
          Creem integration
        </h2>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--border)] p-4">
          {!editing ? (
            <Info className="h-5 w-5 text-blue-600" />
          ) : mapped ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <TriangleAlert className="h-5 w-5 text-amber-600" />
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {!editing
                ? "Automatic Creem setup"
                : mapped
                  ? "Creem discount mapped"
                  : "Creem setup required"}
            </p>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {!editing
                ? "Creating an active coupon also creates its Creem discount for the selected products."
                : mapped
                  ? "This coupon is connected to Creem. Disable it before changing discount rules or eligible products."
                  : "This coupon cannot be used at checkout until its Creem mapping is created."}
            </p>

            {mapped && (
              <p className="mt-2 break-all font-mono text-xs">
                {coupon.creem_discount_id}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/admin/coupons"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-5 text-sm font-medium"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={selected.length === 0}
          className="inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editing ? "Save changes" : "Create coupon"}
        </button>
      </div>
    </form>
  );
}
