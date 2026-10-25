"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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
      className={
        className
      }
      fill="currentColor"
    >
      <path d="M19.54 5.34A16.87 16.87 0 0 0 15.34 4l-.51 1.05a15.58 15.58 0 0 0-5.66 0L8.66 4a16.94 16.94 0 0 0-4.2 1.34C1.8 9.24 1.08 13.05 1.44 16.8a17.21 17.21 0 0 0 5.15 2.62l1.24-1.69a10.9 10.9 0 0 1-1.95-.93c.16-.12.32-.24.47-.37a12.1 12.1 0 0 0 11.3 0c.15.13.31.25.47.37-.62.37-1.28.68-1.96.93l1.24 1.69a17.17 17.17 0 0 0 5.15-2.62c.43-4.35-.74-8.13-3.01-11.46ZM8.47 14.55c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Zm7.06 0c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Z" />
    </svg>
  );
}

export function ClientTopbar({
  name,
  email,
  avatarUrl,
  initials,
  isAdmin,
  userId,
}: ClientTopbarProps) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const profileRef =
    useRef<HTMLDivElement>(
      null
    );

  const discordUrl =
    process.env
      .NEXT_PUBLIC_DISCORD_URL;

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

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
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