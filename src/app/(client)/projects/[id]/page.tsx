import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  File,
  FileText,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import ProjectChat from "@/components/projects/ProjectChat";

import ProjectRequirementsForm from "@/components/projects/ProjectRequirementsForm";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function statusLabel(
  status: string
) {
  switch (
    status
  ) {
    case "awaiting_requirements":
      return "Awaiting requirements";

    case "in_progress":
      return "In progress";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

function statusClass(
  status: string
) {
  switch (
    status
  ) {
    case "awaiting_requirements":
      return "bg-amber-50 text-amber-700";

    case "in_progress":
      return "bg-blue-50 text-blue-700";

    case "completed":
      return "bg-green-50 text-green-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatFileSize(
  bytes:
    | number
    | null
) {
  const value =
    Number(
      bytes ??
        0
    );

  if (
    value <
    1024
  ) {
    return `${value} B`;
  }

  if (
    value <
    1024 *
      1024
  ) {
    return `${(
      value /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    value /
    1024 /
    1024
  ).toFixed(
    1
  )} MB`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle:
        "medium",
    }
  ).format(
    new Date(
      value
    )
  );
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      project,
    error:
      projectError,
  } = await admin
    .from(
      "projects"
    )
    .select(`
      id,
      project_number,
      user_id,
      title,
      status,
      invoice_id,
      created_at,
      completed_at
    `)
    .eq(
      "id",
      id
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
    notFound();
  }

  const {
    data:
      requirementRows,
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
        ascending:
          false,
      }
    );

  const requirements =
    await Promise.all(
      (
        requirementRows ??
        []
      ).map(
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
                  } =
                    await admin.storage
                      .from(
                        "project-files"
                      )
                      .createSignedUrl(
                        attachment.storage_path,
                        60 *
                          60
                      );

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

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="font-mono text-xs font-medium text-[var(--muted)]">
                {
                  project.project_number
                }
              </p>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(
                  project.status
                )}`}
              >
                {statusLabel(
                  project.status
                )}
              </span>
            </div>

            <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.035em] sm:text-[30px]">
              {
                project.title
              }
            </h1>

            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <CalendarDays className="h-4 w-4" />

              <span>
                Created{" "}
                {formatDate(
                  project.created_at
                )}
              </span>
            </div>
          </div>

          {project.invoice_id && (
            <Link
              href={`/invoices/${project.invoice_id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
            >
              <FileText className="h-4 w-4" />
              Invoice
            </Link>
          )}
        </div>
      </section>

      {project.status ===
      "awaiting_requirements" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <ProjectRequirementsForm
            projectId={
              project.id
            }
          />

          <aside className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 xl:sticky xl:top-[104px]">
            <h2 className="text-sm font-semibold">
              Before we start
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Submit the complete project brief and
              relevant files. Once submitted, the
              project moves into progress and chat
              becomes available.
            </p>

            <div className="my-5 border-t border-[var(--border-light)]" />

            <p className="text-xs font-medium text-[var(--muted)]">
              Project created
            </p>

            <p className="mt-1.5 text-sm font-medium">
              {formatDate(
                project.created_at
              )}
            </p>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-5">
            {requirements.map(
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
                  <section
                    key={
                      requirement.id
                    }
                    className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <div className="border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
                      <h2 className="text-sm font-semibold">
                        Requirements
                        {requirements.length >
                        1
                          ? ` #${requirements.length - index}`
                          : ""}
                      </h2>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Submitted{" "}
                        {new Date(
                          requirement.submitted_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-6 px-5 py-5 sm:px-6">
                      <DetailSection
                        title="Project brief"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                          {
                            requirement.description
                          }
                        </p>
                      </DetailSection>

                      {urls.length >
                        0 && (
                        <DetailSection
                          title="References"
                        >
                          <div className="space-y-2">
                            {urls.map(
                              (
                                url: string
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
                                  className="flex items-start gap-2 break-all text-sm font-medium text-[var(--primary)]"
                                >
                                  <span className="min-w-0">
                                    {
                                      url
                                    }
                                  </span>

                                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                </a>
                              )
                            )}
                          </div>
                        </DetailSection>
                      )}

                      {referenceFiles.length >
                        0 && (
                        <AttachmentList
                          title="Reference files"
                          files={
                            referenceFiles
                          }
                        />
                      )}

                      {projectFiles.length >
                        0 && (
                        <AttachmentList
                          title="Project files"
                          files={
                            projectFiles
                          }
                        />
                      )}

                      {requirement.additional_notes && (
                        <DetailSection
                          title="Additional notes"
                        >
                          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                            {
                              requirement.additional_notes
                            }
                          </p>
                        </DetailSection>
                      )}
                    </div>
                  </section>
                );
              }
            )}

            <ProjectChat
              projectId={
                project.id
              }
              currentUserId={
                user.id
              }
              disabled={
                project.status ===
                "cancelled"
              }
            />
          </div>

          <aside className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 xl:sticky xl:top-[104px]">
            <InfoRow
              label="Status"
              value={statusLabel(
                project.status
              )}
            />

            <div className="my-4 border-t border-[var(--border-light)]" />

            <div>
              <p className="text-xs font-medium text-[var(--muted)]">
                Invoice
              </p>

              {project.invoice_id ? (
                <Link
                  href={`/invoices/${project.invoice_id}`}
                  className="mt-1.5 inline-flex text-sm font-semibold text-[var(--primary)]"
                >
                  View invoice
                </Link>
              ) : (
                <p className="mt-1.5 text-sm font-medium">
                  —
                </p>
              )}
            </div>

            <div className="my-4 border-t border-[var(--border-light)]" />

            <InfoRow
              label="Created"
              value={formatDate(
                project.created_at
              )}
            />

            {project.completed_at && (
              <>
                <div className="my-4 border-t border-[var(--border-light)]" />

                <InfoRow
                  label="Completed"
                  value={formatDate(
                    project.completed_at
                  )}
                />
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">
        {
          title
        }
      </p>

      {
        children
      }
    </div>
  );
}

function AttachmentList({
  title,
  files,
}: {
  title: string;
  files: Array<{
    id: string;
    file_name: string;
    file_size:
      | number
      | null;
    signedUrl:
      | string
      | null;
  }>;
}) {
  return (
    <DetailSection
      title={
        title
      }
    >
      <div className="divide-y divide-[var(--border-light)] overflow-hidden rounded-xl border border-[var(--border)]">
        {files.map(
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
              className="flex items-center gap-3 px-3.5 py-3"
            >
              <File className="h-4 w-4 shrink-0 text-[var(--muted)]" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {
                    attachment.file_name
                  }
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {formatFileSize(
                    attachment.file_size
                  )}
                </p>
              </div>

              <Download className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            </a>
          )
        )}
      </div>
    </DetailSection>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--muted)]">
        {
          label
        }
      </p>

      <p className="mt-1.5 text-sm font-semibold">
        {
          value
        }
      </p>
    </div>
  );
}