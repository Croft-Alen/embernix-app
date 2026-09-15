"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Boxes,
  FileText,
  FolderKanban,
  Gauge,
  Headphones,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  X,
} from "lucide-react";

type AdminSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: Gauge,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Services",
    href: "/admin/services",
    icon: Wrench,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
  {
    label: "Invoices",
    href: "/admin/invoices",
    icon: ReceiptText,
  },
  {
    label: "Tickets",
    href: "/admin/tickets",
    icon: Headphones,
  },
  {
    label: "Content",
    href: "/admin/content",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar({
  mobileOpen = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
        }}
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
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
                Admin Panel
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
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

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: "rgba(255,255,255,0.36)",
            }}
          >
            Management
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors"
                  style={
                    active
                      ? {
                          background:
                            "rgba(255,255,255,0.10)",
                          color: "#ffffff",
                        }
                      : {
                          color:
                            "rgba(255,255,255,0.62)",
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
          <div
            className="flex items-center gap-2 text-xs"
            style={{
              color: "rgba(255,255,255,0.38)",
            }}
          >
            <Boxes className="h-4 w-4" />
            Embernix Control Center
          </div>
        </div>
      </aside>
    </>
  );
}