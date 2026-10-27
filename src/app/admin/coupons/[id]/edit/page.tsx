import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import { notFound } from "next/navigation";

import CouponForm from "@/components/admin/CouponForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCoupon } from "../../actions";

type Props = {
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
  value: string | null
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 16);
}

export default async function EditCouponPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;

  const admin = createAdminClient();

  const { data: coupon, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,amount,currency,active,expires_at,usage_limit,creem_discount_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !coupon) {
    notFound();
  }

  const saveCoupon = updateCoupon.bind(
    null,
    coupon.id
  );

  const {
    data: availableProducts,
    error: productsError,
  } = await admin
    .from("products")
    .select("id,name")
    .eq("active", true)
    .not("creem_product_id", "is", null)
    .order("name");

  const { data: chosen, error: chosenError } =
    await admin
      .from("coupon_products")
      .select("product_id")
      .eq("coupon_id", coupon.id);

  if (productsError || chosenError) {
    throw new Error(
      "Unable to load coupon products."
    );
  }

  const mapped = Boolean(
    coupon.creem_discount_id
  );

  const success =
    query.created === "1"
      ? "Coupon created successfully."
      : query.saved === "1"
        ? "Coupon saved successfully."
        : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Coupons
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            {coupon.code}
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage coupon settings and its Creem connection.
          </p>
        </div>
      </div>

      {query.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {query.error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {coupon.active && mapped && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Coupon synchronized with Creem
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              You can change its description immediately.
              To change the discount code, amount,
              currency, expiry, usage limit, or
              applicable products, first disable this
              coupon from the Coupons list. After
              editing it, enable it to create its
              updated Creem discount.
            </p>
          </div>
        </div>
      )}

      {coupon.active && !mapped && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <p className="text-sm font-semibold text-amber-900">
              Creem synchronization required
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              This coupon exists locally but is not
              mapped to Creem. Open the Coupons list
              and choose Sync to create its matching
              Creem discount.
            </p>
          </div>
        </div>
      )}

      {!coupon.active && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" />

          <div>
            <p className="text-sm font-semibold">
              Coupon inactive
            </p>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              You can edit its discount rules while
              it remains inactive and has no Creem
              mapping. Save your changes before
              enabling it from the Coupons list.
            </p>
          </div>
        </div>
      )}

      <CouponForm
        mode="edit"
        action={saveCoupon}
        products={availableProducts ?? []}
        selectedProductIds={(chosen ?? []).map(
          (item) => item.product_id
        )}
        coupon={{
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discount_type:
            coupon.discount_type as
              | "percentage"
              | "flat",
          amount: coupon.amount,
          currency: coupon.currency,
          active: coupon.active,
          expires_at: toDateTimeLocal(
            coupon.expires_at
          ),
          usage_limit: coupon.usage_limit,
          creem_discount_id:
            coupon.creem_discount_id,
        }}
      />
    </div>
  );
}