import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        {/* Left */}
        <section
          className="relative hidden overflow-hidden lg:flex"
          style={{
            background: "var(--foreground)",
            color: "var(--background)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(
                  to right,
                  rgba(255,255,255,0.05) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  to bottom,
                  rgba(255,255,255,0.05) 1px,
                  transparent 1px
                )
              `,
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(circle at center, black 0%, rgba(0,0,0,0.85) 48%, rgba(0,0,0,0.3) 76%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, black 0%, rgba(0,0,0,0.85) 48%, rgba(0,0,0,0.3) 76%, transparent 100%)",
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-sm font-bold text-white"
                style={{
                  background: "var(--primary)",
                  border: "1px solid var(--primary-hover)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(37,99,235,0.2)",
                }}
              >
                E
              </div>

              <span className="text-lg font-semibold">
                Embernix
              </span>
            </Link>

            <div className="max-w-xl">
              <p
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: "var(--accent)",
                }}
              >
                Client Platform
              </p>

              <div className="h-5" />

              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">
                Everything you need to manage your Embernix account.
              </h1>

              <div className="h-6" />

              <p
                className="max-w-lg text-base leading-8"
                style={{
                  color: "rgba(255,255,255,0.68)",
                }}
              >
                Access your products, projects, orders, invoices, and support
                from one place.
              </p>
            </div>

            <p
              className="text-sm"
              style={{
                color: "rgba(255,255,255,0.45)",
              }}
            >
              © {new Date().getFullYear()} Embernix
            </p>
          </div>
        </section>

        {/* Right */}
        <section
          className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-10"
          style={{
            background: "var(--surface)",
          }}
        >
          <div className="w-full max-w-[420px]">
            <div className="mb-10 flex items-center justify-center lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] text-sm font-bold text-white"
                  style={{
                    background: "var(--primary)",
                  }}
                >
                  E
                </div>

                <span className="text-lg font-semibold">
                  Embernix
                </span>
              </Link>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}