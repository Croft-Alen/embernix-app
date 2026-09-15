"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  syncDiscountToPaddle,
  type EmbernixDiscountType,
} from "@/lib/paddle/discounts";

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function nullableString(
  value:
    | FormDataEntryValue
    | null
) {
  const valueString =
    cleanString(value);

  return valueString ||
    null;
}

function parseBoolean(
  value:
    | FormDataEntryValue
    | null
) {
  const parsed =
    cleanString(value);

  return (
    parsed === "true" ||
    parsed === "1" ||
    parsed === "on"
  );
}

function parseInteger(
  value:
    | FormDataEntryValue
    | null
) {
  const parsed =
    Number.parseInt(
      cleanString(value),
      10
    );

  return Number.isNaN(
    parsed
  )
    ? null
    : parsed;
}

function createUrl(
  path: string,
  params: Record<
    string,
    string
  >
) {
  const url =
    new URL(
      path,
      "https://embernix.local"
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  return `${url.pathname}${url.search}`;
}

function redirectError(
  path: string,
  message: string
): never {
  redirect(
    createUrl(
      path,
      {
        error:
          message,
      }
    )
  );
}

/* =========================================================
   ADMIN
========================================================= */

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: admin,
  } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!admin) {
    redirect("/dashboard");
  }

  return user;
}

/* =========================================================
   VALIDATION
========================================================= */

type CouponPayload = {
  code: string;

  description:
    | string
    | null;

  discount_type:
    EmbernixDiscountType;

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
};

function parseCoupon(
  formData: FormData
): CouponPayload {
  const code =
    cleanString(
      formData.get(
        "code"
      )
    ).toUpperCase();

  const description =
    nullableString(
      formData.get(
        "description"
      )
    );

  const rawType =
    cleanString(
      formData.get(
        "discountType"
      )
    );

  const amount =
    parseInteger(
      formData.get(
        "amount"
      )
    );

  const rawCurrency =
    cleanString(
      formData.get(
        "currency"
      )
    ).toUpperCase();

  const active =
    parseBoolean(
      formData.get(
        "active"
      )
    );

  const rawExpiry =
    nullableString(
      formData.get(
        "expiresAt"
      )
    );

  const usageLimit =
    parseInteger(
      formData.get(
        "usageLimit"
      )
    );

  if (
    !/^[A-Z0-9]{1,32}$/.test(
      code
    )
  ) {
    throw new Error(
      "Coupon code must use only letters and numbers and be 1–32 characters."
    );
  }

  if (
    description &&
    description.length >
      500
  ) {
    throw new Error(
      "Description cannot exceed 500 characters."
    );
  }

  if (
    rawType !==
      "percentage" &&
    rawType !==
      "flat"
  ) {
    throw new Error(
      "Invalid discount type."
    );
  }

  const discountType =
    rawType as EmbernixDiscountType;

  if (
    amount === null ||
    amount <= 0
  ) {
    throw new Error(
      "Discount amount must be greater than zero."
    );
  }

  if (
    discountType ===
      "percentage" &&
    amount > 100
  ) {
    throw new Error(
      "Percentage discount cannot exceed 100%."
    );
  }

  let currency:
    | string
    | null =
    null;

  if (
    discountType ===
    "flat"
  ) {
    if (
      rawCurrency.length !==
      3
    ) {
      throw new Error(
        "Flat discounts require a 3-letter currency code."
      );
    }

    currency =
      rawCurrency;
  }

  if (
    usageLimit !== null &&
    usageLimit <= 0
  ) {
    throw new Error(
      "Usage limit must be greater than zero."
    );
  }

  let expiresAt:
    | string
    | null =
    null;

  if (rawExpiry) {
    const parsedDate =
      new Date(
        rawExpiry
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid expiry date."
      );
    }

    expiresAt =
      parsedDate.toISOString();
  }

  return {
    code,

    description,

    discount_type:
      discountType,

    amount,

    currency,

    active,

    expires_at:
      expiresAt,

    usage_limit:
      usageLimit,
  };
}

/* =========================================================
   PADDLE SYNC
========================================================= */

