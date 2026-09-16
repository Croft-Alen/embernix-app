"use client";

import Image from "next/image";
import Link from "next/link";

import {
  BriefcaseBusiness,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Search,
  ShoppingBag,
  ShieldCheck,
  Ticket,
  UserRound,
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
  signOut,
} from "@/app/(client)/actions";

import ClientSidebar from "@/components/client/ClientSidebar";

import NotificationBell from "@/components/notifications/NotificationBell";

type ClientTopbarProps = {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  isAdmin: boolean;
  userId: string;
};

function DiscordIcon({
  className = "h-[19px] w-[19px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M19.54 5.34A16.87 16.87 0 0 0 15.34 4l-.51 1.05a15.58 15.58 0 0 0-5.66 0L8.66 4a16.94 16.94 0 0 0-4.2 1.34C1.8 9.24 1.08 13.05 1.44 16.8a17.21 17.21 0 0 0 5.15 2.62l1.24-1.69a10.9 10.9 0 0 1-1.95-.93c.16-.12.32-.24.47-.37a12.1 12.1 0 0 0 11.3 0c.15.13.31.25.47.37-.62.37-1.28.68-1.96.93l1.24 1.69a17.17 17.17 0 0 0 5.15-2.62c.43-4.35-.74-8.13-3.01-11.46ZM8.47 14.55c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Zm7.06 0c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Z" />
    </svg>
  );
}

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
    label: "Tickets",
    description:
      "Your tickets",
    href: "/tickets",
    icon: Ticket,
    keywords:
      "tickets help requests support",
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
  isAdmin,
  userId,
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

  const desktopSearchRef =
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
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(
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
      <header className="sticky top-3 z-30 sm:top-4">
        <div className="flex h-[66px] items-center gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:gap-3 sm:px-4">
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

          <div
            ref={
              desktopSearchRef
            }
            className="relative mx-auto hidden w-full max-w-[540px] md:block"
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
                    event.target.value
                  );

                  setSearchOpen(
                    true
                  );
                }}
                placeholder="Search Embernix..."
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

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
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

            {discordUrl ? (
              <a
                href={
                  discordUrl
                }
                target="_blank"
                rel="noreferrer"
                aria-label="Join Embernix Discord"
                title="Discord"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] sm:flex"
              >
                <DiscordIcon />
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Embernix Discord"
                title="Discord"
                className="hidden h-10 w-10 cursor-default items-center justify-center rounded-xl text-[var(--muted-light)] sm:flex"
              >
                <DiscordIcon />
              </button>
            )}

            <NotificationBell
              userId={
                userId
              }
            />

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
                className="flex h-11 items-center gap-1.5 rounded-xl px-1 transition-colors hover:bg-[var(--surface-hover)] sm:px-1.5"
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
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[290px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
                  <div className="p-4">
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

                  <div className="border-t border-[var(--border-light)] p-2">
                    <DropdownLink
                      href="/account"
                      icon={
                        UserRound
                      }
                      label="Account"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                    />

                    <DropdownLink
                      href="/products"
                      icon={
                        Package
                      }
                      label="Products"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                    />

                    <DropdownLink
                      href="/invoices"
                      icon={
                        ReceiptText
                      }
                      label="Invoices"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                    />

                    <DropdownLink
                      href="/tickets"
                      icon={
                        Ticket
                      }
                      label="Tickets"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                    />

                    {isAdmin && (
                      <>
                        <div className="my-2 h-px bg-[var(--border-light)]" />

                        <DropdownLink
                          href="/admin"
                          icon={
                            ShieldCheck
                          }
                          label="Admin"
                          onClick={() =>
                            setProfileOpen(
                              false
                            )
                          }
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-light)] p-2">
                    <form
                      action={
                        signOut
                      }
                    >
                      <button
                        type="submit"
                        className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-[17px] w-[17px]" />

                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="relative mt-2 md:hidden">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
              <form
                onSubmit={
                  handleSearchSubmit
                }
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
                    placeholder="Search Embernix..."
                    aria-label="Search Embernix"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:bg-white"
                  />
                </div>
              </form>

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
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                            <span className="text-sm font-medium text-[var(--foreground)]">
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
            </div>
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

function DropdownLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={
        href
      }
      onClick={
        onClick
      }
      className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
    >
      <Icon className="h-[17px] w-[17px] shrink-0 text-[var(--muted)]" />

      <span>
        {
          label
        }
      </span>
    </Link>
  );
}

export default ClientTopbar;