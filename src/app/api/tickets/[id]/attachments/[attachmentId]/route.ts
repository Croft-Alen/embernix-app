import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const {
    id: ticketId,
    attachmentId,
  } =
    await context.params;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
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
      "id, user_id"
    )
    .eq(
      "id",
      ticketId
    )
    .maybeSingle();

  if (!ticket) {
    return new NextResponse(
      "Not found",
      {
        status: 404,
      }
    );
  }

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
    ticket.user_id !==
      user.id &&
    !adminUser
  ) {
    return new NextResponse(
      "Forbidden",
      {
        status: 403,
      }
    );
  }

  const {
    data:
      attachment,
  } = await admin
    .from(
      "ticket_attachments"
    )
    .select(`
      id,
      ticket_id,
      storage_path
    `)
    .eq(
      "id",
      attachmentId
    )
    .eq(
      "ticket_id",
      ticket.id
    )
    .maybeSingle();

  if (
    !attachment
  ) {
    return new NextResponse(
      "Not found",
      {
        status: 404,
      }
    );
  }

  const {
    data,
    error,
  } =
    await admin.storage
      .from(
        "ticket-files"
      )
      .createSignedUrl(
        attachment.storage_path,
        60
      );

  if (
    error ||
    !data?.signedUrl
  ) {
    return new NextResponse(
      "Unable to access file",
      {
        status: 500,
      }
    );
  }

  return NextResponse.redirect(
    data.signedUrl
  );
}