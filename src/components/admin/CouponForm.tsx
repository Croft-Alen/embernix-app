"use client";

import Link from "next/link";

import {
  BadgePercent,
  CalendarDays,
  CircleDollarSign,
  Hash,
  TicketPercent,
} from "lucide-react";

import {
  useState,
} from "react";

export type CouponFormData = {
  id:
    | string
    | null;

  code: string;

  description:
    | string
    | null;

  discount_type:
    | "percentage"
    | "flat";

  amount: number;

  currency:
    | string
    | null;

  active: boolean;

  expires_at:
    | string
    | null;

  usage_limit:
    | number
    | null;

  paddle_discount_id:
    | string
    | null;
};

type CouponFormProps = {
  coupon: CouponFormData;

  mode:
    | "create"
    | "edit";

  action:
    | ((formData: FormData) => void)
    | ((formData: FormData) => Promise<void>);
};

const sectionClass =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

const labelClass =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

const textareaClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]";

export default function CouponForm({
  coupon,
  mode,
  action,
}: CouponFormProps) {
  const [
    discountType,
    setDiscountType,
  ] = useState<
    | "percentage"
    | "flat"
  >(
    coupon.discount_type
  );

  const paddleConnected =
    Boolean(
      coupon.paddle_discount_id
    );

  return (
    <form
      action={action}
      className="space-y-6"
    >
      {/* MAIN */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <TicketPercent className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Coupon
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure the customer discount code.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="code"
              className={labelClass}
            >
              Coupon code
            </label>

            <input
              id="code"
              name="code"
              defaultValue={
                coupon.code
              }
              maxLength={32}
              pattern="[A-Za-z0-9]+"
              placeholder="SAVE20"
              className={`${inputClass} uppercase`}
              required
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Letters and numbers only. Maximum 32 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="discountType"
              className={labelClass}
            >
              Discount type
            </label>

            <select
              id="discountType"
              name="discountType"
              value={
                discountType
              }
              onChange={(event) =>
                setDiscountType(
                  event.target
                    .value as
                    | "percentage"
                    | "flat"
                )
              }
              className={inputClass}
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
            <label
              htmlFor="description"
              className={labelClass}
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              defaultValue={
                coupon.description ??
                ""
              }
              maxLength={500}
              rows={3}
              placeholder="Summer promotion"
              className={textareaClass}
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Internal description used in Embernix and Paddle.
            </p>
          </div>
        </div>
      </section>

      {/* DISCOUNT */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            {discountType ===
            "percentage" ? (
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
              Set how much the coupon reduces the purchase price.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="amount"
              className={labelClass}
            >
              {discountType ===
              "percentage"
                ? "Percentage"
                : "Amount in cents"}
            </label>

            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              max={
                discountType ===
                "percentage"
                  ? 100
                  : undefined
              }
              step="1"
              defaultValue={
                coupon.amount
              }
              className={inputClass}
              required
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              {discountType ===
              "percentage"
                ? "Example: 20 = 20% off."
                : "Example: 500 = $5.00 off."}
            </p>
          </div>

          {discountType ===
            "flat" && (
            <div>
              <label
                htmlFor="currency"
                className={labelClass}
              >
                Currency
              </label>

              <input
                id="currency"
                name="currency"
                defaultValue={
                  coupon.currency ??
                  "USD"
                }
                maxLength={3}
                className={`${inputClass} uppercase`}
                required
              />
            </div>
          )}
        </div>
      </section>

      {/* LIMITS */}
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Availability
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional expiry and redemption limits.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="expiresAt"
              className={labelClass}
            >
              Expires at
            </label>

            <input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              defaultValue={
                coupon.expires_at ??
                ""
              }
              className={inputClass}
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Leave empty for no expiry.
            </p>
          </div>

          <div>
            <label
              htmlFor="usageLimit"
              className={labelClass}
            >
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
                defaultValue={
                  coupon.usage_limit ??
                  ""
                }
                placeholder="Unlimited"
                className={`${inputClass} pl-10`}
              />
            </div>

            <p className="mt-2 text-xs text-[var(--muted)]">
              Leave empty for unlimited redemptions.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked={
                  coupon.active
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />

              <span>
                <span className="block text-sm font-medium">
                  Active coupon
                </span>

                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Customers can use this coupon while it is active.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* PADDLE */}
      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">
              Paddle
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Paddle discount synchronization is managed automatically.
            </p>
          </div>

          {paddleConnected ? (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Not connected
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-[var(--muted)]">
            Paddle Discount ID
          </p>

          <div className="mt-2 break-all rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm">
            {coupon.paddle_discount_id ??
              "Created automatically when saved"}
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link
          href="/admin/coupons"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {mode === "create"
            ? "Create coupon"
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}