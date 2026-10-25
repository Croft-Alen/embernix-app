import Link from "next/link";

import {
  ArrowRight,
  Plus,
  Ticket,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

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
    }
  ).format(
    new Date(
      value
    )
  );
}

export default async function TicketsPage() {
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
      tickets,
    error,
  } = await supabase
    .from(
      "tickets"
    )
    .select(`
      id,
      ticket_number,
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
    .eq(
      "user_id",
      user.id
    )
    .order(
      "updated_at",
      {
        ascending:
          false,
      }
    );

  if (
    error
  ) {
    console.error(
      "Failed to load tickets:",
      error
    );
  }

  const rows =
    tickets ??
    [];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[27px]">
              Tickets
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
              View your tickets and conversations with Embernix.
            </p>
          </div>

          <Link
            href="/tickets/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />

            New ticket
          </Link>
        </div>
      </section>

      {rows.length ===
      0 ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5">
          <div className="max-w-sm text-center">
            <Ticket className="mx-auto h-7 w-7 text-[var(--primary)]" />

            <h2 className="mt-4 text-base font-semibold text-[var(--foreground)]">
              No tickets yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Create a ticket whenever you need help from the Embernix team.
            </p>

            <Link
              href="/tickets/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />

              New ticket
            </Link>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="divide-y divide-[var(--border-light)]">
            {rows.map(
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

                return (
                  <Link
                    key={
                      ticket.id
                    }
                    href={`/tickets/${ticket.id}`}
                    className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
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

                        {topic?.name && (
                          <span>
                            {
                              topic.name
                            }
                          </span>
                        )}

                        {priority?.name && (
                          <span>
                            {
                              priority.name
                            }
                          </span>
                        )}

                        <span>
                          {formatDate(
                            ticket.updated_at
                          )}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="hidden h-4 w-4 text-[var(--muted)] sm:block" />
                  </Link>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}