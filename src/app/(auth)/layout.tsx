import Link from "next/link";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background: "var(--background)",
      }}
    >
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
          >
            <img
              src="/logo.webp"
              alt="Embernix"
              width={42}
              height={42}
              className="h-[42px] w-[42px] rounded-[11px] object-cover"
            />

            <span className="text-xl font-semibold tracking-[-0.025em]">
              Embernix
            </span>
          </Link>
        </div>

        <div
          className="rounded-[24px] border p-6 sm:p-8"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "0 18px 50px rgba(11,18,32,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}