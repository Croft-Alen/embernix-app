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
  }>;
};

const allowedReactions =
  new Set([
    "👍",
    "❤️",
    "😂",
    "🎉",
    "😮",
    "👀",
    "🙏",
    "🔥",
  ]);

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      id: ticketId,
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
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const replyId =
      String(
        body.replyId ??
          ""
      );

    const emoji =
      String(
        body.emoji ??
          ""
      );

    if (
      !replyId ||
      !allowedReactions.has(
        emoji
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid reaction.",
        },
        {
          status: 400,
        }
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
      return NextResponse.json(
        {
          error:
            "Ticket not found.",
        },
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

    const hasAccess =
      ticket.user_id ===
        user.id ||
      Boolean(
        adminUser
      );

    if (
      !hasAccess
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data:
        reply,
    } = await admin
      .from(
        "ticket_replies"
      )
      .select(
        "id"
      )
      .eq(
        "id",
        replyId
      )
      .eq(
        "ticket_id",
        ticket.id
      )
      .maybeSingle();

    if (!reply) {
      return NextResponse.json(
        {
          error:
            "Message not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data:
        existing,
    } = await admin
      .from(
        "ticket_reactions"
      )
      .select(
        "id"
      )
      .eq(
        "reply_id",
        reply.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "emoji",
        emoji
      )
      .maybeSingle();

    if (
      existing
    ) {
      await admin
        .from(
          "ticket_reactions"
        )
        .delete()
        .eq(
          "id",
          existing.id
        );

      return NextResponse.json({
        success:
          true,

        active:
          false,
      });
    }

    const {
      error,
    } = await admin
      .from(
        "ticket_reactions"
      )
      .insert({
        ticket_id:
          ticket.id,

        reply_id:
          reply.id,

        user_id:
          user.id,

        emoji,
      });

    if (
      error
    ) {
      console.error(
        "Reaction insert failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to add reaction.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success:
        true,

      active:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Ticket reaction failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update reaction.",
      },
      {
        status: 500,
      }
    );
  }
}