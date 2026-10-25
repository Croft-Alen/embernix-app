import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import {
  forgotPassword,
} from "../actions";

import {
  redirectAuthenticatedUser,
} from "@/lib/auth/redirect-authenticated";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  await redirectAuthenticatedUser();

  const {
    error,
    message,
  } =
    await searchParams;

  return (
    <div>
      <div className="flex justify-center">
        <img
          src="/logo.webp"
          alt="Embernix"
          width={52}
          height={52}
          className="h-[52px] w-[52px] rounded-[14px] object-cover"
        />
      </div>

      <div className="h-6" />

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.035em]">
          Reset your password
        </h1>

        <div className="h-3" />

        <p
          className="text-sm leading-6"
          style={{
            color:
              "var(--muted)",
          }}
        >
          Enter your email and we&apos;ll send you a password reset link.
        </p>
      </div>

      {(error || message) && (
        <div className="h-6" />
      )}

      {error && (
        <div
          className="rounded-[14px] border px-4 py-3 text-sm leading-6"
          style={{
            borderColor:
              "rgba(220,38,38,0.20)",
            background:
              "var(--danger-soft)",
            color:
              "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="rounded-[14px] border px-4 py-3 text-sm leading-6"
          style={{
            borderColor:
              "rgba(22,163,74,0.20)",
            background:
              "var(--success-soft)",
            color:
              "var(--success)",
          }}
        >
          {message}
        </div>
      )}

      <div className="h-8" />

      <form
        action={forgotPassword}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-12 w-full rounded-[14px] border px-4 text-sm"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--background)",
              color:
                "var(--foreground)",
            }}
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{
            background:
              "var(--primary)",
            border:
              "1px solid var(--primary-hover)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(37,99,235,0.18)",
          }}
        >
          Send Reset Link

          <ArrowRight size={16} />
        </button>
      </form>

      <div className="h-7" />

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{
            color:
              "var(--muted)",
          }}
        >
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}