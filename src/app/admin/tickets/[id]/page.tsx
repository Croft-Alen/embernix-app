import type {
  ReactNode,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Package,
  UserRound,
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
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  updateTicketStatus,
} from "../actions";

type AdminTicketPageProps = {
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
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

export default async function AdminTicketPage({
  params,
}: AdminTicketPageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: {
      user:
        currentAdmin,
    },
  } =
    await supabase.auth.getUser();

  if (
    !currentAdmin
  ) {
    redirect(
      "/login"
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      adminAccess,
  } = await admin
    .from(
      "admin_users"
    )
    .select(
      "user_id"
    )
    .eq(
      "user_id",
      currentAdmin.id
    )
    .maybeSingle();

  if (
    !adminAccess
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      ticket,
    error:
      ticketError,
  } = await admin
    .from(
      "tickets"
    )
    .select(`
      id,
      ticket_number,
      user_id,
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
    .maybeSingle();

  if (
    ticketError ||
    !ticket
  ) {
    notFound();
  }

  const [
    repliesResult,
    profileResult,
    authResult,
  ] =
    await Promise.all([
      admin
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
        ),

      admin
        .from(
          "profiles"
        )
        .select(
          "id, full_name"
        )
        .eq(
          "id",
          ticket.user_id
        )
        .maybeSingle(),

      admin.auth.admin.getUserById(
        ticket.user_id
      ),
    ]);

  if (
    repliesResult.error
  ) {
    console.error(
      "Failed to load admin ticket messages:",
      repliesResult.error
    );
  }

  const profile =
    profileResult.data;

  const authUser =
    authResult.data.user;

  const customerName =
    profile?.full_name ||
    authUser
      ?.user_metadata
      ?.full_name ||
    authUser
      ?.user_metadata
      ?.name ||
    authUser?.email?.split(
      "@"
    )[0] ||
    "Customer";

  const customerEmail =
    authUser?.email ??
    "—";

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
      repliesResult.data ??
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

  const isClosed =
    ticket.status ===
    "closed";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Tickets
      </Link>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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

            <h1 className="mt-3 text-[25px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[29px]">
              {
                ticket.subject
              }
            </h1>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />

                {
                  customerName
                }
              </span>

              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />

                {
                  customerEmail
                }
              </span>

              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />

                {formatDate(
                  ticket.created_at
                )}
              </span>
            </div>
          </div>

          <form
            action={
              updateTicketStatus
            }
            className="flex w-full gap-2 sm:w-auto"
          >
            <input
              type="hidden"
              name="ticketId"
              value={
                ticket.id
              }
            />

            <select
              name="status"
              defaultValue={
                ticket.status
              }
              className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--primary)] sm:w-[170px]"
            >
              <option value="open">
                Open
              </option>

              <option value="in_progress">
                In progress
              </option>

              <option value="resolved">
                Resolved
              </option>

              <option value="closed">
                Closed
              </option>
            </select>

            <Button
              type="submit"
              variant="secondary"
            >
              Update
            </Button>
          </form>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <TicketConversation
          ticketId={
            ticket.id
          }
          currentUserId={
            currentAdmin.id
          }
          customerName={
            customerName
          }
          messages={
            messages
          }
          closed={
            isClosed
          }
          status={
            ticket.status
          }
          adminView
        />

        <aside className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 xl:sticky xl:top-[96px]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Ticket details
          </h2>

          <div className="mt-5">
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
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                    <span>
                      {
                        product.name
                      }
                    </span>
                  </div>
                </InfoItem>
              </>
            )}

            <Divider />

            <InfoItem
              label="Customer"
            >
              <Link
                href={`/admin/customers/${ticket.user_id}`}
                className="text-[var(--primary)]"
              >
                {
                  customerName
                }
              </Link>
            </InfoItem>

            <Divider />

            <InfoItem
              label="Email"
            >
              <span className="break-all">
                {
                  customerEmail
                }
              </span>
            </InfoItem>

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

            {ticket.closed_at && (
              <>
                <Divider />

                <InfoItem
                  label="Closed"
                >
                  {formatDate(
                    ticket.closed_at
                  )}
                </InfoItem>
              </>
            )}
          </div>
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
    ReactNode;
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