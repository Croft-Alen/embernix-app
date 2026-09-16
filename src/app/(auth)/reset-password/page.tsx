import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { updatePassword } from "../actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error } = await searchParams;

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
        style={{
          color: "var(--muted)",
        }}
      >
        <ArrowLeft size={16} />
        Back to sign in
      </Link>

      <div className="h-8" />

      <p
        className="text-sm font-semibold uppercase tracking-[0.18em]"
        style={{
          color: "var(--primary)",
        }}
      >
        New Password
      </p>

      <div className="h-4" />

      <h1 className="text-3xl font-semibold tracking-[-0.035em]">
        Choose a new password
      </h1>

      <div className="h-3" />

      <p
        className="text-sm leading-6"
        style={{
          color: "var(--muted)",
        }}
      >
        Enter and confirm your new password.
      </p>

      {error && (
        <>
          <div className="h-6" />

          <div
            className="rounded-[14px] border px-4 py-3 text-sm leading-6"
            style={{
              borderColor: "rgba(220,38,38,0.20)",
              background: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        </>
      )}

      <div className="h-8" />

      <form action={updatePassword} className="space-y-5">
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
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Enter your new password"
            className="h-12 w-full rounded-[14px] border px-4 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />

          <p
            className="mt-2 text-xs"
            style={{
              color: "var(--muted)",
            }}
          >
            Minimum 8 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium"
          >
            Confirm new password
          </label>

          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Confirm your new password"
            className="h-12 w-full rounded-[14px] border px-4 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{
            background: "var(--primary)",
            border: "1px solid var(--primary-hover)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(37,99,235,0.18)",
          }}
        >
          Update Password
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}