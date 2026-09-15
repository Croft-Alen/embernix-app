"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  FileText,
  Headphones,
  LayoutDashboard,
  Package,
  ReceiptText,
  X,
} from "lucide-react";

type ClientSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Box,
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ReceiptText,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Support",
    href: "/tickets",
    icon: Headphones,
  },
];

export default function ClientSidebar({
  mobileOpen = false,
  onClose,
}: ClientSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col
          transition-transform duration-200 lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
        }}
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Link
            href="/dashboard"
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

            <div>
              <p className="text-[15px] font-semibold">
                Embernix
              </p>

              <p
                className="mt-0.5 text-[11px]"
                style={{
                  color: "rgba(255,255,255,0.48)",
                }}
              >
                Client Portal
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] lg:hidden"
            style={{
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <X size={19} />
          </button>
        </div>

        <div
          className="mx-5 h-px"
          style={{
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <nav className="flex-1 px-3 py-5">
          <p
            className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: "rgba(255,255,255,0.36)",
            }}
          >
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors"
                  style={
                    active
                      ? {
                          background: "rgba(255,255,255,0.10)",
                          color: "#ffffff",
                        }
                      : {
                          color: "rgba(255,255,255,0.62)",
                        }
                  }
                >
                  <Icon size={18} strokeWidth={2} />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div
          className="mx-5 h-px"
          style={{
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <div className="p-5">
          <p
            className="text-xs leading-5"
            style={{
              color: "rgba(255,255,255,0.38)",
            }}
          >
            © {new Date().getFullYear()} Embernix
          </p>
        </div>
      </aside>
    </>
  );
}