import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Package,
  Ticket,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import Button from "@/components/ui/Button";

import TicketConversation, {
  type TicketMessage,
} from "@/components/tickets/TicketConversation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  closeTicket,
} from "../actions";

type TicketPageProps = {
  params: Promise<{
    id: string;
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
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}

export default async function TicketPage({
  params,
}: TicketPageProps) {
  const {
    id,
  } =
    await params;

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
      ticket,
    error:
      ticketError,
  } = await supabase
    .from(
      "tickets"
    )
    .select(`
      id,
      ticket_number,
      subject,
      status,
      product_id,
      created_at,
      updated_at,
      closed_at,

      ticket_topics (
        name
      ),

      ticket_priorities (
        name,
        slug
      ),

      products (
        id,
        name
      )
    `)
    .eq(
      "id",
      id
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    ticketError ||
    !ticket
  ) {
    notFound();
  }

  const {
    data:
      replies,
    error:
      repliesError,
  } = await supabase
    .from(
      "ticket_replies"
    )
    .select(`
      id,
      user_id,
      message,
      is_admin,
      created_at,

      ticket_attachments (
        id,
        file_name,
        file_type,
        file_size
      ),

      ticket_reactions (
        id,
        user_id,
        emoji
      )
    `)
    .eq(
      "ticket_id",
      ticket.id
    )
    .order(
      "created_at",
      {
        ascending:
          true,
      }
    );

  if (
    repliesError
  ) {
    console.error(
      "Failed to load ticket messages:",
      repliesError
    );
  }

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

  const product =
    Array.isArray(
      ticket.products
    )
      ? ticket.products[0]
      : ticket.products;

  const messages:
    TicketMessage[] =
    (
      replies ??
      []
    ).map(
      (
        reply
      ) => ({
        id:
          reply.id,

        user_id:
          reply.user_id,

        message:
          reply.message,

        is_admin:
          reply.is_admin,

        created_at:
          reply.created_at,

        attachments:
          reply.ticket_attachments ??
          [],

        reactions:
          reply.ticket_reactions ??
          [],
      })
    );

  const name =
    user.user_metadata
      ?.full_name ||
    user.user_metadata
      ?.name ||
    user.email?.split(
      "@"
    )[0] ||
    "You";

  const isClosed =
    ticket.status ===
    "closed";

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Tickets
      </Link>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-medium text-[var(--muted)]">
                {
                  ticket.ticket_number
                }
              </span>

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

            <h1 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[28px]">
              {
                ticket.subject
              }
            </h1>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />

                {formatDate(
                  ticket.created_at
                )}
              </div>

              {topic?.name && (
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />

                  {
                    topic.name
                  }
                </div>
              )}

              {product?.name && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />

                  {
                    product.name
                  }
                </div>
              )}
            </div>
          </div>

          {!isClosed && (
            <form
              action={
                closeTicket
              }
            >
              <input
                type="hidden"
                name="ticketId"
                value={
                  ticket.id
                }
              />

              <Button
                type="submit"
                variant="secondary"
              >
                Close ticket
              </Button>
            </form>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
        <TicketConversation
          ticketId={
            ticket.id
          }
          currentUserId={
            user.id
          }
          customerName={
            name
          }
          messages={
            messages
          }
          closed={
            isClosed
          }
        />

        <aside className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 xl:sticky xl:top-[104px]">
          <InfoItem
            label="Status"
          >
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                ticket.status
              )}`}
            >
              {statusLabel(
                ticket.status
              )}
            </span>
          </InfoItem>

          <Divider />

          <InfoItem
            label="Priority"
          >
            {
              priority?.name ??
              "—"
            }
          </InfoItem>

          <Divider />

          <InfoItem
            label="Topic"
          >
            {
              topic?.name ??
              "—"
            }
          </InfoItem>

          {product?.name && (
            <>
              <Divider />

              <InfoItem
                label="Product"
              >
                {
                  product.name
                }
              </InfoItem>
            </>
          )}

          <Divider />

          <InfoItem
            label="Created"
          >
            {formatDate(
              ticket.created_at
            )}
          </InfoItem>

          <Divider />

          <InfoItem
            label="Last updated"
          >
            {formatDate(
              ticket.updated_at
            )}
          </InfoItem>
        </aside>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-4 border-t border-[var(--border-light)]" />
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--muted)]">
        {
          label
        }
      </p>

      <div className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
        {
          children
        }
      </div>
    </div>
  );
}