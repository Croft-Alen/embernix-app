
import Link from "next/link";
import { Eye, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  } catch {
    return `${currency || "USD"} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

export default async function ClientInvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      status,
      currency,
      total_cents,
      issued_at,
      paid_at,
      created_at,
      order_id
    `)
    .eq("user_id", user.id)
    .eq("source", "product")
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load purchase receipts.
        </div>
      </div>
    );
  }

  const rows = invoices ?? [];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] sm:text-[27px]">
          Invoices
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
          View and download receipts for your digital product purchases.
        </p>
      </section>

      {rows.length === 0 ? (
        <section className="flex min-h-[300px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ReceiptText className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-semibold">
              No purchase receipts yet
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Your receipts will appear here automatically after successful digital product purchases.
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              Explore marketplace
            </Link>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="hidden lg:block">
            <div className="grid grid-cols-[minmax(220px,1.5fr)_140px_150px_120px_100px] items-center border-b border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-3">
              {["Invoice", "Purchase date", "Amount paid", "Status", "Action"].map(
                (heading) => (
                  <span
                    key={heading}
                    className="text-xs font-semibold text-[var(--muted)]"
                  >
                    {heading}
                  </span>
                )
              )}
            </div>

            <div className="divide-y divide-[var(--border-light)]">
              {rows.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[minmax(220px,1.5fr)_140px_150px_120px_100px] items-center px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-semibold">
                      {invoice.invoice_number}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Digital product purchase
                    </p>
                  </div>

                  <span className="text-sm text-[var(--muted)]">
                    {formatDate(invoice.paid_at || invoice.issued_at)}
                  </span>

                  <span className="text-sm font-semibold">
                    {formatMoney(
                      Number(invoice.total_cents ?? 0),
                      invoice.currency
                    )}
                  </span>

                  <span className="w-fit rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    Paid
                  </span>

                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[var(--border-light)] lg:hidden">
            {rows.map((invoice) => (
              <div key={invoice.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-semibold">
                      {invoice.invoice_number}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(invoice.paid_at || invoice.issued_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    Paid
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Amount paid
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {formatMoney(
                        Number(invoice.total_cents ?? 0),
                        invoice.currency
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View receipt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
