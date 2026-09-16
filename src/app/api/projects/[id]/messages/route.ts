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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ChatAttachment = {
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type MessageBody = {
  message?: string;
  attachments?: ChatAttachment[];
};

async function authorizeProject(
  projectId: string
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
    return {
      error:
        "Authentication required.",
      status: 401,
      user: null,
      admin: null,
      project: null,
      isAdmin: false,
    };
  }

  const admin =
    createAdminClient();

  const {
    data: project,
  } = await admin
    .from("projects")
    .select(`
      id,
      user_id,
      status
    `)
    .eq(
      "id",
      projectId
    )
    .maybeSingle();

  if (!project) {
    return {
      error:
        "Project not found.",
      status: 404,
      user: null,
      admin: null,
      project: null,
      isAdmin: false,
    };
  }

  const {
    data: adminUser,
  } = await admin
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  const isAdmin =
    Boolean(adminUser);

  if (
    project.user_id !==
      user.id &&
    !isAdmin
  ) {
    return {
      error:
        "Project not found.",
      status: 404,
      user: null,
      admin: null,
      project: null,
      isAdmin: false,
    };
  }

  return {
    error: null,
    status: 200,
    user,
    admin,
    project,
    isAdmin,
  };
}

async function serializeMessages(
  projectId: string
) {
  const admin =
    createAdminClient();

  const {
    data: messages,
    error,
  } = await admin
    .from(
      "project_messages"
    )
    .select(`
      id,
      project_id,
      sender_user_id,
      sender_type,
      message,
      created_at,
      edited_at,
      project_message_attachments (
        id,
        storage_path,
        file_name,
        file_type,
        file_size,
        created_at
      )
    `)
    .eq(
      "project_id",
      projectId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return Promise.all(
    (
      messages ??
      []
    ).map(
      async (
        message
      ) => {
        const attachments =
          await Promise.all(
            (
              message.project_message_attachments ??
              []
            ).map(
              async (
                attachment
              ) => {
                const {
                  data,
                } =
                  await admin.storage
                    .from(
                      "project-files"
                    )
                    .createSignedUrl(
                      attachment.storage_path,
                      60 * 60
                    );

                return {
                  id:
                    attachment.id,

                  fileName:
                    attachment.file_name,

                  fileType:
                    attachment.file_type,

                  fileSize:
                    Number(
                      attachment.file_size ??
                        0
                    ),

                  url:
                    data?.signedUrl ??
                    null,
                };
              }
            )
          );

        return {
          id:
            message.id,

          senderUserId:
            message.sender_user_id,

          senderType:
            message.sender_type,

          message:
            message.message,

          createdAt:
            message.created_at,

          editedAt:
            message.edited_at,

          attachments,
        };
      }
    )
  );
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const {
    id: projectId,
  } =
    await context.params;

  const authorization =
    await authorizeProject(
      projectId
    );

  if (
    authorization.error
  ) {
    return NextResponse.json(
      {
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      }
    );
  }

  try {
    const messages =
      await serializeMessages(
        projectId
      );

    return NextResponse.json({
      messages,
    });
  } catch (error) {
    console.error(
      "Failed loading project messages:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load project chat.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const {
    id: projectId,
  } =
    await context.params;

  const authorization =
    await authorizeProject(
      projectId
    );

  if (
    authorization.error ||
    !authorization.user ||
    !authorization.admin ||
    !authorization.project
  ) {
    return NextResponse.json(
      {
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      }
    );
  }

  if (
    authorization.project.status ===
    "awaiting_requirements"
  ) {
    return NextResponse.json(
      {
        error:
          "Submit project requirements before using project chat.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    authorization.project.status ===
    "cancelled"
  ) {
    return NextResponse.json(
      {
        error:
          "This project is cancelled.",
      },
      {
        status: 409,
      }
    );
  }

  let body:
    | MessageBody
    | null = null;

  try {
    body =
      (await request.json()) as MessageBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid message request.",
      },
      {
        status: 400,
      }
    );
  }

  const message =
    String(
      body?.message ??
        ""
    ).trim();

  const attachments =
    Array.isArray(
      body?.attachments
    )
      ? body.attachments
      : [];

  if (
    !message &&
    attachments.length ===
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
    attachments.length >
    5
  ) {
    return NextResponse.json(
      {
        error:
          "You can attach up to 5 files per message.",
      },
      {
        status: 400,
      }
    );
  }

  for (
    const attachment
    of attachments
  ) {
    const expectedPrefix =
      `${projectId}/chat/${authorization.user.id}/`;

    if (
      !attachment.path.startsWith(
        expectedPrefix
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid chat attachment.",
        },
        {
          status: 400,
        }
      );
    }
  }

  const {
    data:
      createdMessage,
    error:
      messageError,
  } =
    await authorization.admin
      .from(
        "project_messages"
      )
      .insert({
        project_id:
          projectId,

        sender_user_id:
          authorization
            .user.id,

        sender_type:
          authorization.isAdmin
            ? "admin"
            : "customer",

        message:
          message ||
          null,
      })
      .select("id")
      .single();

  if (
    messageError ||
    !createdMessage
  ) {
    console.error(
      "Failed creating project message:",
      messageError
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

  if (
    attachments.length >
    0
  ) {
    const {
      error:
        attachmentError,
    } =
      await authorization.admin
        .from(
          "project_message_attachments"
        )
        .insert(
          attachments.map(
            (
              attachment
            ) => ({
              message_id:
                createdMessage.id,

              storage_path:
                attachment.path,

              file_name:
                attachment.fileName,

              file_type:
                attachment.fileType ||
                null,

              file_size:
                Number(
                  attachment.fileSize
                ),
            })
          )
        );

    if (
      attachmentError
    ) {
      console.error(
        "Failed attaching files to project message:",
        attachmentError
      );

      await authorization.admin
        .from(
          "project_messages"
        )
        .delete()
        .eq(
          "id",
          createdMessage.id
        );

      await authorization.admin.storage
        .from(
          "project-files"
        )
        .remove(
          attachments.map(
            (
              attachment
            ) =>
              attachment.path
          )
        );

      return NextResponse.json(
        {
          error:
            "Unable to attach files to message.",
        },
        {
          status: 500,
        }
      );
    }
  }

  const messages =
    await serializeMessages(
      projectId
    );

  return NextResponse.json({
    success: true,
    messages,
  });
}