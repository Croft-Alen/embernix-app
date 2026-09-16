"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  BriefcaseBusiness,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ReceiptText,
  ShoppingBag,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type ClientSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

const baseNavigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Products",
    href: "/products",
    icon: Package,
  },

  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
  },

  {
    label: "Invoices",
    href: "/invoices",
    icon: ReceiptText,
  },

  {
    label: "Support",
    href: "/tickets",
    icon: LifeBuoy,
  },
];

export default function ClientSidebar({
  mobileOpen = false,
  onClose,
}: ClientSidebarProps) {
  const pathname =
    usePathname();

  const [
    hasProjects,
    setHasProjects,
  ] = useState(false);

  const [
    projectsLoaded,
    setProjectsLoaded,
  ] = useState(false);

  useEffect(() => {
    let cancelled =
      false;

    async function checkProjects() {
      try {
        const supabase =
          createClient();

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (cancelled) {
          return;
        }

        if (!user) {
          setHasProjects(
            false
          );

          setProjectsLoaded(
            true
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("projects")
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .limit(1);

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Failed checking client projects:",
            error
          );

          setHasProjects(
            false
          );

          setProjectsLoaded(
            true
          );

          return;
        }

        setHasProjects(
          Boolean(
            data &&
              data.length > 0
          )
        );

        setProjectsLoaded(
          true
        );
      } catch (error) {
        console.error(
          "Client project visibility check failed:",
          error
        );

        if (!cancelled) {
          setHasProjects(
            false
          );

          setProjectsLoaded(
            true
          );
        }
      }
    }

    void checkProjects();

    return () => {
      cancelled =
        true;
    };
  }, [
    pathname,
  ]);

  const navigation =
    useMemo(
      () => {
        const items =
          [
            ...baseNavigation,
          ];

        if (
          projectsLoaded &&
          hasProjects
        ) {
          items.splice(
            2,
            0,
            {
              label:
                "Projects",

              href:
                "/projects",

              icon:
                BriefcaseBusiness,
            }
          );
        }

        return items;
      },
      [
        hasProjects,
        projectsLoaded,
      ]
    );

  function isActive(
    href: string
  ) {
    if (
      href ===
      "/dashboard"
    ) {
      return (
        pathname ===
        "/dashboard"
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={
            onClose
          }
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`
          fixed bottom-4 left-4 top-4 z-50
          flex w-[248px] flex-col
          rounded-[22px]
          border border-[var(--border)]
          bg-[var(--surface)]
          p-3
          shadow-[0_12px_40px_rgba(15,23,42,0.08)]
          transition-transform duration-200
          lg:static lg:z-auto lg:h-[calc(100vh-108px)] lg:w-[216px]
          lg:translate-x-0 lg:shadow-none
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-[calc(100%+32px)]"
          }
        `}
      >
        <div className="flex items-center justify-between px-2 pb-3 lg:hidden">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Navigation
          </p>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1">
          <div className="space-y-1">
            {navigation.map(
              (
                item
              ) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.href
                  );

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={
                      onClose
                    }
                    className={`
                      flex h-11 items-center gap-3 rounded-xl px-3
                      text-sm font-medium transition-colors
                      ${
                        active
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                      }
                    `}
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={
                        2
                      }
                    />

                    <span>
                      {
                        item.label
                      }
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}