import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  sendAdminProjectMessage,
  updateProject,
} from "../actions";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminProjectPage({
  params,
}: PageProps) {
  const {
    id,
  } =
    await params;

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
      admin_notes,
      invoice_id,
      order_id,
      created_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    error ||
    !project
  ) {
    notFound();
  }

  const {
    data: messages,
  } = await admin
    .from(
      "project_messages"
    )
    .select(`
      id,
      sender_type,
      message,
      created_at,
      project_message_attachments (
        id,
        file_name,
        storage_path
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

  const updateAction =
    updateProject.bind(
      null,
      project.id
    );

  const messageAction =
    sendAdminProjectMessage.bind(
      null,
      project.id
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />

        Projects
      </Link>

      <div>
        <p className="text-xs text-[var(--muted)]">
          {
            project.project_number
          }
        </p>

        <h1 className="mt-1 text-2xl font-semibold">
          {
            project.title
          }
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">
              Requirements
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
              {project.requirements ||
                "Customer has not submitted requirements yet."}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white">
            <div className="border-b border-[var(--border-light)] p-5">
              <h2 className="font-semibold">
                Chat
              </h2>
            </div>

            <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
              {!messages?.length ? (
                <p className="py-10 text-center text-sm text-[var(--muted)]">
                  No messages yet.
                </p>
              ) : (
                messages.map(
                  (
                    message
                  ) => (
                    <div
                      key={
                        message.id
                      }
                      className={`flex ${
                        message.sender_type ===
                        "admin"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div className="max-w-[80%] rounded-2xl bg-[var(--surface-secondary)] px-4 py-3 text-sm">
                        {message.message && (
                          <p className="whitespace-pre-wrap">
                            {
                              message.message
                            }
                          </p>
                        )}

                        <p className="mt-2 text-[10px] text-[var(--muted)]">
                          {message.sender_type ===
                          "admin"
                            ? "Embernix"
                            : "Customer"}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <form
              action={
                messageAction
              }
              className="border-t border-[var(--border-light)] p-4"
            >
              <textarea
                name="message"
                rows={3}
                placeholder="Write a message..."
                className="w-full resize-none rounded-xl border border-[var(--border)] px-3 py-3 text-sm"
              />

              <input
                type="file"
                name="files"
                multiple
                className="mt-3 block text-sm"
              />

              <button
                type="submit"
                className="mt-3 h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
              >
                Send
              </button>
            </form>
          </div>
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
            className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm"
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
            Delivery note
          </label>

          <textarea
            name="deliveryNote"
            rows={5}
            defaultValue={
              project.delivery_note ??
              ""
            }
            className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-sm"
          />

          <label className="mt-5 block text-sm font-medium">
            Delivery URL
          </label>

          <input
            type="url"
            name="deliveryUrl"
            defaultValue={
              project.delivery_url ??
              ""
            }
            className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm"
          />

          <label className="mt-5 block text-sm font-medium">
            Internal notes
          </label>

          <textarea
            name="adminNotes"
            rows={5}
            defaultValue={
              project.admin_notes ??
              ""
            }
            className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-sm"
          />

          <button
            type="submit"
            className="mt-5 h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-semibold text-white"
          >
            Save project
          </button>
        </form>
      </div>
    </div>
  );
}