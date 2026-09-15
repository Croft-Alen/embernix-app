import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import CouponForm from "@/components/admin/CouponForm";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  updateCoupon,
} from "../../actions";

type EditCouponPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    created?: string;
    saved?: string;
  }>;
};

function toDateTimeLocal(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      16
    );
}

export default async function EditCouponPage({
  params,
  searchParams,
}: EditCouponPageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

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
      id
    )
    .maybeSingle();

  if (
    error ||
    !coupon
  ) {
    notFound();
  }

  const saveCoupon =
    updateCoupon.bind(
      null,
      coupon.id
    );

  const successMessage =
    query.created ===
      "1"
      ? "Coupon created successfully."
      : query.saved ===
          "1"
        ? "Coupon saved successfully."
        : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />

          Coupons
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            {coupon.code}
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit coupon configuration.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <CouponForm
        mode="edit"
        action={
          saveCoupon
        }
        coupon={{
          id:
            coupon.id,

          code:
            coupon.code,

          description:
            coupon.description,

          discount_type:
            coupon.discount_type as
              | "percentage"
              | "flat",

          amount:
            coupon.amount,

          currency:
            coupon.currency,

          active:
            coupon.active,

          expires_at:
            toDateTimeLocal(
              coupon.expires_at
            ),

          usage_limit:
            coupon.usage_limit,

          paddle_discount_id:
            coupon.paddle_discount_id,
        }}
      />
    </div>
  );
}