"use client";

import Link from "next/link";

import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

export type InvoiceCustomer = {
  id: string;
  name: string;
  email: string;
};

type InvoiceItem = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  price: string;
};

type InvoiceFormProps = {
  customers:
    InvoiceCustomer[];

  action:
    | ((
        formData: FormData
      ) => void)
    | ((
        formData: FormData
      ) => Promise<void>);
};

const sectionClass =
  "rounded-2xl border border-[var(--border)] bg-white p-6";

const labelClass =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--primary)]";

const textareaClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]";

function createItem(): InvoiceItem {
  return {
    id:
      crypto.randomUUID(),

    title: "",

    description: "",

    quantity: 1,

    price: "",
  };
}

function money(
  value: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          currency ||
          "USD",
      }
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(
      2
    )}`;
  }
}

export default function InvoiceForm({
  customers,
  action,
}: InvoiceFormProps) {
  const [
    items,
    setItems,
  ] = useState<
    InvoiceItem[]
  >([
    createItem(),
  ]);

  const [
    currency,
    setCurrency,
  ] = useState(
    "USD"
  );

  const [
    discount,
    setDiscount,
  ] = useState(
    "0"
  );

  const [
    tax,
    setTax,
  ] = useState(
    "0"
  );

  const subtotal =
    useMemo(() => {
      return items.reduce(
        (
          total,
          item
        ) => {
          const price =
            Number(
              item.price
            );

          const quantity =
            Number(
              item.quantity
            );

          if (
            !Number.isFinite(
              price
            ) ||
            !Number.isFinite(
              quantity
            )
          ) {
            return total;
          }

          return (
            total +
            price *
              quantity
          );
        },
        0
      );
    }, [items]);

  const discountAmount =
    Number(
      discount
    ) || 0;

  const taxAmount =
    Number(tax) || 0;

  const total =
    Math.max(
      0,
      subtotal -
        discountAmount +
        taxAmount
    );

  function updateItem(
    id: string,
    field:
      keyof Omit<
        InvoiceItem,
        "id"
      >,
    value:
      string | number
  ) {
    setItems(
      (
        current
      ) =>
        current.map(
          (item) =>
            item.id ===
            id
              ? {
                  ...item,
                  [field]:
                    value,
                }
              : item
        )
    );
  }

  function addItem() {
    setItems(
      (
        current
      ) => [
        ...current,
        createItem(),
      ]
    );
  }

  function removeItem(
    id: string
  ) {
    if (
      items.length === 1
    ) {
      return;
    }

    setItems(
      (
        current
      ) =>
        current.filter(
          (item) =>
            item.id !==
            id
        )
    );
  }

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Customer
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Select who this invoice belongs to.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="userId"
            className={
              labelClass
            }
          >
            Customer
          </label>

          <select
            id="userId"
            name="userId"
            className={
              inputClass
            }
            defaultValue=""
            required
          >
            <option
              value=""
              disabled
            >
              Select customer
            </option>

            {customers.map(
              (
                customer
              ) => (
                <option
                  key={
                    customer.id
                  }
                  value={
                    customer.id
                  }
                >
                  {
                    customer.name
                  }{" "}
                  —{" "}
                  {
                    customer.email
                  }
                </option>
              )
            )}
          </select>
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ReceiptText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Invoice details
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure status, currency, and invoice dates.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="status"
              className={
                labelClass
              }
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue="unpaid"
              className={
                inputClass
              }
            >
              <option value="unpaid">
                Unpaid
              </option>

              <option value="draft">
                Draft
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="currency"
              className={
                labelClass
              }
            >
              Currency
            </label>

            <input
              id="currency"
              name="currency"
              value={
                currency
              }
              onChange={(
                event
              ) =>
                setCurrency(
                  event.target.value
                    .toUpperCase()
                    .slice(
                      0,
                      3
                    )
                )
              }
              maxLength={3}
              className={`${inputClass} uppercase`}
              required
            />
          </div>

          <div>
            <label
              htmlFor="issuedAt"
              className={
                labelClass
              }
            >
              Issue date
            </label>

            <div className="relative">
              <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <input
                id="issuedAt"
                name="issuedAt"
                type="date"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dueAt"
              className={
                labelClass
              }
            >
              Due date
            </label>

            <div className="relative">
              <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <input
                id="dueAt"
                name="dueAt"
                type="date"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Items
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Add the services or other items being billed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              addItem
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {items.map(
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

                  {items.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.id
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label
                      className={
                        labelClass
                      }
                    >
                      Title
                    </label>

                    <input
                      name="itemTitle"
                      value={
                        item.title
                      }
                      onChange={(
                        event
                      ) =>
                        updateItem(
                          item.id,
                          "title",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Web Development"
                      className={
                        inputClass
                      }
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      className={
                        labelClass
                      }
                    >
                      Qty
                    </label>

                    <input
                      name="itemQuantity"
                      type="number"
                      min="1"
                      step="1"
                      value={
                        item.quantity
                      }
                      onChange={(
                        event
                      ) =>
                        updateItem(
                          item.id,
                          "quantity",
                          Math.max(
                            1,
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        )
                      }
                      className={
                        inputClass
                      }
                      required
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      className={
                        labelClass
                      }
                    >
                      Unit price
                    </label>

                    <div className="relative">
                      <CircleDollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                      <input
                        name="itemPrice"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          item.price
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            item.id,
                            "price",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="0.00"
                        className={`${inputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-12">
                    <label
                      className={
                        labelClass
                      }
                    >
                      Description
                    </label>

                    <textarea
                      name="itemDescription"
                      value={
                        item.description
                      }
                      onChange={(
                        event
                      ) =>
                        updateItem(
                          item.id,
                          "description",
                          event
                            .target
                            .value
                        )
                      }
                      rows={2}
                      placeholder="Optional description"
                      className={
                        textareaClass
                      }
                    />
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <CircleDollarSign className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Totals
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional discount and tax adjustments.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="discount"
              className={
                labelClass
              }
            >
              Discount
            </label>

            <input
              id="discount"
              name="discount"
              type="number"
              min="0"
              step="0.01"
              value={
                discount
              }
              onChange={(
                event
              ) =>
                setDiscount(
                  event.target
                    .value
                )
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              htmlFor="tax"
              className={
                labelClass
              }
            >
              Tax
            </label>

            <input
              id="tax"
              name="tax"
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(
                event
              ) =>
                setTax(
                  event.target
                    .value
                )
              }
              className={
                inputClass
              }
            />
          </div>
        </div>

        <div className="mt-6 ml-auto max-w-sm space-y-3 rounded-xl bg-[var(--surface-secondary)] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">
              Subtotal
            </span>

            <span>
              {money(
                subtotal,
                currency
              )}
            </span>
          </div>

          {discountAmount >
            0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">
                Discount
              </span>

              <span>
                -
                {money(
                  discountAmount,
                  currency
                )}
              </span>
            </div>
          )}

          {taxAmount >
            0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">
                Tax
              </span>

              <span>
                {money(
                  taxAmount,
                  currency
                )}
              </span>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Total
              </span>

              <span className="text-lg font-semibold">
                {money(
                  total,
                  currency
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={
          sectionClass
        }
      >
        <label
          htmlFor="notes"
          className={
            labelClass
          }
        >
          Notes
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Optional invoice notes..."
          className={
            textareaClass
          }
        />
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/admin/invoices"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          Create invoice
        </button>
      </div>
    </form>
  );
}