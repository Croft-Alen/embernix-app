import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import ServiceForm from "@/components/admin/ServiceForm";

import {
  createService,
} from "../actions";

type NewServicePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewServicePage({
  searchParams,
}: NewServicePageProps) {
  const query =
    await searchParams;

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
            Create service
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Add a new service to the Embernix service catalog.
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

      <ServiceForm
        action={
          createService
        }
        submitLabel="Create service"
      />
    </div>
  );
}