async function syncSavedCouponWithPaddle(
  couponId: string
) {
  const admin =
    createAdminClient();

  const {
    data: coupon,
    error,
  } = await admin
    .from("coupons")
    .select(`
      id,
      code,
      description,
      discount_type,
      amount,
      currency,
      active,
      expires_at,
      usage_limit,
      paddle_discount_id
    `)
    .eq(
      "id",
      couponId
    )
    .maybeSingle();

  if (
    error ||
    !coupon
  ) {
    throw new Error(
      "Unable to load coupon for Paddle sync."
    );
  }

  const result =
    await syncDiscountToPaddle({
      couponId:
        coupon.id,

      code:
        coupon.code,

      description:
        coupon.description,

      discountType:
        coupon.discount_type as EmbernixDiscountType,

      amount:
        coupon.amount,

      currency:
        coupon.currency,

      active:
        coupon.active,

      expiresAt:
        coupon.expires_at,

      usageLimit:
        coupon.usage_limit,

      paddleDiscountId:
        coupon.paddle_discount_id,
    });

  const {
    error: updateError,
  } = await admin
    .from("coupons")
    .update({
      paddle_discount_id:
        result.paddleDiscountId,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      couponId
    );

  if (updateError) {
    throw new Error(
      "Paddle coupon was synchronized but Embernix could not save its Paddle ID."
    );
  }
}

/* =========================================================
   CREATE
========================================================= */

export async function createCoupon(
  formData: FormData
) {
  await requireAdmin();

  let coupon:
    | CouponPayload
    | undefined;

  try {
    coupon =
      parseCoupon(
        formData
      );
  } catch (error) {
    redirectError(
      "/admin/coupons/new",
      error instanceof Error
        ? error.message
        : "Invalid coupon."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: created,
    error,
  } = await admin
    .from("coupons")
    .insert({
      code:
        coupon.code,

      description:
        coupon.description,

      discount_type:
        coupon.discount_type,

      amount:
        coupon.amount,

      currency:
        coupon.currency,

      active:
        coupon.active,

      expires_at:
        coupon.expires_at,

      usage_limit:
        coupon.usage_limit,

      updated_at:
        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (
    error ||
    !created
  ) {
    redirectError(
      "/admin/coupons/new",
      error?.code ===
        "23505"
        ? "A coupon with this code already exists."
        : "Unable to create coupon."
    );
  }

  try {
    await syncSavedCouponWithPaddle(
      created.id
    );
  } catch (error) {
    console.error(
      "Paddle coupon sync failed:",
      error
    );

    revalidatePath(
      "/admin/coupons"
    );

    redirect(
      createUrl(
        `/admin/coupons/${created.id}/edit`,
        {
          error:
            "Coupon was created, but Paddle sync failed. Save it again to retry.",
        }
      )
    );
  }

  revalidatePath(
    "/admin/coupons"
  );

  redirect(
    createUrl(
      `/admin/coupons/${created.id}/edit`,
      {
        created:
          "1",
      }
    )
  );
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateCoupon(
  couponId: string,
  formData: FormData
) {
  await requireAdmin();

  const errorPath =
    `/admin/coupons/${couponId}/edit`;

  let coupon:
    | CouponPayload
    | undefined;

  try {
    coupon =
      parseCoupon(
        formData
      );
  } catch (error) {
    redirectError(
      errorPath,
      error instanceof Error
        ? error.message
        : "Invalid coupon."
    );
  }

  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from("coupons")
    .update({
      code:
        coupon.code,

      description:
        coupon.description,

      discount_type:
        coupon.discount_type,

      amount:
        coupon.amount,

      currency:
        coupon.currency,

      active:
        coupon.active,

      expires_at:
        coupon.expires_at,

      usage_limit:
        coupon.usage_limit,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      couponId
    );

  if (error) {
    redirectError(
      errorPath,
      error.code ===
        "23505"
        ? "A coupon with this code already exists."
        : "Unable to save coupon."
    );
  }

  try {
    await syncSavedCouponWithPaddle(
      couponId
    );
  } catch (error) {
    console.error(
      "Paddle coupon sync failed:",
      error
    );

    revalidatePath(
      "/admin/coupons"
    );

    redirect(
      createUrl(
        errorPath,
        {
          error:
            "Coupon was saved in Embernix, but Paddle sync failed. Save again to retry.",
        }
      )
    );
  }

  revalidatePath(
    "/admin/coupons"
  );

  revalidatePath(
    errorPath
  );

  redirect(
    createUrl(
      errorPath,
      {
        saved:
          "1",
      }
    )
  );
}

/* =========================================================
   ENABLE / DISABLE
========================================================= */

export async function toggleCouponStatus(
  couponId: string,
  nextStatus: boolean
) {
  await requireAdmin();

  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from("coupons")
    .update({
      active:
        nextStatus,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      couponId
    );

  if (error) {
    console.error(
      "Failed to update coupon status:",
      error
    );

    return;
  }

  try {
    await syncSavedCouponWithPaddle(
      couponId
    );
  } catch (error) {
    console.error(
      "Failed to sync coupon status with Paddle:",
      error
    );
  }

  revalidatePath(
    "/admin/coupons"
  );

  revalidatePath(
    `/admin/coupons/${couponId}/edit`
  );
}