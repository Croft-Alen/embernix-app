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
      "Invalid price."
    );
  }

  return Math.round(
    amount * 100
  );
}

function parseSortOrder(
  value:
    | FormDataEntryValue
    | null
) {
  const raw =
    cleanString(value);

  if (!raw) {
    return 0;
  }

  const parsed =
    Number.parseInt(
      raw,
      10
    );

  if (
    Number.isNaN(parsed)
  ) {
    throw new Error(
      "Invalid sort order."
    );
  }

  return parsed;
}

function normalizeSlug(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
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
    error,
  } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    error ||
    !admin
  ) {
    redirect("/dashboard");
  }

  return user;
}

function buildErrorUrl(
  path: string,
  message: string
) {
  const params =
    new URLSearchParams({
      error: message,
    });

  return `${path}?${params.toString()}`;
}

export async function createService(
  formData: FormData
) {
  await requireAdmin();

  let redirectTarget:
    | string
    | null = null;

  let errorTarget:
    | string
    | null = null;

  try {
    const name =
      cleanString(
        formData.get(
          "name"
        )
      );

    if (!name) {
      throw new Error(
        "Service name is required."
      );
    }

    const rawSlug =
      cleanString(
        formData.get(
          "slug"
        )
      );

    const slug =
      normalizeSlug(
        rawSlug || name
      );

    if (!slug) {
      throw new Error(
        "A valid slug is required."
      );
    }

    const shortDescription =
      nullableString(
        formData.get(
          "shortDescription"
        )
      );

    const description =
      nullableString(
        formData.get(
          "description"
        )
      );

    const priceCents =
      moneyToCents(
        formData.get(
          "price"
        )
      );

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

    const imageUrl =
      nullableString(
        formData.get(
          "imageUrl"
        )
      );

    const sortOrder =
      parseSortOrder(
        formData.get(
          "sortOrder"
        )
      );

    const active =
      formData.get(
        "active"
      ) === "on";

    const admin =
      createAdminClient();

    const {
      data: existing,
      error:
        existingError,
    } = await admin
      .from("services")
      .select("id")
      .eq(
        "slug",
        slug
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Failed checking existing service:",
        existingError
      );

      throw new Error(
        "Unable to validate service slug."
      );
    }

    if (existing) {
      throw new Error(
        "A service with this slug already exists."
      );
    }

    const {
      data: service,
      error,
    } = await admin
      .from("services")
      .insert({
        name,

        slug,

        short_description:
          shortDescription,

        description,

        price_cents:
          priceCents,

        currency,

        image_url:
          imageUrl,

        active,

        sort_order:
          sortOrder,

        updated_at:
          new Date().toISOString(),
      })
      .select("id")
      .single();

    if (
      error ||
      !service
    ) {
      console.error(
        "Failed to create service:",
        error
      );

      throw new Error(
        "Unable to create service."
      );
    }

    revalidatePath(
      "/admin/services"
    );

    redirectTarget =
      `/admin/services/${service.id}/edit`;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create service.";

    errorTarget =
      buildErrorUrl(
        "/admin/services/new",
        message
      );
  }

  if (errorTarget) {
    redirect(
      errorTarget
    );
  }

  if (redirectTarget) {
    redirect(
      redirectTarget
    );
  }

  redirect(
    "/admin/services"
  );
}

export async function updateService(
  serviceId: string,
  formData: FormData
) {
  await requireAdmin();

  let redirectTarget:
    | string
    | null = null;

  let errorTarget:
    | string
    | null = null;

  try {
    const admin =
      createAdminClient();

    const {
      data:
        currentService,
      error:
        currentServiceError,
    } = await admin
      .from("services")
      .select("id")
      .eq(
        "id",
        serviceId
      )
      .maybeSingle();

    if (
      currentServiceError ||
      !currentService
    ) {
      throw new Error(
        "Service not found."
      );
    }

    const name =
      cleanString(
        formData.get(
          "name"
        )
      );

    if (!name) {
      throw new Error(
        "Service name is required."
      );
    }

    const rawSlug =
      cleanString(
        formData.get(
          "slug"
        )
      );

    const slug =
      normalizeSlug(
        rawSlug || name
      );

    if (!slug) {
      throw new Error(
        "A valid slug is required."
      );
    }

    const shortDescription =
      nullableString(
        formData.get(
          "shortDescription"
        )
      );

    const description =
      nullableString(
        formData.get(
          "description"
        )
      );

    const priceCents =
      moneyToCents(
        formData.get(
          "price"
        )
      );

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

    const imageUrl =
      nullableString(
        formData.get(
          "imageUrl"
        )
      );

    const sortOrder =
      parseSortOrder(
        formData.get(
          "sortOrder"
        )
      );

    const active =
      formData.get(
        "active"
      ) === "on";

    const {
      data: duplicate,
      error:
        duplicateError,
    } = await admin
      .from("services")
      .select("id")
      .eq(
        "slug",
        slug
      )
      .neq(
        "id",
        serviceId
      )
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Failed checking duplicate service slug:",
        duplicateError
      );

      throw new Error(
        "Unable to validate service slug."
      );
    }

    if (duplicate) {
      throw new Error(
        "A service with this slug already exists."
      );
    }

    const {
      error:
        updateError,
    } = await admin
      .from("services")
      .update({
        name,

        slug,

        short_description:
          shortDescription,

        description,

        price_cents:
          priceCents,

        currency,

        image_url:
          imageUrl,

        active,

        sort_order:
          sortOrder,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        serviceId
      );

    if (updateError) {
      console.error(
        "Failed to update service:",
        updateError
      );

      throw new Error(
        "Unable to update service."
      );
    }

    revalidatePath(
      "/admin/services"
    );

    revalidatePath(
      `/admin/services/${serviceId}/edit`
    );

    redirectTarget =
      `/admin/services/${serviceId}/edit?success=1`;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update service.";

    errorTarget =
      buildErrorUrl(
        `/admin/services/${serviceId}/edit`,
        message
      );
  }

  if (errorTarget) {
    redirect(
      errorTarget
    );
  }

  if (redirectTarget) {
    redirect(
      redirectTarget
    );
  }

  redirect(
    "/admin/services"
  );
}

export async function toggleServiceActive(
  serviceId: string,
  active: boolean
) {
  await requireAdmin();

  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from("services")
    .update({
      active,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      serviceId
    );

  if (error) {
    console.error(
      "Failed to update service status:",
      error
    );

    throw new Error(
      "Unable to update service status."
    );
  }

  revalidatePath(
    "/admin/services"
  );
}