import {
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UploadPurpose =
  | "chat"
  | "requirements-reference"
  | "requirements-project";

type UploadFile = {
  name?: string;
  type?: string;
  size?: number;
};

type UploadBody = {
  purpose?: UploadPurpose;
  files?: UploadFile[];
};

const MAX_FILE_SIZE =
  50 * 1024 * 1024;

const MAX_CHAT_FILES = 5;
const MAX_REQUIREMENT_FILES = 10;

function getExtension(
  fileName: string
) {
  const parts =
    fileName.split(".");

  if (parts.length < 2) {
    return "";
  }

  const extension =
    parts
      .pop()
      ?.toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      )
      .slice(
        0,
        12
      );

  return extension
    ? `.${extension}`
    : "";
}

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
    !authorization.admin
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

  let body:
    | UploadBody
    | null = null;

  try {
    body =
      (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid upload request.",
      },
      {
        status: 400,
      }
    );
  }

  const purpose =
    body?.purpose;

  const files =
    Array.isArray(
      body?.files
    )
      ? body.files
      : [];

  if (
    purpose !== "chat" &&
    purpose !==
      "requirements-reference" &&
    purpose !==
      "requirements-project"
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid upload purpose.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    files.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "No files selected.",
      },
      {
        status: 400,
      }
    );
  }

  const maxFiles =
    purpose === "chat"
      ? MAX_CHAT_FILES
      : MAX_REQUIREMENT_FILES;

  if (
    files.length >
    maxFiles
  ) {
    return NextResponse.json(
      {
        error:
          `You can upload up to ${maxFiles} files at once.`,
      },
      {
        status: 400,
      }
    );
  }

  if (
    purpose.startsWith(
      "requirements"
    ) &&
    authorization.isAdmin
  ) {
    return NextResponse.json(
      {
        error:
          "Only the customer can submit project requirements.",
      },
      {
        status: 403,
      }
    );
  }

  const signedUploads = [];

  for (
    const file
    of files
  ) {
    const fileName =
      String(
        file.name ?? ""
      ).trim();

    const fileSize =
      Number(
        file.size ?? 0
      );

    const fileType =
      String(
        file.type ??
          "application/octet-stream"
      );

    if (!fileName) {
      return NextResponse.json(
        {
          error:
            "A selected file has no valid name.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        fileSize
      ) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          error:
            `${fileName} is empty.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileSize >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            `${fileName} exceeds the 50 MB limit.`,
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      getExtension(
        fileName
      );

    const folder =
      purpose === "chat"
        ? "chat"
        : purpose ===
            "requirements-reference"
          ? "requirements/reference"
          : "requirements/project-files";

    const storagePath =
      `${projectId}/${folder}/${authorization.user.id}/${randomUUID()}${extension}`;

    const {
      data,
      error,
    } =
      await authorization.admin.storage
        .from(
          "project-files"
        )
        .createSignedUploadUrl(
          storagePath
        );

    if (
      error ||
      !data
    ) {
      console.error(
        "Failed creating signed upload URL:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to prepare file upload.",
        },
        {
          status: 500,
        }
      );
    }

    signedUploads.push({
      path:
        storagePath,

      token:
        data.token,

      fileName,

      fileType,

      fileSize,
    });
  }

  return NextResponse.json({
    uploads:
      signedUploads,
  });
}