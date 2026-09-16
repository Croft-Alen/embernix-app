"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Search,
  ShoppingBag,
  UserRound,
  BriefcaseBusiness,
  LifeBuoy,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  SiDiscord,
} from "react-icons/si";

import {
  signOut,
} from "@/app/(client)/actions";

import ClientSidebar from "@/components/client/ClientSidebar";

type ClientTopbarProps = {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
};

const searchItems = [
  {
    label: "Overview",
    description:
      "Account overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords:
      "overview dashboard home",
  },

  {
    label: "Products",
    description:
      "Your purchased products",
    href: "/products",
    icon: Package,
    keywords:
      "products downloads licenses purchased",
  },

  {
    label: "Projects",
    description:
      "Your service projects",
    href: "/projects",
    icon: BriefcaseBusiness,
    keywords:
      "projects services work",
  },

  {
    label: "Orders",
    description:
      "View your orders",
    href: "/orders",
    icon: ShoppingBag,
    keywords:
      "orders purchases payments",
  },

  {
    label: "Invoices",
    description:
      "Billing and invoices",
    href: "/invoices",
    icon: ReceiptText,
    keywords:
      "invoice invoices billing payment",
  },

  {
    label: "Support",
    description:
      "Support tickets",
    href: "/tickets",
    icon: LifeBuoy,
    keywords:
      "support help tickets",
  },

  {
    label: "Account",
    description:
      "Profile and security",
    href: "/account",
    icon: UserRound,
    keywords:
      "account profile security password google discord",
  },
];

export function ClientTopbar({
  name,
  email,
  avatarUrl,
  initials,
}: ClientTopbarProps) {
  const router =
    useRouter();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const profileRef =
    useRef<HTMLDivElement>(
      null
    );

  const searchRef =
    useRef<HTMLDivElement>(
      null
    );

  const discordUrl =
    process.env
      .NEXT_PUBLIC_DISCORD_URL;

  const normalizedQuery =
    searchQuery
      .trim()
      .toLowerCase();

  const searchResults =
    normalizedQuery
      ? searchItems.filter(
          (
            item
          ) =>
            item.label
              .toLowerCase()
              .includes(
                normalizedQuery
              ) ||
            item.description
              .toLowerCase()
              .includes(
                normalizedQuery
              ) ||
            item.keywords.includes(
              normalizedQuery
            )
        )
      : [];

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        profileRef.current &&
        !profileRef.current.contains(
          target
        )
      ) {
        setProfileOpen(
          false
        );
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(
          target
        )
      ) {
        setSearchOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  function openSearchResult(
    href: string
  ) {
    setSearchQuery(
      ""
    );

    setSearchOpen(
      false
    );

    router.push(
      href
    );
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      searchResults.length ===
      0
    ) {
      return;
    }

    openSearchResult(
      searchResults[0].href
    );
  }

  return (
    <>
      <header className="sticky top-4 z-30">
        <div className="flex h-[68px] items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:px-4">
          {/* Mobile navigation */}
          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Embernix dashboard"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <Image
                src="/logo.webp"
                alt="Embernix"
                fill
                priority
                sizes="36px"
                className="object-cover"
              />
            </div>

            <span className="hidden text-[15px] font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:block">
              Embernix
            </span>
          </Link>

          {/* Search */}
          <div
            ref={
              searchRef
            }
            className="relative mx-auto hidden w-full max-w-[520px] md:block"
          >
            <form
              onSubmit={
                handleSearchSubmit
              }
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-light)]" />

              <input
                type="search"
                value={
                  searchQuery
                }
                onFocus={() =>
                  setSearchOpen(
                    true
                  )
                }
                onChange={(
                  event
                ) => {
                  setSearchQuery(
                    event.target
                      .value
                  );

                  setSearchOpen(
                    true
                  );
                }}
                placeholder="Search..."
                aria-label="Search Embernix"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:bg-white"
              />
            </form>

            {searchOpen &&
              normalizedQuery && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
                  {searchResults.length >
                  0 ? (
                    <div className="space-y-1">
                      {searchResults.map(
                        (
                          item
                        ) => {
                          const Icon =
                            item.icon;

                          return (
                            <button
                              key={
                                item.href
                              }
                              type="button"
                              onClick={() =>
                                openSearchResult(
                                  item.href
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)]">
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)]">
                                  {
                                    item.label
                                  }
                                </p>

                                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                                  {
                                    item.description
                                  }
                                </p>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                      No matching page.
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Mobile search */}
            <button
              type="button"
              aria-label="Search"
              onClick={() =>
                setSearchOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] md:hidden"
            >
              <Search className="h-[19px] w-[19px]" />
            </button>

            {/* Discord */}
            {discordUrl ? (
              <a
                href={
                  discordUrl
                }
                target="_blank"
                rel="noreferrer"
                aria-label="Join Embernix Discord"
                title="Discord"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <SiDiscord
                  size={
                    19
                  }
                />
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Embernix Discord"
                title="Discord"
                className="flex h-10 w-10 cursor-default items-center justify-center rounded-xl text-[var(--muted-light)]"
              >
                <SiDiscord
                  size={
                    19
                  }
                />
              </button>
            )}

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <Bell className="h-[19px] w-[19px]" />
            </button>

            {/* Account */}
            <div
              ref={
                profileRef
              }
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="flex h-11 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-[var(--surface-hover)]"
                aria-label="Open account menu"
                aria-expanded={
                  profileOpen
                }
              >
                {avatarUrl ? (
                  <img
                    src={
                      avatarUrl
                    }
                    alt={
                      name
                    }
                    className="h-9 w-9 rounded-full border border-[var(--border)] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
                    {
                      initials
                    }
                  </div>
                )}

                <ChevronDown
                  className={`hidden h-4 w-4 text-[var(--muted)] transition-transform sm:block ${
                    profileOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-[var(--border-light)] p-4">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={
                            avatarUrl
                          }
                          alt={
                            name
                          }
                          className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                          {
                            initials
                          }
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {
                            name
                          }
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {
                            email
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/account"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <UserRound className="h-4 w-4 text-[var(--muted)]" />

                      Account
                    </Link>

                    <form
                      action={
                        signOut
                      }
                    >
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />

                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search panel */}
        {searchOpen && (
          <div
            ref={
              searchRef
            }
            className="relative mt-2 md:hidden"
          >
            <form
              onSubmit={
                handleSearchSubmit
              }
              className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-light)]" />

                <input
                  type="search"
                  autoFocus
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search..."
                  aria-label="Search Embernix"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:bg-white"
                />
              </div>

              {normalizedQuery && (
                <div className="mt-2 space-y-1">
                  {searchResults.length >
                  0 ? (
                    searchResults.map(
                      (
                        item
                      ) => {
                        const Icon =
                          item.icon;

                        return (
                          <button
                            key={
                              item.href
                            }
                            type="button"
                            onClick={() =>
                              openSearchResult(
                                item.href
                              )
                            }
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--surface-hover)]"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                            <span className="text-sm font-medium">
                              {
                                item.label
                              }
                            </span>
                          </button>
                        );
                      }
                    )
                  ) : (
                    <div className="px-3 py-3 text-center text-sm text-[var(--muted)]">
                      No matching page.
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </header>

      <div className="lg:hidden">
        <ClientSidebar
          mobileOpen={
            sidebarOpen
          }
          onClose={() =>
            setSidebarOpen(
              false
            )
          }
        />
      </div>
    </>
  );
}

export default ClientTopbar;