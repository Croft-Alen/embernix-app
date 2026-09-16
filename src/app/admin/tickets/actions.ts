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

import {
  createNotification,
} from "@/lib/notifications/create-notification";

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
    error:
      adminError,
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
    adminError ||
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
      "id, user_id, status"
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
    data:
      reply,
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
    })
    .select(
      "id"
    )
    .single();

  if (
    replyError ||
    !reply
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

  const {
    error:
      ticketUpdateError,
  } = await admin
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

  if (
    ticketUpdateError
  ) {
    console.error(
      "Failed to update ticket after admin reply:",
      ticketUpdateError
    );
  }

  await createNotification({
    userId:
      ticket.user_id,

    type:
      "ticket_reply",

    title:
      "New ticket reply",

    message:
      "Embernix replied to your ticket.",

    href:
      `/tickets/${ticket.id}`,

    metadata: {
      ticketId:
        ticket.id,

      replyId:
        reply.id,
    },

    dedupeKey:
      `ticket-reply:${reply.id}`,
  });

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

  revalidatePath(
    "/notifications"
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

  /*
   * Fetch the current ticket first.
   *
   * We need the owner for notifications and the
   * previous status so unchanged updates do not
   * create another notification.
   */
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
      "id, user_id, status"
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

  /*
   * Nothing changed.
   *
   * Avoid unnecessary DB writes and especially
   * duplicate notifications.
   */
  if (
    ticket.status ===
    status
  ) {
    return;
  }

  const now =
    new Date().toISOString();

  const {
    error:
      updateError,
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
      ticket.id
    );

  if (
    updateError
  ) {
    console.error(
      "Failed to update ticket status:",
      updateError
    );

    return;
  }

  /*
   * Only meaningful customer-facing ticket
   * state changes create notifications.
   *
   * open -> in_progress:
   * no notification
   *
   * -> resolved:
   * notify
   *
   * -> closed:
   * notify
   */
  if (
    status ===
    "resolved"
  ) {
    await createNotification({
      userId:
        ticket.user_id,

      type:
        "ticket_resolved",

      title:
        "Ticket resolved",

      message:
        "Your ticket has been marked as resolved.",

      href:
        `/tickets/${ticket.id}`,

      metadata: {
        ticketId:
          ticket.id,

        previousStatus:
          ticket.status,

        status:
          "resolved",
      },

      dedupeKey:
        `ticket-status:${ticket.id}:resolved:${now}`,
    });
  }

  if (
    status ===
    "closed"
  ) {
    await createNotification({
      userId:
        ticket.user_id,

      type:
        "ticket_closed",

      title:
        "Ticket closed",

      message:
        "Your ticket has been closed.",

      href:
        `/tickets/${ticket.id}`,

      metadata: {
        ticketId:
          ticket.id,

        previousStatus:
          ticket.status,

        status:
          "closed",
      },

      dedupeKey:
        `ticket-status:${ticket.id}:closed:${now}`,
    });
  }

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

  revalidatePath(
    "/notifications"
  );
}