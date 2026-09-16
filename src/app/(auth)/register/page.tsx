import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { register } from "../actions";
import {
  signInWithDiscord,
  signInWithGoogle,
} from "../oauth-actions";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <div>
      <p
        className="text-sm font-semibold uppercase tracking-[0.18em]"
        style={{
          color: "var(--primary)",
        }}
      >
        Create Account
      </p>

      <div className="h-4" />

      <h1 className="text-3xl font-semibold tracking-[-0.035em]">
        Join Embernix
      </h1>

      <div className="h-3" />

      <p
        className="text-sm leading-6"
        style={{
          color: "var(--muted)",
        }}
      >
        Create your account to manage purchases, projects, invoices, and
        support.
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

      <form action={register} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium"
          >
            Full name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your full name"
            className="h-12 w-full rounded-[14px] border px-4 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>

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
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Create a password"
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
            Confirm password
          </label>

          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Confirm your password"
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
          Create Account
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div
          className="h-px flex-1"
          style={{
            background: "var(--border)",
          }}
        />

        <span
          className="text-xs uppercase tracking-[0.14em]"
          style={{
            color: "var(--muted)",
          }}
        >
          Or continue with
        </span>

        <div
          className="h-px flex-1"
          style={{
            background: "var(--border)",
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[14px] border text-sm font-medium transition-opacity hover:opacity-75"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            <img
              src="/auth/google.svg"
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
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[14px] border text-sm font-medium transition-opacity hover:opacity-75"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            <img
              src="/auth/discord.svg"
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0"
            />

            Discord
          </button>
        </form>
      </div>

      <div className="h-8" />

      <p
        className="text-center text-sm"
        style={{
          color: "var(--muted)",
        }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold transition-opacity hover:opacity-70"
          style={{
            color: "var(--primary)",
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}