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

export async function validateCheckoutCoupon(input: {
  code: string;
  productId: string;
  creemProductId: string;
  productPriceCents: number;
  currency: string;
}): Promise<ValidatedCoupon> {
  const code = input.code.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw new Error("Invalid coupon code.");
  }

  const admin = createAdminClient();

  const { data: coupon, error } = await admin
    .from("coupons")
    .select(
      "code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id"
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to check coupon.");
  }

  if (!coupon || !coupon.active || !coupon.creem_discount_id) {
    throw new Error("Coupon is not available.");
  }

  if (
    coupon.expires_at &&
    new Date(coupon.expires_at).getTime() <= Date.now()
  ) {
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

  const creem = await getCreemDiscountByCode(code);

  if (
    creem.id !== coupon.creem_discount_id ||
    creem.code.toUpperCase() !== code ||
    creem.status !== "active"
  ) {
    throw new Error("Coupon is not active in Creem.");
  }

  if (!creem.products.includes(input.creemProductId)) {
    throw new Error("Coupon does not apply to this product.");
  }

  if (
    creem.expiryDate &&
    new Date(creem.expiryDate).getTime() <= Date.now()
  ) {
    throw new Error("Coupon has expired in Creem.");
  }

  if (
    creem.maxRedemptions !== null &&
    creem.redeemCount >= creem.maxRedemptions
  ) {
    throw new Error("Coupon redemption limit reached.");
  }

  if (
    coupon.usage_limit !== null &&
    Number(coupon.usage_limit) !== creem.maxRedemptions
  ) {
    throw new Error("Coupon usage limits do not match Creem.");
  }

  let discountCents: number;

  if (coupon.discount_type === "percentage") {
    if (
      creem.type !== "percentage" ||
      creem.percentage !== amount ||
      amount > 100
    ) {
      throw new Error("Coupon percentage does not match Creem.");
    }

    discountCents = Math.round(
      (input.productPriceCents * amount) / 100
    );
  } else {
    if (
      creem.type !== "fixed" ||
      creem.amount !== amount ||
      creem.currency?.toUpperCase() !==
        input.currency.toUpperCase() ||
      String(coupon.currency).toUpperCase() !==
        input.currency.toUpperCase()
    ) {
      throw new Error("Coupon amount or currency does not match Creem.");
    }

    discountCents = amount;
  }

  if (
    !Number.isSafeInteger(input.productPriceCents) ||
    input.productPriceCents <= 0
  ) {
    throw new Error("Invalid product price.");
  }

  discountCents = Math.min(
    input.productPriceCents,
    discountCents
  );

  return {
    code,
    description: coupon.description,
    discountType: coupon.discount_type,
    amount,
    currency: coupon.currency,
    discountCents,
    totalCents:
      input.productPriceCents - discountCents,
  };
}
