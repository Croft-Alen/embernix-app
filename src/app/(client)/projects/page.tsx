import Link from "next/link";

import {
  ArrowRight,
  BriefcaseBusiness,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

export default async function ProjectsPage() {
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
      projects,
    error,
  } = await admin
    .from(
      "projects"
    )
    .select(`
      id,
      project_number,
      title,
      status,
      created_at,
      services (
        name
      )
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (
    error ||
    !projects ||
    projects.length ===
      0
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] sm:text-[27px]">
          Projects
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
          Track active and completed Embernix projects.
        </p>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="divide-y divide-[var(--border-light)]">
          {projects.map(
            (
              project
            ) => (
              <Link
                key={
                  project.id
                }
                href={`/projects/${project.id}`}
                className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 gap-4">
                  <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {
                          project.title
                        }
                      </h2>

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

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                      <span>
                        {
                          project.project_number
                        }
                      </span>

                      <span>
                        {formatDate(
                          project.created_at
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="hidden h-4 w-4 text-[var(--muted)] sm:block" />
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  );
}