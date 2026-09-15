import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  type UserProfile,
} from "@/lib/auth/profile";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile =
    (data ?? null) as UserProfile | null;

  const displayName = getDisplayName(
    user,
    profile
  );

  const avatarUrl = getAvatarUrl(
    user,
    profile
  );

  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="min-h-screen lg:pl-[270px]">
        <AdminTopbar
          name={displayName}
          email={user.email ?? ""}
          avatarUrl={avatarUrl}
          initials={initials}
        />

        <main>{children}</main>
      </div>
    </div>
  );
}