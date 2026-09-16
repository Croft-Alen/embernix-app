import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  type UserProfile,
} from "@/lib/auth/profile";

import ClientSidebar from "@/components/client/ClientSidebar";

import {
  ClientTopbar,
} from "@/components/client/ClientTopbar";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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

  const [
    profileResult,
    adminResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, created_at, updated_at"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle(),

      supabase
        .from("admin_users")
        .select(
          "user_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle(),
    ]);

  const profile =
    (
      profileResult.data ??
      null
    ) as UserProfile | null;

  const isAdmin =
    Boolean(
      adminResult.data
    );

  const displayName =
    getDisplayName(
      user,
      profile
    );

  const avatarUrl =
    getAvatarUrl(
      user
    );

  const initials =
    getInitials(
      displayName
    );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto w-full max-w-[1540px] px-3 pb-6 pt-3 sm:px-5 sm:pb-8 sm:pt-4 lg:px-6">
        <ClientTopbar
          name={
            displayName
          }
          email={
            user.email ??
            ""
          }
          avatarUrl={
            avatarUrl
          }
          initials={
            initials
          }
          isAdmin={
            isAdmin
          }
        />

        <div className="mt-4 lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start lg:gap-5">
          <div
            className="
              hidden
              lg:sticky
              lg:top-[104px]
              lg:block
              lg:h-[calc(100dvh-120px)]
              lg:self-start
            "
          >
            <ClientSidebar />
          </div>

          <main className="min-w-0 pb-8">
            {
              children
            }
          </main>
        </div>
      </div>
    </div>
  );
}