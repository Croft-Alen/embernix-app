import Link from "next/link";

import {
  ArrowRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Ticket,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type AdminTicketsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function statusLabel(
  status: string
) {
  switch (
    status
  ) {
    case "open":
      return "Open";

    case "in_progress":
      return "In progress";

    case "resolved":
      return "Resolved";

    case "closed":
      return "Closed";

    default:
      return status;
  }
}

function statusClass(
  status: string
) {
  switch (
    status
  ) {
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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

const statusFilters = [
  {
    label:
      "All",
    value:
      "all",
  },

  {
    label:
      "Open",
    value:
      "open",
  },

  {
    label:
      "In progress",
    value:
      "in_progress",
  },

  {
    label:
      "Resolved",
    value:
      "resolved",
  },

  {
    label:
      "Closed",
    value:
      "closed",
  },
];

export default async function AdminTicketsPage({
  searchParams,
}: AdminTicketsPageProps) {
  const query =
    await searchParams;

  const currentStatus =
    [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ].includes(
      query.status ??
        ""
    )
      ? query.status!
      : "all";

  const admin =
    createAdminClient();

  let ticketQuery =
    admin
      .from(
        "tickets"
      )
      .select(`
        id,
        ticket_number,
        user_id,
        subject,
        status,
        created_at,
        updated_at,
        ticket_topics (
          name
        ),
        ticket_priorities (
          name,
          slug
        )
      `)
      .order(
        "updated_at",
        {
          ascending:
            false,
        }
      );

  if (
    currentStatus !==
    "all"
  ) {
    ticketQuery =
      ticketQuery.eq(
        "status",
        currentStatus
      );
  }

  const [
    ticketsResult,
    allTicketsResult,
  ] =
    await Promise.all([
      ticketQuery,

      admin
        .from(
          "tickets"
        )
        .select(
          "id, status, user_id"
        ),
    ]);

  if (
    ticketsResult.error
  ) {
    console.error(
      "Failed to load admin tickets:",
      ticketsResult.error
    );
  }

  const tickets =
    ticketsResult.data ??
    [];

  const allTickets =
    allTicketsResult.data ??
    [];

  const userIds =
    Array.from(
      new Set(
        tickets.map(
          (
            ticket
          ) =>
            ticket.user_id
        )
      )
    );

  const {
    data:
      profiles,
  } =
    userIds.length >
    0
      ? await admin
          .from(
            "profiles"
          )
          .select(
            "id, full_name"
          )
          .in(
            "id",
            userIds
          )
      : {
          data: [],
        };

  const profileMap =
    new Map(
      (
        profiles ??
        []
      ).map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );

  const counts = {
    all:
      allTickets.length,

    open:
      allTickets.filter(
        (
          ticket
        ) =>
          ticket.status ===
          "open"
      ).length,

    in_progress:
      allTickets.filter(
        (
          ticket
        ) =>
          ticket.status ===
          "in_progress"
      ).length,

    resolved:
      allTickets.filter(
        (
          ticket
        ) =>
          ticket.status ===
          "resolved"
      ).length,

    closed:
      allTickets.filter(
        (
          ticket
        ) =>
          ticket.status ===
          "closed"
      ).length,
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7">
        <h1 className="text-[25px] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          Tickets
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Manage customer conversations and ticket status.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open"
          value={
            counts.open
          }
          icon={
            CircleDot
          }
        />

        <StatCard
          label="In progress"
          value={
            counts.in_progress
          }
          icon={
            Clock3
          }
        />

        <StatCard
          label="Resolved"
          value={
            counts.resolved
          }
          icon={
            CircleCheck
          }
        />

        <StatCard
          label="All tickets"
          value={
            counts.all
          }
          icon={
            Ticket
          }
        />
      </section>

      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] p-2">
          {statusFilters.map(
            (
              filter
            ) => {
              const active =
                currentStatus ===
                filter.value;

              const count =
                counts[
                  filter.value as keyof typeof counts
                ];

              const href =
                filter.value ===
                "all"
                  ? "/admin/tickets"
                  : `/admin/tickets?status=${filter.value}`;

              return (
                <Link
                  key={
                    filter.value
                  }
                  href={
                    href
                  }
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {
                    filter.label
                  }

                  <span
                    className={`text-xs ${
                      active
                        ? "text-[var(--primary)]"
                        : "text-[var(--muted-light)]"
                    }`}
                  >
                    {
                      count
                    }
                  </span>
                </Link>
              );
            }
          )}
        </div>

        {tickets.length ===
        0 ? (
          <div className="flex min-h-[300px] items-center justify-center px-5">
            <div className="text-center">
              <Ticket className="mx-auto h-7 w-7 text-[var(--primary)]" />

              <h2 className="mt-4 text-sm font-semibold">
                No tickets found
              </h2>

              <p className="mt-2 text-sm text-[var(--muted)]">
                There are no tickets in this view.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {tickets.map(
              (
                ticket
              ) => {
                const topic =
                  Array.isArray(
                    ticket.ticket_topics
                  )
                    ? ticket.ticket_topics[0]
                    : ticket.ticket_topics;

                const priority =
                  Array.isArray(
                    ticket.ticket_priorities
                  )
                    ? ticket.ticket_priorities[0]
                    : ticket.ticket_priorities;

                const profile =
                  profileMap.get(
                    ticket.user_id
                  );

                return (
                  <Link
                    key={
                      ticket.id
                    }
                    href={`/admin/tickets/${ticket.id}`}
                    className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_180px_150px_120px_24px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {
                            ticket.subject
                          }
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(
                            ticket.status
                          )}`}
                        >
                          {statusLabel(
                            ticket.status
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                        <span className="font-mono">
                          {
                            ticket.ticket_number
                          }
                        </span>

                        <span>
                          {profile?.full_name ||
                            "Customer"}
                        </span>

                        <span>
                          {formatDate(
                            ticket.updated_at
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-xs text-[var(--muted)]">
                        Topic
                      </p>

                      <p className="mt-1 truncate text-sm font-medium">
                        {topic?.name ||
                          "—"}
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-xs text-[var(--muted)]">
                        Priority
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {priority?.name ||
                          "—"}
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-xs text-[var(--muted)]">
                        Created
                      </p>

                      <p className="mt-1 text-sm">
                        {formatDate(
                          ticket.created_at
                        )}
                      </p>
                    </div>

                    <ArrowRight className="hidden h-4 w-4 text-[var(--muted)] lg:block" />
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon:
    typeof Ticket;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {
              label
            }
          </p>

          <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            {
              value
            }
          </p>
        </div>

        <Icon className="h-5 w-5 text-[var(--primary)]" />
      </div>
    </div>
  );
}