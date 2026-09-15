import { redirect } from "next/navigation";

import {
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  type UserProfile,
} from "@/lib/auth/profile";

import { ProfileAvatarUploader } from "@/components/client/ProfileAvatarUploader";

import {
  updateAccountPassword,
  updateProfile,
} from "./actions";

type AccountPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AccountPage({
  searchParams,
}: AccountPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = (data ?? null) as UserProfile | null;

  const displayName = getDisplayName(
    user,
    profile
  );

  const avatarUrl = getAvatarUrl(
    user,
    profile
  );

  const initials = getInitials(displayName);

  const providers =
    user.identities?.map(
      (identity) => identity.provider
    ) ?? [];

  const uniqueProviders = [...new Set(providers)];

  const hasCustomAvatar = Boolean(
    profile?.avatar_url
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Account
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your profile, sign-in methods, and
          account security.
        </p>
      </div>

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      {params.message && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{params.message}</span>
        </div>
      )}

      {/* Profile */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold">
            Profile
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage your Embernix profile information.
          </p>
        </div>

        <div className="border-b border-[var(--border-light)] p-6">
          <ProfileAvatarUploader
            avatarUrl={avatarUrl}
            displayName={displayName}
            initials={initials}
            hasCustomAvatar={hasCustomAvatar}
          />
        </div>

        <form
          action={updateProfile}
          className="p-6"
        >
          <div className="max-w-xl space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium"
              >
                Full name
              </label>

              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  defaultValue={displayName}
                  maxLength={100}
                  required
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm transition-colors focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="accountEmail"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

                <input
                  id="accountEmail"
                  type="email"
                  value={user.email ?? ""}
                  disabled
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm text-[var(--muted)]"
                />
              </div>

              <p className="mt-2 text-xs text-[var(--muted)]">
                Email changes require secure email
                verification.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>

      {/* Sign-in methods */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Sign-in methods
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Identities currently connected to your
              Embernix account.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {uniqueProviders.length > 0 ? (
            uniqueProviders.map((provider) => (
              <span
                key={provider}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm capitalize"
              >
                {provider === "email"
                  ? "Email & password"
                  : provider}
              </span>
            ))
          ) : (
            <span className="text-sm text-[var(--muted)]">
              Email & password
            </span>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Password
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Set or change the password for your
                Embernix account.
              </p>
            </div>
          </div>
        </div>

        <form
          action={updateAccountPassword}
          className="p-6"
        >
          <div className="max-w-xl space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                New password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm transition-colors focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm transition-colors focus:border-[var(--primary)]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              Update password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}