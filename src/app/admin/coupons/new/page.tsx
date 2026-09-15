import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import CouponForm from "@/components/admin/CouponForm";

import {
  createCoupon,
} from "../actions";

type NewCouponPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewCouponPage({
  searchParams,
}: NewCouponPageProps) {
  const query =
    await searchParams;

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
            Add coupon
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Create a new Embernix discount code.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      <CouponForm
        mode="create"
        action={
          createCoupon
        }
        coupon={{
          id: null,

          code: "",

          description:
            "",

          discount_type:
            "percentage",

          amount:
            10,

          currency:
            "USD",

          active:
            true,

          expires_at:
            null,

          usage_limit:
            null,

          paddle_discount_id:
            null,
        }}
      />
    </div>
  );
}