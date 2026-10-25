
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  FileText,
  Package,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMoney(
  cents: number | null,
  currency: string | null
) {
  const amount = Number(cents ?? 0);
  const code = currency || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(amount / 100);
  } catch {
    return `${code} ${(amount / 100).toFixed(2)}`;
  }
}

function statusLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ticketStatusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-700";
    case "in_progress":
      return "bg-amber-50 text-amber-700";
    case "resolved":
      return "bg-green-50 text-green-700";
    case "closed":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function invoiceStatusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700";
    case "unpaid":
      return "bg-amber-50 text-amber-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "refunded":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

type DashboardSectionHeaderProps = {
  title: string;
  description: string;
  href: string;
  icon: typeof Package;
};

function DashboardSectionHeader({
  title,
  description,
  href,
  icon: Icon,
}: DashboardSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--foreground)]">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
      >
        View all
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  const firstName =
    String(name).trim().split(" ")[0] || "there";

  const [
    productsResult,
    ticketsResult,
    invoicesResult,
  ] = await Promise.all([
    supabase
      .from("customer_products")
      .select(`
        id,
        product_id,
        status,
        purchased_at,
        products (
          id,
          name,
          version,
          image_url
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("purchased_at", { ascending: false })
      .limit(4),

    supabase
      .from("tickets")
      .select(`
        id,
        subject,
        status,
        created_at,
        updated_at
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),

    supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        currency,
        total_cents,
        created_at
      `)
      .eq("user_id", user.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (productsResult.error) {
    console.error(
      "Failed loading dashboard products:",
      productsResult.error
    );
  }

  if (ticketsResult.error) {
    console.error(
      "Failed loading dashboard tickets:",
      ticketsResult.error
    );
  }

  if (invoicesResult.error) {
    console.error(
      "Failed loading dashboard invoices:",
      invoicesResult.error
    );
  }

  const products = productsResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      {/* WELCOME */}
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[27px] lg:text-[30px]">
            Welcome back, {firstName}.
          </h1>

          <span aria-hidden="true" className="text-3xl">
            👋
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--muted)] sm:text-base">
          Manage your digital products, downloads, invoices,
          and support tickets from one place.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            My Products
          </Link>

          <Link
            href="/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <Ticket className="h-4 w-4" />
            Get Support
          </Link>
        </div>
      </section>

      {/* OWNED DIGITAL PRODUCTS */}
      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <DashboardSectionHeader
          title="My Products"
          description="Your purchased digital products and releases."
          href="/products"
          icon={Package}
        />

        {products.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center sm:px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShoppingBag className="h-7 w-7" />
            </div>

            <h3 className="mt-4 font-semibold text-[var(--foreground)]">
              No products yet
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Your purchased digital products will appear
              here, along with their available downloads
              and updates.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {products.map((ownership) => {
              const rawProduct = ownership.products;

              const product = Array.isArray(rawProduct)
                ? rawProduct[0]
                : rawProduct;

              if (!product) return null;

              return (
                <Link
                  key={ownership.id}
                  href={`/products/${ownership.product_id}`}
                  className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-16 w-16 shrink-0 rounded-xl border border-[var(--border-light)] object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Package className="h-7 w-7" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {product.name}
                    </h3>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {product.version
                        ? `Version ${product.version}`
                        : "Current release"}
                    </p>

                    <p className="mt-2 text-xs text-[var(--muted-light)]">
                      Added {formatDate(ownership.purchased_at)}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* SUPPORT AND BILLING */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <DashboardSectionHeader
            title="Support Tickets"
            description="Your recent support conversations."
            href="/tickets"
            icon={Ticket}
          />

          {tickets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Ticket className="mx-auto h-7 w-7 text-[var(--muted-light)]" />

              <p className="mt-3 text-sm text-[var(--muted)]">
                No support tickets yet.
              </p>

              <Link
                href="/tickets/new"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Open a ticket
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {ticket.subject}
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Updated{" "}
                      {formatDate(
                        ticket.updated_at ?? ticket.created_at
                      )}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${ticketStatusClass(
                      ticket.status
                    )}`}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <DashboardSectionHeader
            title="Invoices"
            description="Your latest billing activity."
            href="/invoices"
            icon={FileText}
          />

          {invoices.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FileText className="mx-auto h-7 w-7 text-[var(--muted-light)]" />

              <p className="mt-3 text-sm text-[var(--muted)]">
                No invoices yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium text-[var(--foreground)]">
                      {invoice.invoice_number}
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(invoice.created_at)}
                      {" · "}
                      {formatMoney(
                        invoice.total_cents,
                        invoice.currency
                      )}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${invoiceStatusClass(
                      invoice.status
                    )}`}
                  >
                    {statusLabel(invoice.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
