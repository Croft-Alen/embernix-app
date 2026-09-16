"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

const ALLOWED_REACTIONS = [
  "👍",
  "❤️",
  "✅",
  "👀",
  "🙏",
];

async function requireCustomerProject(
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
    throw new Error(
      "Authentication required."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: project,
    error,
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
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    error ||
    !project
  ) {
    throw new Error(
      "Project not found."
    );
  }

  return {
    user,
    admin,
    project,
  };
}

export async function submitProjectRequirements(
  projectId: string,
  formData: FormData
) {
  const {
    admin,
    project,
  } =
    await requireCustomerProject(
      projectId
    );

  if (
    project.status !==
    "awaiting_requirements"
  ) {
    throw new Error(
      "Requirements have already been submitted."
    );
  }

  const requirements =
    String(
      formData.get(
        "requirements"
      ) ?? ""
    ).trim();

  if (!requirements) {
    throw new Error(
      "Please enter your project requirements."
    );
  }

  const {
    error,
  } = await admin
    .from("projects")
    .update({
      requirements,

      status:
        "in_progress",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      project.id
    );

  if (error) {
    console.error(
      "Failed submitting project requirements:",
      error
    );

    throw new Error(
      "Unable to submit requirements."
    );
  }

  revalidatePath(
    `/projects/${project.id}`
  );

  revalidatePath(
    "/projects"
  );
}

export async function sendProjectMessage(
  projectId: string,
  formData: FormData
) {
  const {
    user,
    admin,
    project,
  } =
    await requireCustomerProject(
      projectId
    );

  if (
    project.status ===
      "cancelled"
  ) {
    throw new Error(
      "This project is cancelled."
    );
  }

  const message =
    String(
      formData.get(
        "message"
      ) ?? ""
    ).trim();

  const files =
    formData
      .getAll("files")
      .filter(
        (
          value
        ): value is File =>
          value instanceof
            File &&
          value.size > 0
      );

  if (
    !message &&
    files.length === 0
  ) {
    throw new Error(
      "Enter a message or attach a file."
    );
  }

  if (
    files.length > 5
  ) {
    throw new Error(
      "You can attach up to 5 files per message."
    );
  }

  for (const file of files) {
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      throw new Error(
        `${file.name} exceeds the 10 MB limit.`
      );
    }
  }

  const {
    data:
      createdMessage,
    error:
      messageError,
  } = await admin
    .from(
      "project_messages"
    )
    .insert({
      project_id:
        project.id,

      sender_user_id:
        user.id,

      sender_type:
        "customer",

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
      "Failed sending project message:",
      messageError
    );

    throw new Error(
      "Unable to send message."
    );
  }

  try {
    for (
      const file
      of files
    ) {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "file";

      const storagePath =
        `${project.id}/${createdMessage.id}/${crypto.randomUUID()}.${extension}`;

      const buffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      const {
        error:
          uploadError,
      } = await admin.storage
        .from(
          "project-files"
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

      if (uploadError) {
        throw uploadError;
      }

      const {
        error:
          attachmentError,
      } = await admin
        .from(
          "project_message_attachments"
        )
        .insert({
          message_id:
            createdMessage.id,

          storage_path:
            storagePath,

          file_name:
            file.name,

          file_type:
            file.type ||
            null,

          file_size:
            file.size,
        });

      if (
        attachmentError
      ) {
        throw attachmentError;
      }
    }
  } catch (error) {
    console.error(
      "Project attachment upload failed:",
      error
    );

    throw new Error(
      "Message was sent, but one or more attachments could not be uploaded."
    );
  }

  revalidatePath(
    `/projects/${project.id}`
  );
}

export async function toggleProjectReaction(
  projectId: string,
  messageId: string,
  reaction: string
) {
  const {
    user,
    admin,
  } =
    await requireCustomerProject(
      projectId
    );

  if (
    !ALLOWED_REACTIONS.includes(
      reaction
    )
  ) {
    throw new Error(
      "Unsupported reaction."
    );
  }

  const {
    data: message,
  } = await admin
    .from(
      "project_messages"
    )
    .select("id")
    .eq(
      "id",
      messageId
    )
    .eq(
      "project_id",
      projectId
    )
    .maybeSingle();

  if (!message) {
    throw new Error(
      "Message not found."
    );
  }

  const {
    data: existing,
  } = await admin
    .from(
      "project_message_reactions"
    )
    .select("id")
    .eq(
      "message_id",
      messageId
    )
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "reaction",
      reaction
    )
    .maybeSingle();

  if (existing) {
    await admin
      .from(
        "project_message_reactions"
      )
      .delete()
      .eq(
        "id",
        existing.id
      );
  } else {
    await admin
      .from(
        "project_message_reactions"
      )
      .insert({
        message_id:
          messageId,

        user_id:
          user.id,

        reaction,
      });
  }

  revalidatePath(
    `/projects/${projectId}`
  );
}