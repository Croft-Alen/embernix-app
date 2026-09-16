import Link from "next/link";

import {
  BriefcaseBusiness,
  Headphones,
  Package,
  ReceiptText,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const name =
    user?.user_metadata
      ?.full_name ||
    user?.user_metadata
      ?.name ||
    user?.email?.split(
      "@"
    )[0] ||
    "there";

  const firstName =
    String(
      name
    )
      .trim()
      .split(
        " "
      )[0] ||
    "there";

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      {/* Welcome */}
      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 lg:p-7">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <h1 className="min-w-0 text-[22px] font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-2xl lg:text-[28px]">
            Welcome back,{" "}
            {
              firstName
            }.
          </h1>

          <img
            src="https://images.emojiterra.com/microsoft/fluent-emoji/15.1/1024px/1f44b_color.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
          />
        </div>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Manage your Embernix products,
          projects, orders, invoices, and
          support from one place.
        </p>
      </section>

      {/* Workspace */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Your workspace
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceCard
            title="Products"
            description="Access your purchased products and downloads."
            icon={
              <Package
                className="h-5 w-5"
              />
            }
            href="/products"
          />

          <WorkspaceCard
            title="Projects"
            description="Track your active Embernix service projects."
            icon={
              <BriefcaseBusiness
                className="h-5 w-5"
              />
            }
            href="/projects"
          />

          <WorkspaceCard
            title="Orders"
            description="Review purchases and order history."
            icon={
              <ReceiptText
                className="h-5 w-5"
              />
            }
            href="/orders"
          />

          <WorkspaceCard
            title="Support"
            description="View and manage your support requests."
            icon={
              <Headphones
                className="h-5 w-5"
              />
            }
            href="/tickets"
          />
        </div>
      </section>
    </div>
  );
}

function WorkspaceCard({
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
      href={
        href
      }
      className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--primary)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        {
          icon
        }
      </div>

      <div className="mt-5">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
          {
            title
          }
        </h3>

        <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
          {
            description
          }
        </p>
      </div>
    </Link>
  );
}