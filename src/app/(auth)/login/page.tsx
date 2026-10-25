import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { login } from "../actions";

import {
  signInWithDiscord,
  signInWithGoogle,
} from "../oauth-actions";

import {
  redirectAuthenticatedUser,
} from "@/lib/auth/redirect-authenticated";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  await redirectAuthenticatedUser();

  const { error, message } = await searchParams;

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
          Sign in to your account
        </h1>

        <div className="h-3" />

        <p
          className="text-sm leading-6"
          style={{
            color: "var(--muted)",
          }}
        >
          Enter your details to continue.
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
        action={login}
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium"
            >
              Password
            </label>

            <Link
              href="/forgot-password"
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
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
          Sign In

          <ArrowRight size={16} />
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div
          className="h-px flex-1"
          style={{
            background:
              "var(--border)",
          }}
        />

        <span
          className="whitespace-nowrap text-xs uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--muted)",
          }}
        >
          Or continue with
        </span>

        <div
          className="h-px flex-1"
          style={{
            background:
              "var(--border)",
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-[14px] border text-sm font-medium transition-opacity hover:opacity-75"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--background)",
              color:
                "var(--foreground)",
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0"
            />

            Google
          </button>
        </form>

        <form action={signInWithDiscord}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-[14px] border text-sm font-medium transition-opacity hover:opacity-75"
            style={{
              borderColor:
                "var(--border)",
              background:
                "var(--background)",
              color:
                "var(--foreground)",
            }}
          >
            <img
              src="https://cdn.simpleicons.org/discord/5865F2"
              alt=""
              width={21}
              height={21}
              className="h-[21px] w-[21px] shrink-0"
            />

            Discord
          </button>
        </form>
      </div>

      <div className="h-8" />

      <p
        className="text-center text-sm"
        style={{
          color:
            "var(--muted)",
        }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold transition-opacity hover:opacity-70"
          style={{
            color:
              "var(--primary)",
          }}
        >
          Create account
        </Link>
      </p>
    </div>
  );
}