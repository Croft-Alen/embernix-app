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
    throw new Error(
      "Authentication required."
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
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!adminUser) {
    throw new Error(
      "Admin access required."
    );
  }

  return {
    user,
    admin,
  };
}

export async function updateProject(
  projectId: string,
  formData: FormData
) {
  const {
    admin,
  } =
    await requireAdmin();

  const status =
    String(
      formData.get(
        "status"
      ) ?? ""
    );

  const allowed = [
    "awaiting_requirements",
    "in_progress",
    "completed",
    "cancelled",
  ];

  if (
    !allowed.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid project status."
    );
  }

  const deliveryNote =
    String(
      formData.get(
        "deliveryNote"
      ) ?? ""
    ).trim();

  const deliveryUrl =
    String(
      formData.get(
        "deliveryUrl"
      ) ?? ""
    ).trim();

  const adminNotes =
    String(
      formData.get(
        "adminNotes"
      ) ?? ""
    ).trim();

  const {
    error,
  } = await admin
    .from("projects")
    .update({
      status,

      delivery_note:
        deliveryNote ||
        null,

      delivery_url:
        deliveryUrl ||
        null,

      admin_notes:
        adminNotes ||
        null,

      completed_at:
        status ===
        "completed"
          ? new Date().toISOString()
          : null,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      projectId
    );

  if (error) {
    throw new Error(
      "Unable to update project."
    );
  }

  revalidatePath(
    `/admin/projects/${projectId}`
  );

  revalidatePath(
    `/projects/${projectId}`
  );
}

export async function sendAdminProjectMessage(
  projectId: string,
  formData: FormData
) {
  const {
    user,
    admin,
  } =
    await requireAdmin();

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

  const {
    data:
      createdMessage,
    error,
  } = await admin
    .from(
      "project_messages"
    )
    .insert({
      project_id:
        projectId,

      sender_user_id:
        user.id,

      sender_type:
        "admin",

      message:
        message ||
        null,
    })
    .select("id")
    .single();

  if (
    error ||
    !createdMessage
  ) {
    throw new Error(
      "Unable to send message."
    );
  }

  for (
    const file
    of files.slice(
      0,
      5
    )
  ) {
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      continue;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "file";

    const path =
      `${projectId}/${createdMessage.id}/${crypto.randomUUID()}.${extension}`;

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
        path,
        buffer,
        {
          contentType:
            file.type ||
            "application/octet-stream",
        }
      );

    if (uploadError) {
      continue;
    }

    await admin
      .from(
        "project_message_attachments"
      )
      .insert({
        message_id:
          createdMessage.id,

        storage_path:
          path,

        file_name:
          file.name,

        file_type:
          file.type ||
          null,

        file_size:
          file.size,
      });
  }

  revalidatePath(
    `/admin/projects/${projectId}`
  );

  revalidatePath(
    `/projects/${projectId}`
  );
}