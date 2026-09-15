import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import ServiceForm from "@/components/admin/ServiceForm";

import {
  updateService,
} from "../../actions";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type EditServicePageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EditServicePage({
  params,
  searchParams,
}: EditServicePageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const admin =
    createAdminClient();

  const {
    data: service,
    error,
  } = await admin
    .from("services")
    .select(`
      id,
      slug,
      name,
      short_description,
      description,
      price_cents,
      currency,
      image_url,
      active,
      sort_order,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    error ||
    !service
  ) {
    notFound();
  }

  const updateAction =
    updateService.bind(
      null,
      service.id
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />

          Services
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            Edit service
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Update{" "}
            <span className="font-medium text-[var(--foreground)]">
              {
                service.name
              }
            </span>
            .
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

      {query.success ===
        "1" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Service updated successfully.
        </div>
      )}

      <ServiceForm
        action={
          updateAction
        }
        service={
          service
        }
        submitLabel="Save changes"
      />
    </div>
  );
}