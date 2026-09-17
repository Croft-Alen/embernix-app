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
} from "lucide-react";

import {
  useState,
} from "react";

type NotificationCategory =
  | "ticket"
  | "billing"
  | "project"
  | "product"
  | "general";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
  category: NotificationCategory;
};

type NotificationsListProps = {
  notifications:
    NotificationItem[];
};

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function CategoryIcon({
  category,
}: {
  category:
    NotificationCategory;
}) {
  switch (
    category
  ) {
    case "ticket":
      return (
        <MessageCircle className="h-[18px] w-[18px]" />
      );

    case "billing":
      return (
        <ReceiptText className="h-[18px] w-[18px]" />
      );

    case "project":
      return (
        <FolderKanban className="h-[18px] w-[18px]" />
      );

    case "product":
      return (
        <Package className="h-[18px] w-[18px]" />
      );

    default:
      return (
        <CircleAlert className="h-[18px] w-[18px]" />
      );
  }
}

export default function NotificationsList({
  notifications:
    initialNotifications,
}: NotificationsListProps) {
  const [
    notifications,
    setNotifications,
  ] = useState(
    initialNotifications
  );

  const unreadCount =
    notifications.filter(
      (
        notification
      ) =>
        !notification.read_at
    ).length;

  async function markOneRead(
    id: string
  ) {
    const now =
      new Date().toISOString();

    setNotifications(
      (
        current
      ) =>
        current.map(
          (
            notification
          ) =>
            notification.id ===
            id &&
            !notification.read_at
              ? {
                  ...notification,
                  read_at:
                    now,
                }
              : notification
        )
    );

    try {
      const response =
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

      if (
        !response.ok
      ) {
        throw new Error(
          "Unable to mark notification as read."
        );
      }
    } catch (error) {
      console.error(
        "Failed marking notification read:",
        error
      );

      setNotifications(
        initialNotifications
      );
    }
  }

  async function markAllRead() {
    if (
      unreadCount ===
      0
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    setNotifications(
      (
        current
      ) =>
        current.map(
          (
            notification
          ) => ({
            ...notification,

            read_at:
              notification.read_at ??
              now,
          })
        )
    );

    try {
      const response =
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
                all: true,
              }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "Unable to mark notifications as read."
        );
      }
    } catch (error) {
      console.error(
        "Failed marking all notifications read:",
        error
      );

      setNotifications(
        initialNotifications
      );
    }
  }

  if (
    notifications.length ===
    0
  ) {
    return (
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
        <Bell className="mx-auto h-7 w-7 text-[var(--muted-light)]" />

        <h2 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
          No notifications
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Important updates will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            All notifications
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            {unreadCount} unread
          </p>
        </div>

        {unreadCount >
          0 && (
          <button
            type="button"
            onClick={
              markAllRead
            }
            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)]"
          >
            <CheckCheck className="h-4 w-4" />

            Mark all read
          </button>
        )}
      </div>

      <div className="divide-y divide-[var(--border-light)]">
        {notifications.map(
          (
            notification
          ) => {
            const content = (
              <>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    notification.read_at
                      ? "bg-[var(--surface-secondary)] text-[var(--muted)]"
                      : "bg-[var(--primary-soft)] text-[var(--primary)]"
                  }`}
                >
                  <CategoryIcon
                    category={
                      notification.category
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-sm text-[var(--foreground)] ${
                          notification.read_at
                            ? "font-medium"
                            : "font-semibold"
                        }`}
                      >
                        {
                          notification.title
                        }
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {
                          notification.message
                        }
                      </p>

                      <p className="mt-2 text-xs text-[var(--muted-light)]">
                        {formatDate(
                          notification.created_at
                        )}
                      </p>
                    </div>

                    {!notification.read_at && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                </div>
              </>
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
                  onClick={() =>
                    void markOneRead(
                      notification.id
                    )
                  }
                  className="flex gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-hover)] sm:px-6"
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
                  void markOneRead(
                    notification.id
                  )
                }
                className="flex w-full gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--surface-hover)] sm:px-6"
              >
                {
                  content
                }
              </button>
            );
          }
        )}
      </div>
    </section>
  );
}