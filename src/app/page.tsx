import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] text-xl font-bold text-white"
          style={{
            background: "var(--primary)",
            border: "1px solid var(--primary-hover)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 24px rgba(37,99,235,0.18)",
          }}
        >
          E
        </div>

        <div className="h-7" />

        <h1 className="text-3xl font-semibold tracking-[-0.035em]">
          Embernix
        </h1>

        <div className="h-3" />

        <p
          className="text-sm leading-6"
          style={{
            color: "var(--muted)",
          }}
        >
          Client platform for products, projects, orders, invoices, and
          support.
        </p>

        <div className="h-8" />

        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{
            background: "var(--primary)",
            border: "1px solid var(--primary-hover)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 12px rgba(37,99,235,0.18)",
          }}
        >
          Continue
          <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}