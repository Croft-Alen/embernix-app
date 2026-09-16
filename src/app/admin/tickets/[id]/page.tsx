import type {
  ReactNode,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Package,
  Send,
  UserRound,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import Button from "@/components/ui/Button";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  adminReplyToTicket,
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

  const admin =
    createAdminClient();

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
          created_at
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
      "Failed to load admin ticket replies:",
      repliesResult.error
    );
  }

  const replies =
    repliesResult.data ??
    [];

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
    authUser
      ?.email
      ?.split(
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
        {/* Conversation */}
        <section className="min-w-0 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Conversation
            </h2>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Replies between the customer and Embernix.
            </p>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            {replies.length ===
            0 ? (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                No messages yet.
              </div>
            ) : (
              replies.map(
                (
                  reply
                ) => (
                  <div
                    key={
                      reply.id
                    }
                    className={`flex ${
                      reply.is_admin
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-[18px] px-4 py-3 sm:max-w-[76%] ${
                        reply.is_admin
                          ? "bg-[var(--primary)] text-white"
                          : "border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-5">
                        <p
                          className={`text-xs font-semibold ${
                            reply.is_admin
                              ? "text-white"
                              : "text-[var(--foreground)]"
                          }`}
                        >
                          {reply.is_admin
                            ? "Embernix"
                            : customerName}
                        </p>

                        <p
                          className={`text-[10px] ${
                            reply.is_admin
                              ? "text-white/70"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {formatDate(
                            reply.created_at
                          )}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {
                          reply.message
                        }
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>

          {isClosed ? (
            <div className="border-t border-[var(--border-light)] px-5 py-5 text-center text-sm text-[var(--muted)]">
              This ticket is closed. Change its status to reopen the conversation.
            </div>
          ) : (
            <form
              action={
                adminReplyToTicket
              }
              className="border-t border-[var(--border-light)] p-4 sm:p-5"
            >
              <input
                type="hidden"
                name="ticketId"
                value={
                  ticket.id
                }
              />

              <textarea
                name="message"
                required
                minLength={
                  1
                }
                maxLength={
                  10000
                }
                rows={
                  5
                }
                placeholder="Write a reply to the customer..."
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)]"
              />

              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                >
                  <Send className="h-4 w-4" />

                  Send reply
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* Details */}
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

                    <span className="min-w-0 break-words">
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