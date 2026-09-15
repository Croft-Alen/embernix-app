import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import InvoiceForm, {
  type InvoiceCustomer,
} from "@/components/admin/InvoiceForm";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createInvoice,
} from "../actions";

type NewInvoicePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const query =
    await searchParams;

  const admin =
    createAdminClient();

  const [
    profilesResult,
    authResult,
  ] =
    await Promise.all([
      admin
        .from("profiles")
        .select(`
          id,
          full_name
        `),

      admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

  const profileNames =
    new Map<
      string,
      string
    >();

  for (
    const profile of
      profilesResult.data ??
      []
  ) {
    if (
      profile.full_name
    ) {
      profileNames.set(
        profile.id,
        profile.full_name
      );
    }
  }

  const customers:
    InvoiceCustomer[] =
    (
      authResult.data
        .users ?? []
    )
      .filter(
        (user) =>
          Boolean(
            user.email
          )
      )
      .map(
        (user) => {
          const metadataName =
            user.user_metadata
              ?.full_name ||
            user.user_metadata
              ?.name ||
            null;

          return {
            id:
              user.id,

            name:
              profileNames.get(
                user.id
              ) ||
              metadataName ||
              "Unnamed customer",

            email:
              user.email ||
              "—",
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          a.name.localeCompare(
            b.name
          )
      );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            Create invoice
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Create a manual invoice for a customer.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      )}

      {customers.length ===
        0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
          <h2 className="font-semibold">
            No customers available
          </h2>

          <p className="mt-2 text-sm text-[var(--muted)]">
            At least one customer account is required before creating an invoice.
          </p>
        </div>
      ) : (
        <InvoiceForm
          customers={
            customers
          }
          action={
            createInvoice
          }
        />
      )}
    </div>
  );
}