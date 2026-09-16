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

function redirectError(
  slug: string,
  message: string
): never {
  const params =
    new URLSearchParams({
      service: slug,
      error: message,
    });

  redirect(
    `/checkout/service?${params.toString()}`
  );
}

export async function createServiceInvoice(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const serviceId =
    cleanString(
      formData.get(
        "serviceId"
      )
    );

  const serviceSlug =
    cleanString(
      formData.get(
        "serviceSlug"
      )
    );

  if (
    !serviceId ||
    !serviceSlug
  ) {
    redirect("/services");
  }

  try {
    const companyName =
      nullableString(
        formData.get(
          "companyName"
        )
      );

    const addressLine1 =
      cleanString(
        formData.get(
          "addressLine1"
        )
      );

    const addressLine2 =
      nullableString(
        formData.get(
          "addressLine2"
        )
      );

    const city =
      cleanString(
        formData.get(
          "city"
        )
      );

    const state =
      nullableString(
        formData.get(
          "state"
        )
      );

    const postalCode =
      nullableString(
        formData.get(
          "postalCode"
        )
      );

    const country =
      cleanString(
        formData.get(
          "country"
        )
      );

    if (!addressLine1) {
      throw new Error(
        "Address is required."
      );
    }

    if (!city) {
      throw new Error(
        "City is required."
      );
    }

    if (!country) {
      throw new Error(
        "Country is required."
      );
    }

    const admin =
      createAdminClient();

    const {
      data: service,
      error:
        serviceError,
    } = await admin
      .from("services")
      .select(`
        id,
        slug,
        name,
        short_description,
        price_cents,
        currency,
        active
      `)
      .eq(
        "id",
        serviceId
      )
      .eq(
        "slug",
        serviceSlug
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

    if (
      serviceError ||
      !service
    ) {
      throw new Error(
        "This service is no longer available."
      );
    }

    if (
      Number(
        service.price_cents
      ) <= 0
    ) {
      throw new Error(
        "This service cannot currently be purchased."
      );
    }

    const {
      data:
        billingProfile,
      error:
        billingError,
    } = await admin
      .from(
        "billing_profiles"
      )
      .upsert(
        {
          user_id:
            user.id,

          company_name:
            companyName,

          address_line_1:
            addressLine1,

          address_line_2:
            addressLine2,

          city,

          state,

          postal_code:
            postalCode,

          country,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      )
      .select("id")
      .single();

    if (
      billingError ||
      !billingProfile
    ) {
      console.error(
        "Failed to save billing profile:",
        billingError
      );

      throw new Error(
        "Unable to save billing details."
      );
    }

    const invoiceNumber =
      generateInvoiceNumber();

    const now =
      new Date().toISOString();

    const {
      data:
        createdInvoice,
      error:
        invoiceError,
    } = await admin
      .from("invoices")
      .insert({
        invoice_number:
          invoiceNumber,

        user_id:
          user.id,

        service_id:
          service.id,

        billing_profile_id:
          billingProfile.id,

        source:
          "service",

        status:
          "unpaid",

        currency:
          service.currency,

        subtotal_cents:
          service.price_cents,

        discount_cents:
          0,

        tax_cents:
          0,

        total_cents:
          service.price_cents,

        issued_at:
          now,

        due_at:
          null,

        paid_at:
          null,

        payment_provider:
          null,

        paddle_transaction_id:
          null,

        notes:
          null,

        created_by:
          null,

        updated_at:
          now,
      })
      .select("id")
      .single();

    if (
      invoiceError ||
      !createdInvoice
    ) {
      console.error(
        "Failed to create service invoice:",
        invoiceError
      );

      throw new Error(
        "Unable to create invoice."
      );
    }

    const {
      error:
        itemError,
    } = await admin
      .from(
        "invoice_items"
      )
      .insert({
        invoice_id:
          createdInvoice.id,

        title:
          service.name,

        description:
          service.short_description,

        quantity:
          1,

        unit_price_cents:
          service.price_cents,

        sort_order:
          0,
      });

    if (itemError) {
      console.error(
        "Failed to create service invoice item:",
        itemError
      );

      await admin
        .from("invoices")
        .delete()
        .eq(
          "id",
          createdInvoice.id
        );

      throw new Error(
        "Unable to create invoice item."
      );
    }

    revalidatePath(
      "/invoices"
    );

    redirect(
      `/invoices/${createdInvoice.id}`
    );
  } catch (error) {
    redirectError(
      serviceSlug,
      error instanceof Error
        ? error.message
        : "Unable to continue checkout."
    );
  }
}