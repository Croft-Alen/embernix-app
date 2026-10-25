import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET() {
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

  const [
    notificationsResult,
    unreadResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "notifications"
        )
        .select(`
          id,
          type,
          title,
          message,
          href,
          read_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          20
        ),

      supabase
        .from(
          "notifications"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "user_id",
          user.id
        )
        .is(
          "read_at",
          null
        ),
    ]);

  return NextResponse.json({
    notifications:
      notificationsResult.data ??
      [],

    unreadCount:
      unreadResult.count ??
      0,
  });
}

export async function PATCH(
  request: NextRequest
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
    await request
      .json()
      .catch(
        () => ({})
      );

  const id =
    typeof body.id ===
    "string"
      ? body.id
      : null;

  const markAll =
    body.all ===
    true;

  const now =
    new Date().toISOString();

  if (
    markAll
  ) {
    const {
      error,
    } = await supabase
      .from(
        "notifications"
      )
      .update({
        read_at:
          now,
      })
      .eq(
        "user_id",
        user.id
      )
      .is(
        "read_at",
        null
      );

    if (
      error
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to update notifications.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success:
        true,
    });
  }

  if (
    !id
  ) {
    return NextResponse.json(
      {
        error:
          "Notification ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "notifications"
    )
    .update({
      read_at:
        now,
    })
    .eq(
      "id",
      id
    )
    .eq(
      "user_id",
      user.id
    );

  if (
    error
  ) {
    return NextResponse.json(
      {
        error:
          "Unable to update notification.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success:
      true,
  });
}