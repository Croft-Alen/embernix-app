import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Trash2,
} from "lucide-react";

import {
  revalidatePath,
} from "next/cache";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type EditInvoicePageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

function formatDateInput(
  value:
    | string
    | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function centsToMoney(
  cents: number
) {
  return (
    Number(cents || 0) /
    100
  ).toFixed(2);
}

function cleanString(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function nullableString(
  value:
    | FormDataEntryValue
    | null
) {
  const valueString =
    cleanString(value);

  return valueString ||
    null;
}

function moneyToCents(
  value:
    | FormDataEntryValue
    | null
) {
  const raw =
    cleanString(value);

  if (!raw) {
    return 0;
  }

  const amount =
    Number(raw);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      "Invalid amount."
    );
  }

  return Math.round(
    amount * 100
  );
}

function parseDate(
  value:
    | FormDataEntryValue
    | null
) {
  const raw =
    cleanString(value);

  if (!raw) {
    return null;
  }

  const date =
    new Date(raw);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "Invalid date."
    );
  }

  return date.toISOString();
}

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: admin,
  } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!admin) {
    redirect(
      "/dashboard"
    );
  }

  return user;
}

export default async function EditInvoicePage({
  params,
  searchParams,
}: EditInvoicePageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const admin =
    createAdminClient();

  const {
    data: invoice,
    error:
      invoiceError,
  } = await admin
    .from("invoices")
    .select(`
      id,
      invoice_number,
      user_id,
      status,
      currency,
      subtotal_cents,
      discount_cents,
      tax_cents,
      total_cents,
      issued_at,
      due_at,
      paid_at,
      payment_provider,
      paddle_transaction_id,
      notes,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    invoiceError ||
    !invoice
  ) {
    notFound();
  }

  const {
    data: items,
    error:
      itemsError,
  } = await admin
    .from(
      "invoice_items"
    )
    .select(`
      id,
      title,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      sort_order
    `)
    .eq(
      "invoice_id",
      invoice.id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (itemsError) {
    throw new Error(
      "Unable to load invoice items."
    );
  }

  if (
    invoice.status ===
      "paid" ||
    invoice.status ===
      "refunded"
  ) {
    redirect(
      `/admin/invoices/${invoice.id}`
    );
  }

  async function updateInvoice(
    formData: FormData
  ) {
    "use server";

    await requireAdmin();

    const admin =
      createAdminClient();

    const {
      data:
        currentInvoice,
      error:
        currentError,
    } = await admin
      .from(
        "invoices"
      )
      .select(`
        id,
        status
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      currentError ||
      !currentInvoice
    ) {
      redirect(
        "/admin/invoices"
      );
    }

    if (
      currentInvoice.status ===
        "paid" ||
      currentInvoice.status ===
        "refunded"
    ) {
      redirect(
        `/admin/invoices/${id}`
      );
    }

    try {
      const status =
        cleanString(
          formData.get(
            "status"
          )
        );

      if (
        status !==
          "draft" &&
        status !==
          "unpaid" &&
        status !==
          "cancelled"
      ) {
        throw new Error(
          "Invalid invoice status."
        );
      }

      const currency =
        cleanString(
          formData.get(
            "currency"
          )
        ).toUpperCase();

      if (
        currency.length !==
          3
      ) {
        throw new Error(
          "Currency must be a 3-letter code."
        );
      }

      const issuedAt =
        parseDate(
          formData.get(
            "issuedAt"
          )
        );

      const dueAt =
        parseDate(
          formData.get(
            "dueAt"
          )
        );

      if (
        issuedAt &&
        dueAt &&
        new Date(
          dueAt
        ).getTime() <
          new Date(
            issuedAt
          ).getTime()
      ) {
        throw new Error(
          "Due date cannot be before issue date."
        );
      }

      const discountCents =
        moneyToCents(
          formData.get(
            "discount"
          )
        );

      const taxCents =
        moneyToCents(
          formData.get(
            "tax"
          )
        );

      const notes =
        nullableString(
          formData.get(
            "notes"
          )
        );

      const titles =
        formData.getAll(
          "itemTitle"
        );

      const descriptions =
        formData.getAll(
          "itemDescription"
        );

      const quantities =
        formData.getAll(
          "itemQuantity"
        );

      const prices =
        formData.getAll(
          "itemPrice"
        );

      if (
        titles.length ===
          0 ||
        titles.length !==
          quantities.length ||
        titles.length !==
          prices.length
      ) {
        throw new Error(
          "Add at least one valid invoice item."
        );
      }

      const parsedItems =
        titles.map(
          (
            titleValue,
            index
          ) => {
            const title =
              cleanString(
                titleValue
              );

            if (!title) {
              throw new Error(
                `Item ${
                  index + 1
                } requires a title.`
              );
            }

            const quantity =
              Number.parseInt(
                cleanString(
                  quantities[
                    index
                  ] ?? null
                ),
                10
              );

            if (
              !Number.isFinite(
                quantity
              ) ||
              quantity <=
                0
            ) {
              throw new Error(
                `Item ${
                  index + 1
                } has an invalid quantity.`
              );
            }

            const unitPriceCents =
              moneyToCents(
                prices[
                  index
                ] ?? null
              );

            if (
              unitPriceCents <=
                0
            ) {
              throw new Error(
                `Item ${
                  index + 1
                } price must be greater than zero.`
              );
            }

            return {
              invoice_id:
                id,

              title,

              description:
                descriptions[
                  index
                ]
                  ? nullableString(
                      descriptions[
                        index
                      ]
                    )
                  : null,

              quantity,

              unit_price_cents:
                unitPriceCents,

              sort_order:
                index,
            };
          }
        );

      const subtotalCents =
        parsedItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity *
              item.unit_price_cents,
          0
        );

      if (
        discountCents >
        subtotalCents +
          taxCents
      ) {
        throw new Error(
          "Discount cannot exceed the invoice amount."
        );
      }

      const totalCents =
        Math.max(
          0,
          subtotalCents -
            discountCents +
            taxCents
        );

      const {
        error:
          updateError,
      } = await admin
        .from(
          "invoices"
        )
        .update({
          status,

          currency,

          subtotal_cents:
            subtotalCents,

          discount_cents:
            discountCents,

          tax_cents:
            taxCents,

          total_cents:
            totalCents,

          issued_at:
            issuedAt,

          due_at:
            dueAt,

          notes,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id
        );

      if (updateError) {
        throw new Error(
          "Unable to update invoice."
        );
      }

      const {
        error:
          deleteItemsError,
      } = await admin
        .from(
          "invoice_items"
        )
        .delete()
        .eq(
          "invoice_id",
          id
        );

      if (
        deleteItemsError
      ) {
        throw new Error(
          "Unable to update invoice items."
        );
      }

      const {
        error:
          insertItemsError,
      } = await admin
        .from(
          "invoice_items"
        )
        .insert(
          parsedItems
        );

      if (
        insertItemsError
      ) {
        throw new Error(
          "Unable to save invoice items."
        );
      }

      revalidatePath(
        "/admin/invoices"
      );

      revalidatePath(
        `/admin/invoices/${id}`
      );

      redirect(
        `/admin/invoices/${id}`
      );
    } catch (error) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Unable to update invoice.";

      redirect(
        `/admin/invoices/${id}/edit?error=${encodeURIComponent(
          message
        )}`
      );
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href={`/admin/invoices/${invoice.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoice
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold">
            Edit{" "}
            <span className="font-mono">
              {
                invoice.invoice_number
              }
            </span>
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Update invoice items, totals, dates, and status.
          </p>
        </div>
      </div>

      {query.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            query.error
          }
        </div>
      )}

      <form
        action={
          updateInvoice
        }
        className="space-y-6"
      >
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Invoice details
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Status
              </label>

              <select
                name="status"
                defaultValue={
                  invoice.status
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--primary)]"
              >
                <option value="draft">
                  Draft
                </option>

                <option value="unpaid">
                  Unpaid
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Currency
              </label>

              <input
                name="currency"
                defaultValue={
                  invoice.currency
                }
                maxLength={3}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm uppercase outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Issue date
              </label>

              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                <input
                  name="issuedAt"
                  type="date"
                  defaultValue={formatDateInput(
                    invoice.issued_at
                  )}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Due date
              </label>

              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                <input
                  name="dueAt"
                  type="date"
                  defaultValue={formatDateInput(
                    invoice.due_at
                  )}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Items
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Edit the services or items being billed.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Plus className="h-3.5 w-3.5" />
              Add rows in the create screen if more are needed
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {(items ?? []).map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-xl border border-[var(--border-light)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Item{" "}
                      {index +
                        1}
                    </p>

                    <Trash2 className="h-4 w-4 text-[var(--muted-light)]" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label className="mb-2 block text-sm font-medium">
                        Title
                      </label>

                      <input
                        name="itemTitle"
                        defaultValue={
                          item.title
                        }
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--primary)]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Qty
                      </label>

                      <input
                        name="itemQuantity"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={
                          item.quantity
                        }
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--primary)]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="mb-2 block text-sm font-medium">
                        Unit price
                      </label>

                      <div className="relative">
                        <CircleDollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                        <input
                          name="itemPrice"
                          type="number"
                          min="0.01"
                          step="0.01"
                          defaultValue={centsToMoney(
                            Number(
                              item.unit_price_cents
                            )
                          )}
                          className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-12">
                      <label className="mb-2 block text-sm font-medium">
                        Description
                      </label>

                      <textarea
                        name="itemDescription"
                        defaultValue={
                          item.description ??
                          ""
                        }
                        rows={2}
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">
            Adjustments
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Discount
              </label>

              <input
                name="discount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToMoney(
                  Number(
                    invoice.discount_cents
                  )
                )}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Tax
              </label>

              <input
                name="tax"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToMoney(
                  Number(
                    invoice.tax_cents
                  )
                )}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <label className="mb-2 block text-sm font-medium">
            Notes
          </label>

          <textarea
            name="notes"
            rows={4}
            defaultValue={
              invoice.notes ??
              ""
            }
            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
        </section>

        <div className="flex justify-end gap-3 pb-8">
          <Link
            href={`/admin/invoices/${invoice.id}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}