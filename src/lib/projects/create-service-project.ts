import {
  randomUUID,
} from "crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

function createProjectNumber() {
  const now =
    new Date();

  const datePart = [
    now.getUTCFullYear(),

    String(
      now.getUTCMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getUTCDate()
    ).padStart(2, "0"),
  ].join("");

  const randomPart =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase();

  return `PRJ-${datePart}-${randomPart}`;
}

export async function createServiceProject({
  orderId,
  invoiceId,
  userId,
  serviceId,
  serviceName,
}: {
  orderId: string;
  invoiceId: string;
  userId: string;
  serviceId: string;
  serviceName: string;
}) {
  const admin =
    createAdminClient();

  /*
   * Idempotency.
   *
   * One paid service order
   * can only have one project.
   */
  const {
    data: existing,
    error:
      existingError,
  } = await admin
    .from("projects")
    .select("id")
    .eq(
      "order_id",
      orderId
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing.id;
  }

  const {
    data: project,
    error,
  } = await admin
    .from("projects")
    .insert({
      project_number:
        createProjectNumber(),

      user_id:
        userId,

      service_id:
        serviceId,

      order_id:
        orderId,

      invoice_id:
        invoiceId,

      title:
        serviceName,

      status:
        "awaiting_requirements",

      requirements:
        null,

      delivery_note:
        null,

      delivery_url:
        null,

      admin_notes:
        null,
    })
    .select("id")
    .single();

  if (
    error ||
    !project
  ) {
    /*
     * Protect against simultaneous
     * webhook retries.
     */
    const {
      data: recovered,
    } = await admin
      .from("projects")
      .select("id")
      .eq(
        "order_id",
        orderId
      )
      .maybeSingle();

    if (recovered) {
      return recovered.id;
    }

    throw error ??
      new Error(
        "Unable to create project."
      );
  }

  return project.id;
}