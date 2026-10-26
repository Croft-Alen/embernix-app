"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Hash,
  Info,
  TicketPercent,
  TriangleAlert,
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

type Props = {
  coupon: CouponFormData;
  mode: "create" | "edit";
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
}: Props) {
  const [discountType, setDiscountType] = useState<
    "percentage" | "flat"
  >(coupon.discount_type);

  const [currency, setCurrency] = useState(
    coupon.currency ?? "USD"
  );

  const [active, setActive] = useState(coupon.active);

  const editing = mode === "edit";
  const mapped = Boolean(coupon.creem_discount_id);
  const decimals = currencyDecimals(currency);
  const fixedStep =
    decimals === 0 ? "1" : `0.${"0".repeat(decimals - 1)}1`;

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
              Configure a discount customers can use
              during checkout.
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
                  event.target.value as "percentage" | "flat"
                )
              }
              className={input}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Fixed amount</option>
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
            <h2 className="font-semibold">Discount value</h2>
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
                  setCurrency(event.target.value.toUpperCase())
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
            <h2 className="font-semibold">Availability</h2>
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
                Status changes are managed from the coupon list.
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
                ? "Creating an active coupon also creates its Creem discount."
                : mapped
                  ? "The discount ID is stored automatically. Financial-rule edits are restricted until synchronization is supported."
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
          className="inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white"
        >
          {editing ? "Save changes" : "Create coupon"}
        </button>
      </div>
    </form>
  );
}