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

type RequirementAttachment = {
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;

  kind:
    | "reference"
    | "project_file";
};

type RequirementBody = {
  description?: string;
  additionalNotes?: string;

  referenceUrls?: string[];

  attachments?: RequirementAttachment[];
};

function validateUrls(
  urls: string[]
) {
  const valid: string[] =
    [];

  for (
    const value
    of urls
  ) {
    const cleaned =
      value.trim();

    if (!cleaned) {
      continue;
    }

    try {
      const url =
        new URL(
          cleaned
        );

      if (
        url.protocol !==
          "http:" &&
        url.protocol !==
          "https:"
      ) {
        continue;
      }

      valid.push(
        url.toString()
      );
    } catch {
      continue;
    }
  }

  return valid.slice(
    0,
    20
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const {
    id: projectId,
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
    data: project,
    error:
      projectError,
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
    projectError ||
    !project
  ) {
    return NextResponse.json(
      {
        error:
          "Project not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    project.status !==
    "awaiting_requirements"
  ) {
    return NextResponse.json(
      {
        error:
          "Requirements are not currently being requested.",
      },
      {
        status: 409,
      }
    );
  }

  let body:
    | RequirementBody
    | null = null;

  try {
    body =
      (await request.json()) as RequirementBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid requirements submission.",
      },
      {
        status: 400,
      }
    );
  }

  const description =
    String(
      body?.description ??
        ""
    ).trim();

  const additionalNotes =
    String(
      body?.additionalNotes ??
        ""
    ).trim();

  if (!description) {
    return NextResponse.json(
      {
        error:
          "Project requirements are required.",
      },
      {
        status: 400,
      }
    );
  }

  const referenceUrls =
    validateUrls(
      Array.isArray(
        body?.referenceUrls
      )
        ? body.referenceUrls
        : []
    );

  const attachments =
    Array.isArray(
      body?.attachments
    )
      ? body.attachments
      : [];

  if (
    attachments.length >
    20
  ) {
    return NextResponse.json(
      {
        error:
          "Too many attachments.",
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
    if (
      attachment.kind !==
        "reference" &&
      attachment.kind !==
        "project_file"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid requirement attachment.",
        },
        {
          status: 400,
        }
      );
    }

    const expectedFolder =
      attachment.kind ===
      "reference"
        ? `${projectId}/requirements/reference/${user.id}/`
        : `${projectId}/requirements/project-files/${user.id}/`;

    if (
      !attachment.path.startsWith(
        expectedFolder
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attachment path.",
        },
        {
          status: 400,
        }
      );
    }
  }

  const {
    data: requirement,
    error:
      requirementError,
  } = await admin
    .from(
      "project_requirements"
    )
    .insert({
      project_id:
        project.id,

      submitted_by:
        user.id,

      description,

      reference_urls:
        referenceUrls,

      additional_notes:
        additionalNotes ||
        null,
    })
    .select("id")
    .single();

  if (
    requirementError ||
    !requirement
  ) {
    console.error(
      "Failed creating project requirements:",
      requirementError
    );

    return NextResponse.json(
      {
        error:
          "Unable to submit project requirements.",
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
    } = await admin
      .from(
        "project_requirement_attachments"
      )
      .insert(
        attachments.map(
          (
            attachment
          ) => ({
            requirement_id:
              requirement.id,

            kind:
              attachment.kind,

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
        "Failed creating requirement attachments:",
        attachmentError
      );

      await admin
        .from(
          "project_requirements"
        )
        .delete()
        .eq(
          "id",
          requirement.id
        );

      await admin.storage
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
            "Unable to save requirement attachments.",
        },
        {
          status: 500,
        }
      );
    }
  }

  const {
    error:
      projectUpdateError,
  } = await admin
    .from("projects")
    .update({
      status:
        "in_progress",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      project.id
    )
    .eq(
      "status",
      "awaiting_requirements"
    );

  if (
    projectUpdateError
  ) {
    console.error(
      "Failed updating project after requirements:",
      projectUpdateError
    );

    await admin
      .from(
        "project_requirements"
      )
      .delete()
      .eq(
        "id",
        requirement.id
      );

    await admin.storage
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
          "Unable to finalize requirements submission.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    requirementId:
      requirement.id,
  });
}