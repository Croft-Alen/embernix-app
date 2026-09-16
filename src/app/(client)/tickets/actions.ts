"use server";

import {
  randomBytes,
} from "crypto";

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

function textValue(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function createTicketNumber() {
  const date =
    new Date();

  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  const suffix =
    randomBytes(
      3
    )
      .toString(
        "hex"
      )
      .toUpperCase();

  return `TKT-${year}${month}${day}-${suffix}`;
}

export async function createTicket(
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
    redirect(
      "/login"
    );
  }

  const subject =
    textValue(
      formData.get(
        "subject"
      )
    );

  const topicId =
    textValue(
      formData.get(
        "topicId"
      )
    );

  const priorityId =
    textValue(
      formData.get(
        "priorityId"
      )
    );

  const productId =
    textValue(
      formData.get(
        "productId"
      )
    );

  const message =
    textValue(
      formData.get(
        "message"
      )
    );

  if (
    subject.length <
      3 ||
    subject.length >
      160
  ) {
    redirect(
      "/tickets/new?error=Please enter a valid subject."
    );
  }

  if (
    !topicId
  ) {
    redirect(
      "/tickets/new?error=Please select a topic."
    );
  }

  if (
    !priorityId
  ) {
    redirect(
      "/tickets/new?error=Please select a priority."
    );
  }

  if (
    message.length <
      10 ||
    message.length >
      10000
  ) {
    redirect(
      "/tickets/new?error=Please enter a detailed message."
    );
  }

  const admin =
    createAdminClient();

  const [
    topicResult,
    priorityResult,
  ] =
    await Promise.all([
      admin
        .from(
          "ticket_topics"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          topicId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle(),

      admin
        .from(
          "ticket_priorities"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          priorityId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle(),
    ]);

  if (
    !topicResult.data ||
    !priorityResult.data
  ) {
    redirect(
      "/tickets/new?error=Invalid ticket options."
    );
  }

  if (
    productId
  ) {
    const {
      data:
        ownership,
    } = await admin
      .from(
        "customer_products"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "product_id",
        productId
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

    if (
      !ownership
    ) {
      redirect(
        "/tickets/new?error=You do not own the selected product."
      );
    }
  }

  const ticketNumber =
    createTicketNumber();

  const {
    data:
      ticket,
    error:
      ticketError,
  } = await admin
    .from(
      "tickets"
    )
    .insert({
      ticket_number:
        ticketNumber,

      user_id:
        user.id,

      subject,

      topic_id:
        topicId,

      priority_id:
        priorityId,

      product_id:
        productId ||
        null,

      status:
        "open",
    })
    .select(
      "id"
    )
    .single();

  if (
    ticketError ||
    !ticket
  ) {
    console.error(
      "Failed to create ticket:",
      ticketError
    );

    redirect(
      "/tickets/new?error=Unable to create ticket. Please try again."
    );
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
        false,
    });

  if (
    replyError
  ) {
    console.error(
      "Failed to create first ticket reply:",
      replyError
    );

    await admin
      .from(
        "tickets"
      )
      .delete()
      .eq(
        "id",
        ticket.id
      );

    redirect(
      "/tickets/new?error=Unable to create ticket. Please try again."
    );
  }

  revalidatePath(
    "/tickets"
  );

  revalidatePath(
    "/dashboard"
  );

  redirect(
    `/tickets/${ticket.id}`
  );
}

export async function replyToTicket(
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
    redirect(
      "/login"
    );
  }

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

  const admin =
    createAdminClient();

  const {
    data:
      ticket,
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
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    !ticket ||
    ticket.status ===
      "closed"
  ) {
    return;
  }

  const {
    error,
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
        false,
    });

  if (
    error
  ) {
    console.error(
      "Failed to reply to ticket:",
      error
    );

    return;
  }

  await admin
    .from(
      "tickets"
    )
    .update({
      status:
        ticket.status ===
        "resolved"
          ? "open"
          : ticket.status,

      updated_at:
        new Date().toISOString(),

      closed_at:
        null,
    })
    .eq(
      "id",
      ticket.id
    );

  revalidatePath(
    `/tickets/${ticket.id}`
  );

  revalidatePath(
    "/tickets"
  );
}

export async function closeTicket(
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
    redirect(
      "/login"
    );
  }

  const ticketId =
    textValue(
      formData.get(
        "ticketId"
      )
    );

  if (
    !ticketId
  ) {
    return;
  }

  const admin =
    createAdminClient();

  const {
    data:
      ticket,
  } = await admin
    .from(
      "tickets"
    )
    .select(
      "id"
    )
    .eq(
      "id",
      ticketId
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    !ticket
  ) {
    return;
  }

  await admin
    .from(
      "tickets"
    )
    .update({
      status:
        "closed",

      closed_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      ticket.id
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