import {
  randomBytes,
  randomUUID,
} from "crypto";

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

export const runtime =
  "nodejs";

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

function textValue(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function safeFileName(
  value: string
) {
  return value
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

function createTicketNumber() {
  const now =
    new Date();

  const date =
    [
      now.getUTCFullYear(),

      String(
        now.getUTCMonth() +
          1
      ).padStart(
        2,
        "0"
      ),

      String(
        now.getUTCDate()
      ).padStart(
        2,
        "0"
      ),
    ].join(
      ""
    );

  const suffix =
    randomBytes(
      3
    )
      .toString(
        "hex"
      )
      .toUpperCase();

  return `TKT-${date}-${suffix}`;
}

export async function POST(
  request: NextRequest
) {
  try {
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

    const formData =
      await request.formData();

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
      subject.length <
        3 ||
      subject.length >
        160
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid subject.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !topicId ||
      !priorityId
    ) {
      return NextResponse.json(
        {
          error:
            "Topic and priority are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      message.length <
        10 ||
      message.length >
        10000
    ) {
      return NextResponse.json(
        {
          error:
            "Please describe the issue in more detail.",
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
            "You can attach up to 5 files.",
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
      return NextResponse.json(
        {
          error:
            "Invalid ticket options.",
        },
        {
          status: 400,
        }
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
        return NextResponse.json(
          {
            error:
              "You do not own the selected product.",
          },
          {
            status: 403,
          }
        );
      }
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
      .insert({
        ticket_number:
          createTicketNumber(),

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
        "Ticket creation failed:",
        ticketError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create ticket.",
        },
        {
          status: 500,
        }
      );
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
          false,
      })
      .select(
        "id"
      )
      .single();

    if (
      replyError ||
      !reply
    ) {
      await admin
        .from(
          "tickets"
        )
        .delete()
        .eq(
          "id",
          ticket.id
        );

      return NextResponse.json(
        {
          error:
            "Unable to create the first message.",
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
        const storagePath =
          `${ticket.id}/${reply.id}/${randomUUID()}-${safeFileName(
            file.name ||
              "file"
          )}`;

        const bytes =
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
              bytes,
              {
                upsert:
                  false,

                contentType:
                  file.type ||
                  "application/octet-stream",
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
      attachmentError
    ) {
      console.error(
        "Initial ticket attachment failed:",
        attachmentError
      );

      if (
        uploadedPaths.length >
        0
      ) {
        await admin.storage
          .from(
            "ticket-files"
          )
          .remove(
            uploadedPaths
          );
      }

      await admin
        .from(
          "tickets"
        )
        .delete()
        .eq(
          "id",
          ticket.id
        );

      return NextResponse.json(
        {
          error:
            "Unable to upload ticket attachments.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success:
        true,

      ticketId:
        ticket.id,
    });
  } catch (
    error
  ) {
    console.error(
      "Create ticket API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create ticket.",
      },
      {
        status: 500,
      }
    );
  }
}