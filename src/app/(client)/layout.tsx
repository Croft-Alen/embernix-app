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

  const {
    data,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, created_at, updated_at"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  const profile =
    (
      data ??
      null
    ) as UserProfile | null;

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
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-6 pt-4 sm:px-6">
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
        />

        <div className="mt-5 lg:grid lg:grid-cols-[216px_minmax(0,1fr)] lg:items-start lg:gap-5">
          <div className="hidden lg:block">
            <ClientSidebar />
          </div>

          <main className="min-w-0">
            {
              children
            }
          </main>
        </div>
      </div>
    </div>
  );
}