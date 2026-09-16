import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  Check,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  type UserProfile,
} from "@/lib/auth/profile";

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
  const params =
    await searchParams;

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

  const identities =
    user.identities ??
    [];

  const providers =
    new Set(
      identities.map(
        (
          identity
        ) =>
          identity.provider
      )
    );

  const hasEmail =
    providers.has(
      "email"
    );

  const hasGoogle =
    providers.has(
      "google"
    );

  const hasDiscord =
    providers.has(
      "discord"
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Account
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your profile and account security.
        </p>
      </div>

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            params.error
          }
        </div>
      )}

      {params.message && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />

          <span>
            {
              params.message
            }
          </span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold">
            Profile
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Your Embernix account information.
          </p>
        </div>

        <div className="flex items-center gap-4 border-b border-[var(--border-light)] p-6">
          {avatarUrl ? (
            <img
              src={
                avatarUrl
              }
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-lg font-semibold text-[var(--primary)]">
              {
                initials
              }
            </div>
          )}

          <div>
            <p className="font-semibold">
              {
                displayName
              }
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {
                avatarUrl
                  ? "Profile photo from your connected account."
                  : "No provider profile photo available."
              }
            </p>
          </div>
        </div>

        <form
          action={
            updateProfile
          }
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
                  defaultValue={
                    displayName
                  }
                  maxLength={
                    100
                  }
                  required
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none"
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
                  value={
                    user.email ??
                    ""
                  }
                  disabled
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm text-[var(--muted)]"
                />
              </div>
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

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Sign-in methods
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Ways currently connected to your Embernix account.
              </p>
            </div>
          </div>
        </div>

        <div>
          <SignInMethod
            icon={
              <Mail className="h-5 w-5" />
            }
            title="Email & password"
            description={
              hasEmail
                ? user.email ??
                  ""
                : "No email password identity connected."
            }
            connected={
              hasEmail
            }
          />

          <SignInMethod
            image="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            title="Google"
            description={
              hasGoogle
                ? "Connected to your account."
                : "Not connected."
            }
            connected={
              hasGoogle
            }
          />

          <SignInMethod
            image="https://cdn.simpleicons.org/discord/5865F2"
            title="Discord"
            description={
              hasDiscord
                ? "Connected to your account."
                : "Not connected."
            }
            connected={
              hasDiscord
            }
            last
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-light)] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                {
                  hasEmail
                    ? "Change password"
                    : "Create a password"
                }
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {
                  hasEmail
                    ? "Set a new password for your Embernix account."
                    : "Add a password as another way to access your account."
                }
              </p>
            </div>
          </div>
        </div>

        <form
          action={
            updateAccountPassword
          }
          className="p-6"
        >
          <div className="max-w-xl space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                {
                  hasEmail
                    ? "New password"
                    : "Password"
                }
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={
                  8
                }
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none"
              />

              <p className="mt-2 text-xs text-[var(--muted)]">
                Minimum 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={
                  8
                }
                autoComplete="new-password"
                required
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              {
                hasEmail
                  ? "Update password"
                  : "Create password"
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SignInMethod({
  icon,
  image,
  title,
  description,
  connected,
  last = false,
}: {
  icon?: ReactNode;
  image?: string;
  title: string;
  description: string;
  connected: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-4 ${
        last
          ? ""
          : "border-b border-[var(--border-light)]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)]">
          {image ? (
            <img
              src={
                image
              }
              alt=""
              className="h-5 w-5"
            />
          ) : (
            icon
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium">
            {
              title
            }
          </p>

          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {
              description
            }
          </p>
        </div>
      </div>

      {connected ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--success)]">
          <Check className="h-4 w-4" />
          Connected
        </span>
      ) : (
        <span className="shrink-0 text-xs font-medium text-[var(--muted)]">
          Not connected
        </span>
      )}
    </div>
  );
}