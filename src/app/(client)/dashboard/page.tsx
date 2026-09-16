import {
  FileText,
  Package,
  ReceiptText,
  Ticket,
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

  const userId =
    user?.id;

  const [
    productsResult,
    ordersResult,
    invoicesResult,
    ticketsResult,
  ] =
    userId
      ? await Promise.all([
          supabase
            .from(
              "customer_products"
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              userId
            )
            .eq(
              "status",
              "active"
            ),

          supabase
            .from(
              "orders"
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from(
              "invoices"
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              userId
            )
            .neq(
              "status",
              "draft"
            ),

          supabase
            .from(
              "tickets"
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              userId
            )
            .in(
              "status",
              [
                "open",
                "in_progress",
              ]
            ),
        ])
      : [
          {
            count: 0,
          },
          {
            count: 0,
          },
          {
            count: 0,
          },
          {
            count: 0,
          },
        ];

  const stats = [
    {
      label:
        "Products",
      value:
        productsResult.count ??
        0,
      icon:
        Package,
    },

    {
      label:
        "Orders",
      value:
        ordersResult.count ??
        0,
      icon:
        ReceiptText,
    },

    {
      label:
        "Invoices",
      value:
        invoicesResult.count ??
        0,
      icon:
        FileText,
    },

    {
      label:
        "Open tickets",
      value:
        ticketsResult.count ??
        0,
      icon:
        Ticket,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[27px] lg:text-[30px]">
            Welcome back,{" "}
            {
              firstName
            }.
          </h1>

          <img
            src="https://images.emojiterra.com/microsoft/fluent-emoji/15.1/1024px/1f44b_color.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
          />
        </div>

        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--muted)] sm:text-base">
          Manage your Embernix products,
          projects, orders, invoices, and
          tickets from one place.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(
          (
            stat
          ) => {
            const Icon =
              stat.icon;

            return (
              <div
                key={
                  stat.label
                }
                className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--muted)]">
                      {
                        stat.label
                      }
                    </p>

                    <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                      {
                        stat.value
                      }
                    </p>
                  </div>

                  <Icon
                    className="mt-0.5 h-5 w-5 text-[var(--primary)]"
                    strokeWidth={
                      2
                    }
                  />
                </div>
              </div>
            );
          }
        )}
      </section>
    </div>
  );
}