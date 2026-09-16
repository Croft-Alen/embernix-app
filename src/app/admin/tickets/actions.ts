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

const validStatuses =
  new Set([
    "open",
    "in_progress",
    "resolved",
    "closed",
  ]);

function textValue(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

async function requireAdmin() {
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

  const admin =
    createAdminClient();

  const {
    data:
      adminUser,
  } = await admin
    .from(
      "admin_users"
    )
    .select(
      "user_id"
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    !adminUser
  ) {
    redirect(
      "/dashboard"
    );
  }

  return {
    user,
    admin,
  };
}

export async function adminReplyToTicket(
  formData: FormData
) {
  const {
    user,
    admin,
  } =
    await requireAdmin();

  const ticketId =
    textValue(
      formData.get(
        "ticketId"
      )
    );

  const message =
    textValue(
      formData.get(
        "message"
      )
    );

  if (
    !ticketId ||
    message.length <
      1 ||
    message.length >
      10000
  ) {
    return;
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
    .select(
      "id, status"
    )
    .eq(
      "id",
      ticketId
    )
    .maybeSingle();

  if (
    ticketError ||
    !ticket
  ) {
    return;
  }

  if (
    ticket.status ===
    "closed"
  ) {
    return;
  }

  const {
    error:
      replyError,
  } = await admin
    .from(
      "ticket_replies"
    )
    .insert({
      ticket_id:
        ticket.id,

      user_id:
        user.id,

      message,

      is_admin:
        true,
    });

  if (
    replyError
  ) {
    console.error(
      "Failed to create admin ticket reply:",
      replyError
    );

    return;
  }

  const now =
    new Date().toISOString();

  const nextStatus =
    ticket.status ===
      "resolved"
      ? "in_progress"
      : ticket.status ===
          "open"
        ? "in_progress"
        : ticket.status;

  await admin
    .from(
      "tickets"
    )
    .update({
      status:
        nextStatus,

      updated_at:
        now,

      closed_at:
        null,
    })
    .eq(
      "id",
      ticket.id
    );

  revalidatePath(
    `/admin/tickets/${ticket.id}`
  );

  revalidatePath(
    "/admin/tickets"
  );

  revalidatePath(
    `/tickets/${ticket.id}`
  );

  revalidatePath(
    "/tickets"
  );

  revalidatePath(
    "/dashboard"
  );
}

export async function updateTicketStatus(
  formData: FormData
) {
  const {
    admin,
  } =
    await requireAdmin();

  const ticketId =
    textValue(
      formData.get(
        "ticketId"
      )
    );

  const status =
    textValue(
      formData.get(
        "status"
      )
    );

  if (
    !ticketId ||
    !validStatuses.has(
      status
    )
  ) {
    return;
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await admin
    .from(
      "tickets"
    )
    .update({
      status,

      updated_at:
        now,

      closed_at:
        status ===
        "closed"
          ? now
          : null,
    })
    .eq(
      "id",
      ticketId
    );

  if (
    error
  ) {
    console.error(
      "Failed to update ticket status:",
      error
    );

    return;
  }

  revalidatePath(
    `/admin/tickets/${ticketId}`
  );

  revalidatePath(
    "/admin/tickets"
  );

  revalidatePath(
    `/tickets/${ticketId}`
  );

  revalidatePath(
    "/tickets"
  );

  revalidatePath(
    "/dashboard"
  );
}