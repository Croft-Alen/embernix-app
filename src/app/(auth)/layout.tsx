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
      <div
        className="w-full max-w-[520px] rounded-[24px] border p-6 sm:p-8"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow:
            "0 18px 50px rgba(11,18,32,0.06)",
        }}
      >
        {children}
      </div>
    </main>
  );
}