import Link from "next/link";
import {
  ArrowRight,
  Box,
  FileText,
  Headphones,
  Package,
  ReceiptText,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const firstName =
    String(name).trim().split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Heading */}
      <section>
        <p
          className="text-sm font-medium"
          style={{
            color: "var(--muted)",
          }}
        >
          Dashboard
        </p>

        <div className="h-2" />

        <h1 className="text-3xl font-semibold tracking-[-0.035em]">
          Welcome back, {firstName}.
        </h1>

        <div className="h-3" />

        <p
          className="max-w-2xl text-sm leading-6"
          style={{
            color: "var(--muted)",
          }}
        >
          Manage your Embernix products, projects, orders, invoices, and
          support from one place.
        </p>
      </section>

      <div className="h-8" />

      {/* Overview */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Products"
          description="View your purchased products and downloads."
          icon={<Package size={20} />}
          href="/products"
        />

        <OverviewCard
          title="Projects"
          description="Follow the progress of your active service projects."
          icon={<Box size={20} />}
          href="/projects"
        />

        <OverviewCard
          title="Orders"
          description="Review your Embernix purchase history."
          icon={<ReceiptText size={20} />}
          href="/orders"
        />

        <OverviewCard
          title="Support"
          description="Open and manage your support tickets."
          icon={<Headphones size={20} />}
          href="/tickets"
        />
      </section>

      <div className="h-7" />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        {/* Recent Activity */}
        <div
          className="rounded-[22px] border p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-light)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Recent activity
              </h2>

              <p
                className="mt-1 text-sm"
                style={{
                  color: "var(--muted)",
                }}
              >
                Your latest Embernix account activity will appear here.
              </p>
            </div>
          </div>

          <div className="h-7" />

          <div
            className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-dashed px-5 text-center"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
            }}
          >
            <div className="max-w-sm">
              <div
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-[13px]"
                style={{
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <ReceiptText size={19} />
              </div>

              <div className="h-4" />

              <p className="text-sm font-semibold">
                No activity yet
              </p>

              <p
                className="mt-2 text-sm leading-6"
                style={{
                  color: "var(--muted)",
                }}
              >
                Orders, product purchases, project updates, and support activity
                will appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div
          className="rounded-[22px] border p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-light)",
          }}
        >
          <h2 className="text-lg font-semibold">
            Quick access
          </h2>

          <p
            className="mt-1 text-sm"
            style={{
              color: "var(--muted)",
            }}
          >
            Jump to the areas you use most.
          </p>

          <div className="h-5" />

          <div className="space-y-2">
            <QuickLink
              href="/products"
              label="My Products"
              icon={<Package size={17} />}
            />

            <QuickLink
              href="/projects"
              label="My Projects"
              icon={<Box size={17} />}
            />

            <QuickLink
              href="/invoices"
              label="Invoices"
              icon={<FileText size={17} />}
            />

            <QuickLink
              href="/tickets"
              label="Support Tickets"
              icon={<Headphones size={17} />}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[20px] border p-5 transition-colors hover:bg-[var(--surface-hover)]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-light)",
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[12px]"
        style={{
          background: "var(--primary-soft)",
          color: "var(--primary)",
        }}
      >
        {icon}
      </div>

      <div className="h-5" />

      <h2 className="text-base font-semibold">
        {title}
      </h2>

      <p
        className="mt-2 text-sm leading-6"
        style={{
          color: "var(--muted)",
        }}
      >
        {description}
      </p>
    </Link>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-12 items-center justify-between rounded-[14px] px-3 transition-colors hover:bg-[var(--surface-secondary)]"
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            color: "var(--primary)",
          }}
        >
          {icon}
        </span>

        <span className="text-sm font-medium">
          {label}
        </span>
      </div>

      <ArrowRight
        size={16}
        style={{
          color: "var(--muted)",
        }}
      />
    </Link>
  );
}