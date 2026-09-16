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
  switch (status) {
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
    redirect("/login");
  }

  const admin =
    createAdminClient();

  const {
    data: projects,
    error,
  } = await admin
    .from("projects")
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
        ascending: false,
      }
    );

  /*
   * User has never purchased
   * and paid for a service.
   *
   * Hide the whole project system.
   */
  if (
    error ||
    !projects ||
    projects.length === 0
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Projects
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your active and completed Embernix projects.
        </p>
      </div>

      <div className="space-y-3">
        {projects.map(
          (
            project
          ) => (
            <Link
              key={
                project.id
              }
              href={`/projects/${project.id}`}
              className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 transition-colors hover:border-[var(--primary)]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {
                      project.title
                    }
                  </p>

                  <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs text-[var(--muted)]">
                    {statusLabel(
                      project.status
                    )}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {
                    project.project_number
                  }
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
            </Link>
          )
        )}
      </div>
    </div>
  );
}