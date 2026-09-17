"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createNotification,
} from "@/lib/notifications/create-notification";

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
    .select(
      "user_id"
    )
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

  const allowedStatuses = [
    "awaiting_requirements",
    "in_progress",
    "completed",
    "cancelled",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid project status."
    );
  }

  const adminNotes =
    String(
      formData.get(
        "adminNotes"
      ) ?? ""
    ).trim();

  /*
   * Load the existing project first.
   *
   * We need:
   * - previous status
   * - customer ID
   * - project title
   * - existing completed_at
   *
   * This also prevents duplicate notifications
   * when the status did not actually change.
   */
  const {
    data:
      currentProject,
    error:
      currentProjectError,
  } = await admin
    .from(
      "projects"
    )
    .select(`
      id,
      user_id,
      title,
      status,
      completed_at
    `)
    .eq(
      "id",
      projectId
    )
    .maybeSingle();

  if (
    currentProjectError ||
    !currentProject
  ) {
    console.error(
      "Unable to load project before update:",
      currentProjectError
    );

    throw new Error(
      "Project not found."
    );
  }

  const statusChanged =
    currentProject.status !==
    status;

  const now =
    new Date().toISOString();

  let completedAt =
    currentProject.completed_at;

  if (
    status ===
      "completed" &&
    currentProject.status !==
      "completed"
  ) {
    completedAt =
      now;
  }

  if (
    status !==
    "completed"
  ) {
    completedAt =
      null;
  }

  const {
    error,
  } = await admin
    .from(
      "projects"
    )
    .update({
      status,

      admin_notes:
        adminNotes ||
        null,

      completed_at:
        completedAt,

      updated_at:
        now,
    })
    .eq(
      "id",
      projectId
    );

  if (
    error
  ) {
    console.error(
      "Failed updating project:",
      error
    );

    throw new Error(
      "Unable to update project."
    );
  }

  /*
   * Notifications only happen when the
   * project's status genuinely changed.
   *
   * We intentionally DO NOT notify for:
   *
   * awaiting_requirements
   *
   * because that is the normal initial stage.
   */
  if (
    statusChanged
  ) {
    if (
      status ===
      "in_progress"
    ) {
      await createNotification({
        userId:
          currentProject.user_id,

        type:
          "project_in_progress",

        title:
          "Project in progress",

        message:
          `${currentProject.title} is now in progress.`,

        href:
          `/projects/${currentProject.id}`,

        metadata: {
          projectId:
            currentProject.id,

          previousStatus:
            currentProject.status,

          status:
            "in_progress",
        },

        dedupeKey:
          `project-status:${currentProject.id}:in_progress:${now}`,
      });
    }

    if (
      status ===
      "completed"
    ) {
      await createNotification({
        userId:
          currentProject.user_id,

        type:
          "project_completed",

        title:
          "Project completed",

        message:
          `${currentProject.title} has been completed.`,

        href:
          `/projects/${currentProject.id}`,

        metadata: {
          projectId:
            currentProject.id,

          previousStatus:
            currentProject.status,

          status:
            "completed",
        },

        dedupeKey:
          `project-status:${currentProject.id}:completed:${now}`,
      });
    }

    if (
      status ===
      "cancelled"
    ) {
      await createNotification({
        userId:
          currentProject.user_id,

        type:
          "project_cancelled",

        title:
          "Project cancelled",

        message:
          `${currentProject.title} has been cancelled.`,

        href:
          `/projects/${currentProject.id}`,

        metadata: {
          projectId:
            currentProject.id,

          previousStatus:
            currentProject.status,

          status:
            "cancelled",
        },

        dedupeKey:
          `project-status:${currentProject.id}:cancelled:${now}`,
      });
    }
  }

  revalidatePath(
    `/admin/projects/${projectId}`
  );

  revalidatePath(
    `/projects/${projectId}`
  );

  revalidatePath(
    "/admin/projects"
  );

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/notifications"
  );
}