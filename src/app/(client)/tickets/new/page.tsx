import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import NewTicketForm from "@/components/tickets/NewTicketForm";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function NewTicketPage() {
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
    productsResult,
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

  const ownedProducts =
    (
      productsResult.data ??
      []
    )
      .map(
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

          return {
            id:
              product.id,

            name:
              product.name,
          };
        }
      )
      .filter(
        (
          product
        ): product is {
          id: string;
          name: string;
        } =>
          Boolean(
            product
          )
      );

  return (
    <div className="mx-auto w-full max-w-[950px] space-y-5">
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
          Start a conversation with Embernix.
        </p>
      </section>

      <NewTicketForm
        topics={
          topicsResult.data ??
          []
        }
        priorities={
          prioritiesResult.data ??
          []
        }
        products={
          ownedProducts
        }
      />
    </div>
  );
}