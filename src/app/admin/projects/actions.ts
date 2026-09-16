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

  const {
    data:
      currentProject,
    error:
      currentProjectError,
  } = await admin
    .from("projects")
    .select(`
      id,
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

  let completedAt =
    currentProject.completed_at;

  if (
    status ===
      "completed" &&
    currentProject.status !==
      "completed"
  ) {
    completedAt =
      new Date().toISOString();
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
    .from("projects")
    .update({
      status,

      admin_notes:
        adminNotes ||
        null,

      completed_at:
        completedAt,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      projectId
    );

  if (error) {
    console.error(
      "Failed updating project:",
      error
    );

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

  revalidatePath(
    "/admin/projects"
  );

  revalidatePath(
    "/projects"
  );
}