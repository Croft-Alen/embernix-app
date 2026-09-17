import {
  Bell,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import NotificationsList from "@/components/notifications/NotificationsList";

function iconType(
  type: string
):
  | "ticket"
  | "billing"
  | "project"
  | "product"
  | "general" {
  switch (
    type
  ) {
    case "ticket_reply":
    case "ticket_resolved":
    case "ticket_closed":
      return "ticket";

    case "payment_failed":
      return "billing";

    case "project_in_progress":
    case "project_completed":
    case "project_cancelled":
      return "project";

    case "product_update":
      return "product";

    default:
      return "general";
  }
}

export default async function NotificationsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      notifications,
    error,
  } = await supabase
    .from(
      "notifications"
    )
    .select(`
      id,
      type,
      title,
      message,
      href,
      read_at,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(
      100
    );

  if (
    error
  ) {
    console.error(
      "Failed to load notifications:",
      error
    );
  }

  const items =
    (
      notifications ??
      []
    ).map(
      (
        item
      ) => ({
        ...item,

        category:
          iconType(
            item.type
          ),
      })
    );

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Bell className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[27px]">
              Notifications
            </h1>

            <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
              Important updates about your
              tickets, projects, billing, and
              products.
            </p>
          </div>
        </div>
      </section>

      <NotificationsList
        notifications={
          items
        }
      />
    </div>
  );
}