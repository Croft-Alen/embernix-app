"use client";

import Link from "next/link";

import {
  Bell,
  CheckCheck,
  CircleAlert,
  FolderKanban,
  MessageCircle,
  Package,
  ReceiptText,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type Notification = {
  id: string;

  type: string;

  title: string;

  message: string;

  href:
    | string
    | null;

  read_at:
    | string
    | null;

  created_at: string;
};

type NotificationBellProps = {
  userId: string;
};

function timeAgo(
  value: string
) {
  const date =
    new Date(
      value
    );

  const seconds =
    Math.floor(
      (
        Date.now() -
        date.getTime()
      ) /
        1000
    );

  if (
    seconds <
    60
  ) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds /
        60
    );

  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes /
        60
    );

  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    days <
    7
  ) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day:
        "numeric",

      month:
        "short",
    }
  ).format(
    date
  );
}

function getIcon(
  type: string
) {
  switch (
    type
  ) {
    case "ticket_reply":
    case "ticket_resolved":
    case "ticket_closed":
      return MessageCircle;

    case "payment_failed":
      return ReceiptText;

    case "project_in_progress":
    case "project_completed":
    case "project_cancelled":
      return FolderKanban;

    case "product_update":
      return Package;

    default:
      return CircleAlert;
  }
}

export default function NotificationBell({
  userId,
}: NotificationBellProps) {
  const [
    open,
    setOpen,
  ] = useState(
    false
  );

  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(
    0
  );

  const containerRef =
    useRef<HTMLDivElement>(
      null
    );

  const loadNotifications =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/notifications",
              {
                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const result =
            await response.json();

          setNotifications(
            result.notifications ??
              []
          );

          setUnreadCount(
            result.unreadCount ??
              0
          );
        } catch {
          // Quiet failure in topbar.
        }
      },
      []
    );

  useEffect(() => {
    void loadNotifications();
  }, [
    loadNotifications,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `notifications:${userId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "notifications",

            filter:
              `user_id=eq.${userId}`,
          },
          (
            payload
          ) => {
            const next =
              payload.new as Notification;

            setNotifications(
              (
                current
              ) => [
                next,
                ...current.filter(
                  (
                    item
                  ) =>
                    item.id !==
                    next.id
                ),
              ].slice(
                0,
                20
              )
            );

            if (
              !next.read_at
            ) {
              setUnreadCount(
                (
                  current
                ) =>
                  current +
                  1
              );
            }
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    userId,
  ]);

  useEffect(() => {
    function handleClick(
      event:
        MouseEvent
    ) {
      if (
        !containerRef.current
      ) {
        return;
      }

      if (
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );
    };
  }, []);

  async function markRead(
    id: string
  ) {
    setNotifications(
      (
        current
      ) =>
        current.map(
          (
            item
          ) =>
            item.id ===
              id &&
            !item.read_at
              ? {
                  ...item,

                  read_at:
                    new Date().toISOString(),
                }
              : item
        )
    );

    const target =
      notifications.find(
        (
          item
        ) =>
          item.id ===
          id
      );

    if (
      target &&
      !target.read_at
    ) {
      setUnreadCount(
        (
          current
        ) =>
          Math.max(
            0,
            current -
              1
          )
      );
    }

    await fetch(
      "/api/notifications",
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            id,
          }),
      }
    );
  }

  async function markAllRead() {
    const now =
      new Date().toISOString();

    setNotifications(
      (
        current
      ) =>
        current.map(
          (
            item
          ) => ({
            ...item,

            read_at:
              item.read_at ??
              now,
          })
        )
    );

    setUnreadCount(
      0
    );

    await fetch(
      "/api/notifications",
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            all:
              true,
          }),
      }
    );
  }

  return (
    <div
      ref={
        containerRef
      }
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (
              current
            ) =>
              !current
          )
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
        aria-label="Notifications"
      >
        <Bell className="h-[19px] w-[19px]" />

        {unreadCount >
          0 && (
          <span className="absolute right-1.5 top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount >
            99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[20px] border border-[var(--border)] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Notifications
              </h3>

              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {unreadCount >
                0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    void markAllRead()
                  }
                  title="Mark all as read"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {notifications.length ===
          0 ? (
            <div className="px-5 py-12 text-center">
              <Bell className="mx-auto h-6 w-6 text-[var(--muted-light)]" />

              <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                No notifications
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Important Embernix updates will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[430px] overflow-y-auto">
              {notifications
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    notification
                  ) => {
                    const Icon =
                      getIcon(
                        notification.type
                      );

                    const content = (
                      <div
                        className={`flex gap-3 border-b border-[var(--border-light)] px-4 py-4 ${
                          !notification.read_at
                            ? "bg-[var(--primary-soft)]/35"
                            : "bg-white"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--primary)]">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground)]">
                              {
                                notification.title
                              }
                            </p>

                            {!notification.read_at && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                            {
                              notification.message
                            }
                          </p>

                          <p className="mt-1.5 text-[10px] text-[var(--muted-light)]">
                            {timeAgo(
                              notification.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    );

                    if (
                      notification.href
                    ) {
                      return (
                        <Link
                          key={
                            notification.id
                          }
                          href={
                            notification.href
                          }
                          onClick={() => {
                            void markRead(
                              notification.id
                            );

                            setOpen(
                              false
                            );
                          }}
                          className="block"
                        >
                          {
                            content
                          }
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={
                          notification.id
                        }
                        type="button"
                        onClick={() =>
                          void markRead(
                            notification.id
                          )
                        }
                        className="block w-full text-left"
                      >
                        {
                          content
                        }
                      </button>
                    );
                  }
                )}
            </div>
          )}

          <Link
            href="/notifications"
            onClick={() =>
              setOpen(
                false
              )
            }
            className="flex h-11 items-center justify-center border-t border-[var(--border-light)] text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-hover)]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}