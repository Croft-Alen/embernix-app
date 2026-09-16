import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import Button from "@/components/ui/Button";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createTicket,
} from "../actions";

type NewTicketPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewTicketPage({
  searchParams,
}: NewTicketPageProps) {
  const query =
    await searchParams;

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

  const [
    topicsResult,
    prioritiesResult,
    ownershipsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "ticket_topics"
        )
        .select(
          "id, name"
        )
        .eq(
          "active",
          true
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "ticket_priorities"
        )
        .select(
          "id, name, slug"
        )
        .eq(
          "active",
          true
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "customer_products"
        )
        .select(`
          product_id,
          products (
            id,
            name
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "active"
        ),
    ]);

  const topics =
    topicsResult.data ??
    [];

  const priorities =
    prioritiesResult.data ??
    [];

  const ownerships =
    ownershipsResult.data ??
    [];

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-5">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Tickets
      </Link>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[27px]">
          Create a ticket
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
          Tell us what you need help with and provide as much detail as possible.
        </p>
      </section>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            query.error
          }
        </div>
      )}

      <form
        action={
          createTicket
        }
        className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"
      >
        <div className="space-y-5">
          <Field
            label="Subject"
            required
          >
            <input
              type="text"
              name="subject"
              required
              minLength={
                3
              }
              maxLength={
                160
              }
              placeholder="What do you need help with?"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-light)] focus:border-[var(--primary)]"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Topic"
              required
            >
              <select
                name="topicId"
                required
                defaultValue=""
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option
                  value=""
                  disabled
                >
                  Select topic
                </option>

                {topics.map(
                  (
                    topic
                  ) => (
                    <option
                      key={
                        topic.id
                      }
                      value={
                        topic.id
                      }
                    >
                      {
                        topic.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field
              label="Priority"
              required
            >
              <select
                name="priorityId"
                required
                defaultValue=""
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option
                  value=""
                  disabled
                >
                  Select priority
                </option>

                {priorities.map(
                  (
                    priority
                  ) => (
                    <option
                      key={
                        priority.id
                      }
                      value={
                        priority.id
                      }
                    >
                      {
                        priority.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>

          {ownerships.length >
            0 && (
            <Field label="Product">
              <select
                name="productId"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option value="">
                  No product selected
                </option>

                {ownerships.map(
                  (
                    ownership
                  ) => {
                    const product =
                      Array.isArray(
                        ownership.products
                      )
                        ? ownership.products[0]
                        : ownership.products;

                    if (
                      !product
                    ) {
                      return null;
                    }

                    return (
                      <option
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {
                          product.name
                        }
                      </option>
                    );
                  }
                )}
              </select>

              <p className="mt-2 text-xs text-[var(--muted)]">
                Optional. Choose the product this ticket is about.
              </p>
            </Field>
          )}

          <Field
            label="Message"
            required
          >
            <textarea
              name="message"
              required
              minLength={
                10
              }
              maxLength={
                10000
              }
              rows={
                8
              }
              placeholder="Describe the issue in detail..."
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-light)] focus:border-[var(--primary)]"
            />
          </Field>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 border-t border-[var(--border-light)] pt-5">
          <Link
            href="/tickets"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)]"
          >
            Cancel
          </Link>

          <Button
            type="submit"
          >
            Create ticket
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        {
          label
        }

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {
        children
      }
    </div>
  );
}