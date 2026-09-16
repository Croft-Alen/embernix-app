import Link from "next/link";

import {
  ArrowRight,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export default async function AdminProjectsPage() {
  const admin =
    createAdminClient();

  const {
    data: projects,
  } = await admin
    .from("projects")
    .select(`
      id,
      project_number,
      title,
      status,
      created_at,
      user_id,
      services (
        name
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Projects
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage paid customer service projects.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        {!projects?.length ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            No projects yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {projects.map(
              (
                project
              ) => (
                <Link
                  key={
                    project.id
                  }
                  href={`/admin/projects/${project.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {
                        project.title
                      }
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {
                        project.project_number
                      }{" "}
                      Â·{" "}
                      {project.status.replaceAll(
                        "_",
                        " "
                      )}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}