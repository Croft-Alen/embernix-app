"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type InvoiceStatus =
  | "draft"
  | "unpaid";

type ParsedInvoiceItem = {
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  sort_order: number;
};

type ParsedInvoice = {
  user_id: string;
  status: InvoiceStatus;
  currency: string;

  discount_cents: number;
  tax_cents: number;

  issued_at: string | null;
  due_at: string | null;

  notes: string | null;

  items: ParsedInvoiceItem[];
};

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
    redirect("/dashboard");
  }

  return user;
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
  const parsed =
    cleanString(value);

  return parsed || null;
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
      "Invalid monetary amount."
    );
  }

  return Math.round(
    amount * 100
  );
}

function parsePositiveInteger(
  value:
    | FormDataEntryValue
    | null
) {
  const parsed =
    Number.parseInt(
      cleanString(value),
      10
    );

  if (
    Number.isNaN(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      "Quantity must be greater than zero."
    );
  }

  return parsed;
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

function buildUrl(
  path: string,
  params: Record<
    string,
    string
  >
) {
  const url =
    new URL(
      path,
      "https://embernix.local"
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  return `${url.pathname}${url.search}`;
}

function redirectError(
  path: string,
  message: string
): never {
  redirect(
    buildUrl(
      path,
      {
        error:
          message,
      }
    )
  );
}

function generateInvoiceNumber() {
  const now =
    new Date();

  const year =
    now.getUTCFullYear();

  const month =
    String(
      now.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  const random =
    crypto
      .randomUUID()
      .replaceAll(
        "-",
        ""
      )
      .slice(
        0,
        8
      )
      .toUpperCase();

  return `INV-${year}${month}${day}-${random}`;
}

function parseInvoice(
  formData: FormData
): ParsedInvoice {
  const userId =
    cleanString(
      formData.get(
        "userId"
      )
    );

  if (!userId) {
    throw new Error(
      "Select a customer."
    );
  }

  const rawStatus =
    cleanString(
      formData.get(
        "status"
      )
    );

  if (
    rawStatus !==
      "draft" &&
    rawStatus !==
      "unpaid"
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
      "Due date cannot be before the issue date."
    );
  }

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
    titles.length === 0
  ) {
    throw new Error(
      "Add at least one invoice item."
    );
  }

  if (
    titles.length !==
      quantities.length ||
    titles.length !==
      prices.length
  ) {
    throw new Error(
      "Invoice items are incomplete."
    );
  }

  const items:
    ParsedInvoiceItem[] =
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
          parsePositiveInteger(
            quantities[
              index
            ] ?? null
          );

        const unitPrice =
          moneyToCents(
            prices[
              index
            ] ?? null
          );

        if (
          unitPrice <= 0
        ) {
          throw new Error(
            `Item ${
              index + 1
            } price must be greater than zero.`
          );
        }

        const description =
          descriptions[
            index
          ]
            ? nullableString(
                descriptions[
                  index
                ]
              )
            : null;

        return {
          title,

          description,

          quantity,

          unit_price_cents:
            unitPrice,

          sort_order:
            index,
        };
      }
    );

  return {
    user_id:
      userId,

    status:
      rawStatus,

    currency,

    discount_cents:
      discountCents,

    tax_cents:
      taxCents,

    issued_at:
      issuedAt,

    due_at:
      dueAt,

    notes,

    items,
  };
}

export async function createInvoice(
  formData: FormData
) {
  const adminUser =
    await requireAdmin();

  let invoice:
    ParsedInvoice;

  try {
    invoice =
      parseInvoice(
        formData
      );
  } catch (error) {
    redirectError(
      "/admin/invoices/new",
      error instanceof Error
        ? error.message
        : "Invalid invoice."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: customer,
    error:
      customerError,
  } =
    await admin.auth.admin.getUserById(
      invoice.user_id
    );

  if (
    customerError ||
    !customer.user
  ) {
    redirectError(
      "/admin/invoices/new",
      "Selected customer could not be found."
    );
  }

  const subtotalCents =
    invoice.items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity *
          item.unit_price_cents,
      0
    );

  const totalCents =
    Math.max(
      0,
      subtotalCents -
        invoice.discount_cents +
        invoice.tax_cents
    );

  if (
    invoice.discount_cents >
    subtotalCents +
      invoice.tax_cents
  ) {
    redirectError(
      "/admin/invoices/new",
      "Discount cannot exceed the invoice amount."
    );
  }

  const invoiceNumber =
    generateInvoiceNumber();

  const issuedAt =
    invoice.issued_at ??
    (invoice.status ===
    "unpaid"
      ? new Date().toISOString()
      : null);

  const {
    data: createdInvoice,
    error:
      invoiceError,
  } = await admin
    .from("invoices")
    .insert({
      invoice_number:
        invoiceNumber,

      user_id:
        invoice.user_id,

      status:
        invoice.status,

      currency:
        invoice.currency,

      subtotal_cents:
        subtotalCents,

      discount_cents:
        invoice.discount_cents,

      tax_cents:
        invoice.tax_cents,

      total_cents:
        totalCents,

      issued_at:
        issuedAt,

      due_at:
        invoice.due_at,

      paid_at:
        null,

      payment_provider:
        null,

      paddle_transaction_id:
        null,

      notes:
        invoice.notes,

      created_by:
        adminUser.id,

      updated_at:
        new Date().toISOString(),
    })
    .select(
      "id"
    )
    .single();

  if (
    invoiceError ||
    !createdInvoice
  ) {
    console.error(
      "Failed to create invoice:",
      invoiceError
    );

    redirectError(
      "/admin/invoices/new",
      "Unable to create invoice."
    );
  }

  const invoiceItems =
    invoice.items.map(
      (item) => ({
        invoice_id:
          createdInvoice.id,

        title:
          item.title,

        description:
          item.description,

        quantity:
          item.quantity,

        unit_price_cents:
          item.unit_price_cents,

        sort_order:
          item.sort_order,
      })
    );

  const {
    error:
      itemsError,
  } = await admin
    .from(
      "invoice_items"
    )
    .insert(
      invoiceItems
    );

  if (itemsError) {
    console.error(
      "Failed to create invoice items:",
      itemsError
    );

    await admin
      .from("invoices")
      .delete()
      .eq(
        "id",
        createdInvoice.id
      );

    redirectError(
      "/admin/invoices/new",
      "Unable to save invoice items."
    );
  }

  revalidatePath(
    "/admin/invoices"
  );

  redirect(
    `/admin/invoices/${createdInvoice.id}`
  );
}