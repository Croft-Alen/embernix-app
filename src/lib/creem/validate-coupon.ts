import "server-only";

import { getCreemDiscountByCode } from "@/lib/creem/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ValidatedCoupon = {
  code: string;
  description: string | null;
  discountType: "percentage" | "flat";
  amount: number;
  currency: string | null;
  discountCents: number;
  totalCents: number;
};

type ValidateCheckoutCouponInput = {
  code: string;
  productId: string;
  creemProductId: string;
  productPriceCents: number;
  currency: string;
};

function isExpired(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  return !Number.isFinite(time) || time <= Date.now();
}

export async function validateCheckoutCoupon(
  input: ValidateCheckoutCouponInput
): Promise<ValidatedCoupon> {
  const code = input.code.trim().toUpperCase();
  const currency = input.currency.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw new Error("Invalid coupon code.");
  }

  if (
    !input.productId ||
    !/^prod_[A-Za-z0-9_-]+$/.test(input.creemProductId)
  ) {
    throw new Error("Invalid product.");
  }

  if (
    !Number.isSafeInteger(input.productPriceCents) ||
    input.productPriceCents <= 0
  ) {
    throw new Error("Invalid product price.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid product currency.");
  }

  const admin = createAdminClient();

  const { data: coupon, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id"
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to check coupon.");
  }

  if (
    !coupon ||
    !coupon.active ||
    !coupon.creem_discount_id
  ) {
    throw new Error("Coupon is not available.");
  }

  const { data: eligible, error: eligibilityError } = await admin
    .from("coupon_products").select("product_id")
    .eq("coupon_id", coupon.id).eq("product_id", input.productId).maybeSingle();

  if (eligibilityError) {
    throw new Error("Unable to verify coupon product eligibility.");
  }
  if (!eligible) {
    throw new Error("Coupon does not apply to this product.");
  }

  if (isExpired(coupon.expires_at)) {
    throw new Error("Coupon has expired.");
  }

  if (
    coupon.discount_type !== "percentage" &&
    coupon.discount_type !== "flat"
  ) {
    throw new Error("Unsupported coupon type.");
  }

  const amount = Number(coupon.amount);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invalid coupon value.");
  }

  let creem;

  try {
    creem = await getCreemDiscountByCode(code);
  } catch {
    throw new Error(
      "Unable to verify this coupon with Creem."
    );
  }

  if (
    creem.id !== coupon.creem_discount_id ||
    creem.code.toUpperCase() !== code ||
    creem.status !== "active"
  ) {
    throw new Error(
      "Coupon is not active or synchronized with Creem."
    );
  }

  if (
    !creem.products.includes(input.creemProductId)
  ) {
    throw new Error(
      "Coupon does not apply to this product."
    );
  }

  if (isExpired(creem.expiryDate)) {
    throw new Error("Coupon has expired in Creem.");
  }

  if (
    creem.maxRedemptions !== null &&
    (
      !Number.isSafeInteger(creem.maxRedemptions) ||
      creem.maxRedemptions <= 0
    )
  ) {
    throw new Error("Invalid Creem redemption limit.");
  }

  if (
    !Number.isSafeInteger(creem.redeemCount) ||
    creem.redeemCount < 0
  ) {
    throw new Error("Invalid Creem redemption count.");
  }

  if (
    creem.maxRedemptions !== null &&
    creem.redeemCount >= creem.maxRedemptions
  ) {
    throw new Error(
      "Coupon redemption limit has been reached."
    );
  }

  if (
    coupon.usage_limit !== null &&
    Number(coupon.usage_limit) !== creem.maxRedemptions
  ) {
    throw new Error(
      "Coupon usage limit is not synchronized with Creem."
    );
  }

  let discountCents: number;

  if (coupon.discount_type === "percentage") {
    if (
      amount > 100 ||
      creem.type !== "percentage" ||
      creem.percentage !== amount
    ) {
      throw new Error(
        "Coupon percentage does not match Creem."
      );
    }

    discountCents = Math.round(
      (input.productPriceCents * amount) / 100
    );
  } else {
    if (
      creem.type !== "fixed" ||
      creem.amount !== amount ||
      coupon.currency?.toUpperCase() !== currency ||
      creem.currency?.toUpperCase() !== currency
    ) {
      throw new Error(
        "Coupon amount or currency does not match Creem."
      );
    }

    discountCents = amount;
  }

  if (
    !Number.isSafeInteger(discountCents) ||
    discountCents <= 0
  ) {
    throw new Error("Invalid calculated discount.");
  }

  discountCents = Math.min(
    discountCents,
    input.productPriceCents
  );

  return {
    code,
    description: coupon.description,
    discountType: coupon.discount_type,
    amount,
    currency: coupon.currency,
    discountCents,
    totalCents: input.productPriceCents - discountCents,
  };
}
