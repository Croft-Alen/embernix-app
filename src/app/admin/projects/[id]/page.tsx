import Link from "next/link";

import {
  ArrowLeft,
  Download,
  ExternalLink,
  File,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import ProjectChat from "@/components/projects/ProjectChat";

import {
  updateProject,
} from "../actions";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RequirementAttachment = {
  id: string;
  kind:
    | "reference"
    | "project_file";
  storage_path: string;
  file_name: string;
  file_type:
    | string
    | null;
  file_size:
    | number
    | null;
};

type RequirementRow = {
  id: string;
  description: string;
  reference_urls:
    | string[]
    | null;
  additional_notes:
    | string
    | null;
  submitted_at: string;
  project_requirement_attachments:
    RequirementAttachment[];
};

function formatFileSize(
  bytes:
    | number
    | null
) {
  const value =
    Number(
      bytes ?? 0
    );

  if (
    value < 1024
  ) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

export default async function AdminProjectPage({
  params,
}: PageProps) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const admin =
    createAdminClient();

  const {
    data: adminUser,
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
    notFound();
  }

  const {
    data: project,
    error:
      projectError,
  } = await admin
    .from("projects")
    .select(`
      id,
      project_number,
      user_id,
      service_id,
      order_id,
      invoice_id,
      title,
      status,
      admin_notes,
      created_at,
      updated_at,
      completed_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    projectError
  ) {
    console.error(
      "Unable to load admin project:",
      projectError
    );
  }

  if (!project) {
    notFound();
  }

  const {
    data:
      requirementRows,
    error:
      requirementsError,
  } = await admin
    .from(
      "project_requirements"
    )
    .select(`
      id,
      description,
      reference_urls,
      additional_notes,
      submitted_at,
      project_requirement_attachments (
        id,
        kind,
        storage_path,
        file_name,
        file_type,
        file_size
      )
    `)
    .eq(
      "project_id",
      project.id
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    );

  if (
    requirementsError
  ) {
    console.error(
      "Unable to load project requirements:",
      requirementsError
    );
  }

  const rows =
    (
      requirementRows ??
      []
    ) as RequirementRow[];

  const requirements =
    await Promise.all(
      rows.map(
        async (
          requirement
        ) => {
          const attachments =
            await Promise.all(
              (
                requirement.project_requirement_attachments ??
                []
              ).map(
                async (
                  attachment
                ) => {
                  const {
                    data,
                    error,
                  } =
                    await admin.storage
                      .from(
                        "project-files"
                      )
                      .createSignedUrl(
                        attachment.storage_path,
                        60 * 60
                      );

                  if (error) {
                    console.error(
                      "Unable to sign requirement attachment:",
                      error
                    );
                  }

                  return {
                    ...attachment,

                    signedUrl:
                      data?.signedUrl ??
                      null,
                  };
                }
              )
            );

          return {
            ...requirement,
            attachments,
          };
        }
      )
    );

  const updateAction =
    updateProject.bind(
      null,
      project.id
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Projects
      </Link>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">
              {
                project.project_number
              }
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              {
                project.title
              }
            </h1>

            <span className="mt-3 inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium capitalize text-[var(--primary)]">
              {project.status.replaceAll(
                "_",
                " "
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {requirements.length ===
          0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
              <h2 className="font-semibold">
                Awaiting customer requirements
              </h2>

              <p className="mt-2 text-sm text-[var(--muted)]">
                The customer has not submitted the project brief yet.
              </p>
            </div>
          ) : (
            requirements.map(
              (
                requirement,
                index
              ) => {
                const referenceFiles =
                  requirement.attachments.filter(
                    (
                      attachment
                    ) =>
                      attachment.kind ===
                      "reference"
                  );

                const projectFiles =
                  requirement.attachments.filter(
                    (
                      attachment
                    ) =>
                      attachment.kind ===
                      "project_file"
                  );

                const urls =
                  Array.isArray(
                    requirement.reference_urls
                  )
                    ? requirement.reference_urls
                    : [];

                return (
                  <div
                    key={
                      requirement.id
                    }
                    className="rounded-2xl border border-[var(--border)] bg-white p-6"
                  >
                    <div>
                      <h2 className="font-semibold">
                        Requirements
                        {requirements.length >
                        1
                          ? ` #${
                              requirements.length -
                              index
                            }`
                          : ""}
                      </h2>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Submitted{" "}
                        {new Date(
                          requirement.submitted_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Project brief
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                        {
                          requirement.description
                        }
                      </p>
                    </div>

                    {urls.length >
                      0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Reference URLs
                        </p>

                        <div className="mt-2 space-y-2">
                          {urls.map(
                            (
                              url
                            ) => (
                              <a
                                key={
                                  url
                                }
                                href={
                                  url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 break-all text-sm font-medium text-[var(--primary)]"
                              >
                                {
                                  url
                                }

                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {referenceFiles.length >
                      0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Reference files
                        </p>

                        <div className="mt-2 space-y-2">
                          {referenceFiles.map(
                            (
                              attachment
                            ) => (
                              <a
                                key={
                                  attachment.id
                                }
                                href={
                                  attachment.signedUrl ??
                                  undefined
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <File className="h-4 w-4 shrink-0" />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {
                                      attachment.file_name
                                    }
                                  </p>

                                  <p className="text-xs text-[var(--muted)]">
                                    {formatFileSize(
                                      attachment.file_size
                                    )}
                                  </p>
                                </div>

                                <Download className="h-4 w-4 text-[var(--muted)]" />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {projectFiles.length >
                      0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Project files
                        </p>

                        <div className="mt-2 space-y-2">
                          {projectFiles.map(
                            (
                              attachment
                            ) => (
                              <a
                                key={
                                  attachment.id
                                }
                                href={
                                  attachment.signedUrl ??
                                  undefined
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <File className="h-4 w-4 shrink-0" />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {
                                      attachment.file_name
                                    }
                                  </p>

                                  <p className="text-xs text-[var(--muted)]">
                                    {formatFileSize(
                                      attachment.file_size
                                    )}
                                  </p>
                                </div>

                                <Download className="h-4 w-4 text-[var(--muted)]" />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {requirement.additional_notes && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Additional notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                          {
                            requirement.additional_notes
                          }
                        </p>
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}

          {project.status !==
            "awaiting_requirements" && (
            <ProjectChat
              projectId={
                project.id
              }
              currentUserId={
                user.id
              }
              disabled={
                project.status ===
                "cancelled" ||
                project.status ===
                  "completed"
              }
            />
          )}

          {project.status ===
            "completed" && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="font-semibold text-[var(--success)]">
                Project completed
              </h2>

              <p className="mt-2 text-sm text-[var(--muted)]">
                This project was marked as completed
                {project.completed_at
                  ? ` on ${new Date(
                      project.completed_at
                    ).toLocaleString()}.`
                  : "."}
              </p>
            </div>
          )}
        </div>

        <form
          action={
            updateAction
          }
          className="h-fit rounded-2xl border border-[var(--border)] bg-white p-5 lg:sticky lg:top-24"
        >
          <label className="text-sm font-medium">
            Status
          </label>

          <select
            name="status"
            defaultValue={
              project.status
            }
            className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="awaiting_requirements">
              Awaiting requirements
            </option>

            <option value="in_progress">
              In progress
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>

          <label className="mt-5 block text-sm font-medium">
            Internal notes
          </label>

          <textarea
            name="adminNotes"
            rows={8}
            defaultValue={
              project.admin_notes ??
              ""
            }
            placeholder="Private Embernix notes..."
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />

          <button
            type="submit"
            className="mt-5 h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Save project
          </button>

          <div className="my-5 border-t border-[var(--border-light)]" />

          <div>
            <p className="text-xs text-[var(--muted)]">
              Order
            </p>

            <Link
              href={`/admin/orders/${project.order_id}`}
              className="mt-1 block text-sm font-medium text-[var(--primary)]"
            >
              View order
            </Link>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[var(--muted)]">
              Invoice
            </p>

            <Link
              href={`/admin/invoices/${project.invoice_id}`}
              className="mt-1 block text-sm font-medium text-[var(--primary)]"
            >
              View invoice
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}