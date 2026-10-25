import type {
  CreateDiscountRequestBody,
  UpdateDiscountRequestBody,
} from "@paddle/paddle-node-sdk";

import {
  getPaddle,
} from "@/lib/paddle/server";

export type EmbernixDiscountType =
  | "percentage"
  | "flat";

export type PaddleDiscountInput = {
  couponId: string;

  code: string;

  description:
    | string
    | null;

  discountType:
    EmbernixDiscountType;

  amount: number;

  currency:
    | string
    | null;

  active: boolean;

  expiresAt:
    | string
    | null;

  usageLimit:
    | number
    | null;

  paddleDiscountId:
    | string
    | null;
};

export type PaddleDiscountSyncResult = {
  paddleDiscountId: string;
};

function normalizeCode(
  code: string
) {
  return code
    .trim()
    .toUpperCase();
}

function normalizeCurrency(
  currency:
    | string
    | null
) {
  return (
    currency ??
    "USD"
  )
    .trim()
    .toUpperCase();
}

function paddleDescription(
  input: PaddleDiscountInput
) {
  const description =
    input.description?.trim();

  if (description) {
    return description.slice(
      0,
      500
    );
  }

  return `Embernix coupon ${normalizeCode(
    input.code
  )}`;
}

function buildCreatePayload(
  input: PaddleDiscountInput
): CreateDiscountRequestBody {
  const base = {
    description:
      paddleDescription(
        input
      ),

    type:
      input.discountType,

    amount:
      String(
        input.amount
      ),

    code:
      normalizeCode(
        input.code
      ),

    enabledForCheckout:
      true,

    recur:
      false,

    usageLimit:
      input.usageLimit,

    expiresAt:
      input.expiresAt,

    customData: {
      embernix_coupon_id:
        input.couponId,
    },
  };

  if (
    input.discountType ===
    "flat"
  ) {
    return {
      ...base,

      currencyCode:
        normalizeCurrency(
          input.currency
        ) as never,
    };
  }

  return base;
}

function buildUpdatePayload(
  input: PaddleDiscountInput
): UpdateDiscountRequestBody {
  const base = {
    status:
      input.active
        ? "active"
        : "archived",

    description:
      paddleDescription(
        input
      ),

    enabledForCheckout:
      input.active,

    code:
      normalizeCode(
        input.code
      ),

    type:
      input.discountType,

    amount:
      String(
        input.amount
      ),

    recur:
      false,

    usageLimit:
      input.usageLimit,

    expiresAt:
      input.expiresAt,

    customData: {
      embernix_coupon_id:
        input.couponId,
    },
  } satisfies UpdateDiscountRequestBody;

  if (
    input.discountType ===
    "flat"
  ) {
    return {
      ...base,

      currencyCode:
        normalizeCurrency(
          input.currency
        ) as never,
    };
  }

  return {
    ...base,

    currencyCode:
      null,
  };
}

export async function createPaddleDiscount(
  input: PaddleDiscountInput
) {
  const paddle =
    getPaddle();

  const discount =
    await paddle.discounts.create(
      buildCreatePayload(
        input
      )
    );

  if (!discount?.id) {
    throw new Error(
      "Paddle did not return a discount ID."
    );
  }

  /*
   * Paddle creates discounts active by default.
   * If Admin created it disabled, archive it
   * immediately after creation.
   */
  if (!input.active) {
    await paddle.discounts.update(
      discount.id,
      {
        status:
          "archived",

        enabledForCheckout:
          false,
      }
    );
  }

  return discount;
}

export async function updatePaddleDiscount(
  paddleDiscountId: string,
  input: PaddleDiscountInput
) {
  const paddle =
    getPaddle();

  return paddle.discounts.update(
    paddleDiscountId,
    buildUpdatePayload(
      input
    )
  );
}

export async function syncDiscountToPaddle(
  input: PaddleDiscountInput
): Promise<PaddleDiscountSyncResult> {
  /*
   * No Paddle ID yet:
   * create a fresh Paddle discount.
   */
  if (
    !input.paddleDiscountId
  ) {
    const created =
      await createPaddleDiscount(
        input
      );

    return {
      paddleDiscountId:
        created.id,
    };
  }

  /*
   * Existing Paddle discount:
   * update it in place.
   */
  try {
    const updated =
      await updatePaddleDiscount(
        input.paddleDiscountId,
        input
      );

    return {
      paddleDiscountId:
        updated.id,
    };
  } catch (error) {
    console.error(
      "Existing Paddle discount update failed:",
      error
    );

    throw error;
  }
}