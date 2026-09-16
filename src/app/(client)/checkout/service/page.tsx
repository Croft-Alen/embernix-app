import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import ServiceCheckoutForm from "@/components/checkout/ServiceCheckoutForm";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createServiceInvoice,
} from "./actions";

type ServiceCheckoutPageProps = {
  searchParams: Promise<{
    service?: string;
    error?: string;
  }>;
};

export default async function ServiceCheckoutPage({
  searchParams,
}: ServiceCheckoutPageProps) {
  const query =
    await searchParams;

  const slug =
    query.service?.trim();

  if (!slug) {
    redirect("/services");
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/checkout/service?service=${slug}`
      )}`
    );
  }

  const admin =
    createAdminClient();

  const [
    serviceResult,
    billingResult,
  ] =
    await Promise.all([
      admin
        .from("services")
        .select(`
          id,
          slug,
          name,
          short_description,
          price_cents,
          currency,
          active
        `)
        .eq(
          "slug",
          slug
        )
        .eq(
          "active",
          true
        )
        .maybeSingle(),

      admin
        .from(
          "billing_profiles"
        )
        .select(`
          company_name,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        `)
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle(),
    ]);

  if (
    serviceResult.error ||
    !serviceResult.data
  ) {
    notFound();
  }

  const service =
    serviceResult.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href={`/services/${service.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />

          {service.name}
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            Checkout
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Confirm your billing details before creating the invoice.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            query.error
          }
        </div>
      )}

      <ServiceCheckoutForm
        service={{
          id:
            service.id,

          slug:
            service.slug,

          name:
            service.name,

          short_description:
            service.short_description,

          price_cents:
            Number(
              service.price_cents
            ),

          currency:
            service.currency,
        }}
        billingProfile={
          billingResult.data ??
          null
        }
        action={
          createServiceInvoice
        }
      />
    </div>
  );
}