import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createNotification,
} from "@/lib/notifications/create-notification";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_FILES =
  5;

const allowedTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",

    "text/plain",

    "application/json",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);

function safeFileName(
  name: string
) {
  return name
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .replace(
      /_+/g,
      "_"
    )
    .slice(
      0,
      140
    );
}

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

    const admin =
      createAdminClient();

    const {
      data:
        ticket,
    } = await admin
      .from(
        "tickets"
      )
      .select(`
        id,
        user_id,
        status
      `)
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

    const isOwner =
      ticket.user_id ===
      user.id;

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

    const isAdmin =
      Boolean(
        adminUser
      );

    if (
      !isOwner &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this ticket.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      ticket.status ===
      "closed"
    ) {
      return NextResponse.json(
        {
          error:
            "This ticket is closed.",
        },
        {
          status: 409,
        }
      );
    }

    const formData =
      await request.formData();

    const message =
      String(
        formData.get(
          "message"
        ) ?? ""
      ).trim();

    const files =
      formData
        .getAll(
          "files"
        )
        .filter(
          (
            value
          ): value is File =>
            value instanceof
            File
        );

    if (
      !message &&
      files.length ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a message or attach a file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      message.length >
      10000
    ) {
      return NextResponse.json(
        {
          error:
            "Message is too long.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      files.length >
      MAX_FILES
    ) {
      return NextResponse.json(
        {
          error:
            `You can attach up to ${MAX_FILES} files at once.`,
        },
        {
          status: 400,
        }
      );
    }

    for (
      const file
      of files
    ) {
      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              `${file.name} is larger than 10 MB.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        file.type &&
        !allowedTypes.has(
          file.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              `${file.name} is not an allowed file type.`,
          },
          {
            status: 400,
          }
        );
      }
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
          isAdmin,
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
        "Failed to create ticket reply:",
        replyError
      );

      return NextResponse.json(
        {
          error:
            "Unable to send message.",
        },
        {
          status: 500,
        }
      );
    }

    const uploadedPaths:
      string[] = [];

    try {
      for (
        const file
        of files
      ) {
        const cleaned =
          safeFileName(
            file.name ||
              "file"
          );

        const storagePath =
          `${ticket.id}/${reply.id}/${randomUUID()}-${cleaned}`;

        const buffer =
          Buffer.from(
            await file.arrayBuffer()
          );

        const {
          error:
            uploadError,
        } =
          await admin.storage
            .from(
              "ticket-files"
            )
            .upload(
              storagePath,
              buffer,
              {
                contentType:
                  file.type ||
                  "application/octet-stream",

                upsert:
                  false,
              }
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        uploadedPaths.push(
          storagePath
        );

        const {
          error:
            attachmentError,
        } = await admin
          .from(
            "ticket_attachments"
          )
          .insert({
            ticket_id:
              ticket.id,

            reply_id:
              reply.id,

            uploaded_by:
              user.id,

            file_name:
              file.name,

            file_type:
              file.type ||
              null,

            file_size:
              file.size,

            storage_path:
              storagePath,
          });

        if (
          attachmentError
        ) {
          throw attachmentError;
        }
      }
    } catch (
      uploadError
    ) {
      console.error(
        "Ticket attachment upload failed:",
        uploadError
      );

      for (
        const path
        of uploadedPaths
      ) {
        await admin.storage
          .from(
            "ticket-files"
          )
          .remove([
            path,
          ]);
      }

      await admin
        .from(
          "ticket_replies"
        )
        .delete()
        .eq(
          "id",
          reply.id
        );

      return NextResponse.json(
        {
          error:
            "Unable to upload one of the attachments.",
        },
        {
          status: 500,
        }
      );
    }

    const now =
      new Date().toISOString();

    let nextStatus =
      ticket.status;

    if (
      isAdmin &&
      (
        ticket.status ===
          "open" ||
        ticket.status ===
          "resolved"
      )
    ) {
      nextStatus =
        "in_progress";
    }

    if (
      !isAdmin &&
      ticket.status ===
        "resolved"
    ) {
      nextStatus =
        "open";
    }

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

    if (
      isAdmin
    ) {
      await createNotification({
        userId:
          ticket.user_id,

        type:
          "ticket_reply",

        title:
          "New ticket reply",

        message:
          `Embernix replied to your ticket.`,

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
    }

    return NextResponse.json({
      success:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Ticket message route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to send message.",
      },
      {
        status: 500,
      }
    );
  }
}