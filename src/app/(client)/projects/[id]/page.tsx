import Link from "next/link";

import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import ProjectChat from "@/components/projects/ProjectChat";

import {
  submitProjectRequirements,
} from "../actions";

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

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
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
    redirect("/login");
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
      project_number,
      user_id,
      title,
      status,
      requirements,
      delivery_note,
      delivery_url,
      invoice_id,
      created_at,
      completed_at,
      services (
        name
      )
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
    error ||
    !project
  ) {
    notFound();
  }

  const {
    data:
      rawMessages,
  } = await admin
    .from(
      "project_messages"
    )
    .select(`
      id,
      sender_user_id,
      sender_type,
      message,
      created_at,
      project_message_attachments (
        id,
        storage_path,
        file_name,
        file_type,
        file_size
      ),
      project_message_reactions (
        id,
        user_id,
        reaction
      )
    `)
    .eq(
      "project_id",
      project.id
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  const messages =
    await Promise.all(
      (
        rawMessages ??
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
                    ...attachment,

                    signed_url:
                      data?.signedUrl ??
                      "#",
                  };
                }
              )
            );

          return {
            id:
              message.id,

            sender_user_id:
              message.sender_user_id,

            sender_type:
              message.sender_type as
                | "customer"
                | "admin",

            message:
              message.message,

            created_at:
              message.created_at,

            attachments,

            reactions:
              message.project_message_reactions ??
              [],
          };
        }
      )
    );

  const requirementAction =
    submitProjectRequirements.bind(
      null,
      project.id
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Projects
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <p className="text-xs text-[var(--muted)]">
              {
                project.project_number
              }
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              {
                project.title
              }
            </h1>

            <p className="mt-2 text-sm capitalize text-[var(--muted)]">
              {project.status.replaceAll(
                "_",
                " "
              )}
            </p>
          </div>

          {project.status ===
            "awaiting_requirements" && (
            <form
              action={
                requirementAction
              }
              className="rounded-2xl border border-[var(--border)] bg-white p-6"
            >
              <h2 className="font-semibold">
                Project requirements
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Tell us everything we need to know before we start.
              </p>

              <textarea
                name="requirements"
                required
                rows={8}
                placeholder="Describe what you need, features, references, links, preferences, and any important details..."
                className="mt-5 w-full resize-y rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
              />

              <button
                type="submit"
                className="mt-4 inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white"
              >
                Submit requirements
              </button>
            </form>
          )}

          {project.requirements && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="font-semibold">
                Requirements
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                {
                  project.requirements
                }
              </p>
            </div>
          )}

          <ProjectChat
            projectId={
              project.id
            }
            currentUserId={
              user.id
            }
            messages={
              messages
            }
            disabled={
              project.status ===
              "cancelled"
            }
          />

          {project.status ===
            "completed" && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="font-semibold">
                Delivery
              </h2>

              {project.delivery_note && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                  {
                    project.delivery_note
                  }
                </p>
              )}

              {project.delivery_url && (
                <a
                  href={
                    project.delivery_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
                >
                  Open delivery

                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-[var(--border)] bg-white p-5 lg:sticky lg:top-24">
          <p className="text-xs text-[var(--muted)]">
            Status
          </p>

          <p className="mt-1 font-medium capitalize">
            {project.status.replaceAll(
              "_",
              " "
            )}
          </p>

          <div className="my-5 border-t border-[var(--border-light)]" />

          <p className="text-xs text-[var(--muted)]">
            Invoice
          </p>

          <Link
            href={`/invoices/${project.invoice_id}`}
            className="mt-1 inline-block text-sm font-medium text-[var(--primary)]"
          >
            View invoice
          </Link>

          <div className="my-5 border-t border-[var(--border-light)]" />

          <p className="text-xs text-[var(--muted)]">
            Created
          </p>

          <p className="mt-1 text-sm">
            {new Date(
              project.created_at
            ).toLocaleDateString()}
          </p>
        </aside>
      </div>
    </div>
  );
}