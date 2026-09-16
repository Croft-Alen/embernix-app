"use client";

import Link from "next/link";

import {
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

type Notification = {
  id: string;

  type: string;

  category: string;

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

type Props = {
  notifications:
    Notification[];
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}

function getIcon(
  category: string
) {
  switch (
    category
  ) {
    case "ticket":
      return MessageCircle;

    case "billing":
      return ReceiptText;

    case "project":
      return FolderKanban;

    case "product":
      return Package;

    default:
      return CircleAlert;
  }
}

export default function NotificationsList({
  notifications:
    initialNotifications,
}: Props) {
  const [
    notifications,
    setNotifications,
  ] = useState(
    initialNotifications
  );

  const unread =
    notifications.filter(
      (
        item
      ) =>
        !item.read_at
    ).length;

  async function markRead(
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
            item
          ) =>
            item.id ===
            id
              ? {
                  ...item,

                  read_at:
                    item.read_at ??
                    now,
                }
              : item
        )
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
            id,
          }),
      }
    );
  }

  async function markAll() {
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

  if (
    notifications.length ===
    0
  ) {
    return (
      <section className="flex min-h-[330px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="text-center">
          <CircleAlert className="mx-auto h-6 w-6 text-[var(--muted-light)]" />

          <h2 className="mt-4 text-sm font-semibold">
            No notifications
          </h2>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Important account updates will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Recent notifications
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            {unread >
            0
              ? `${unread} unread`
              : "You're all caught up"}
          </p>
        </div>

        {unread >
          0 && (
          <button
            type="button"
            onClick={() =>
              void markAll()
            }
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)]"
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
            const Icon =
              getIcon(
                notification.category
              );

            const body = (
              <div
                className={`flex gap-4 px-5 py-5 sm:px-6 ${
                  !notification.read_at
                    ? "bg-[var(--primary-soft)]/25"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--primary)]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <h2 className="flex-1 text-sm font-semibold text-[var(--foreground)]">
                      {
                        notification.title
                      }
                    </h2>

                    {!notification.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    )}
                  </div>

                  <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
                    {
                      notification.message
                    }
                  </p>

                  <p className="mt-2 text-[11px] text-[var(--muted-light)]">
                    {formatDate(
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
                  onClick={() =>
                    void markRead(
                      notification.id
                    )
                  }
                  className="block"
                >
                  {
                    body
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
                  body
                }
              </button>
            );
          }
        )}
      </div>
    </section>
  );
}