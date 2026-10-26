
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Store,
  Package,
  ReceiptText,
  Ticket,
  X,
} from "lucide-react";

type ClientSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Store,
  },
  {
    label: "My Products",
    href: "/products",
    icon: Package,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: ReceiptText,
  },
  {
    label: "Support Tickets",
    href: "/tickets",
    icon: Ticket,
  },
];

export default function ClientSidebar({
  mobileOpen = false,
  onClose,
}: ClientSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`
          fixed bottom-4 left-4 top-4 z-50
          flex w-[268px] flex-col
          rounded-[22px]
          border border-[var(--border)]
          bg-[var(--surface)]
          p-3
          shadow-[0_16px_45px_rgba(15,23,42,0.10)]
          transition-transform duration-200
          lg:static
          lg:h-full
          lg:w-full
          lg:translate-x-0
          lg:shadow-none
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-[calc(100%+32px)]"
          }
        `}
      >
        <div className="flex items-center justify-between px-2 pb-3 lg:hidden">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Menu
          </p>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className="flex-1"
          aria-label="Customer navigation"
        >
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`
                    flex h-11 items-center gap-3
                    rounded-xl px-3.5
                    text-sm font-medium
                    transition-colors
                    ${
                      active
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    }
                  `}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={2}
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
