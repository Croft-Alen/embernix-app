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
    redirect("/login");
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
      <div className="hidden lg:block">
        <ClientSidebar />
      </div>

      <div className="min-h-screen lg:pl-[260px]">
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

        <main className="p-4 sm:p-6 lg:p-8">
          {
            children
          }
        </main>
      </div>
    </div>
  );
}