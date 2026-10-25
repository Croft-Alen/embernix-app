"use client";

import {
  Download,
  File,
  FileArchive,
  FileText,
  ImageIcon,
  Plus,
} from "lucide-react";

import {
  useCallback,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

import TicketComposer from "@/components/tickets/TicketComposer";

import {
  useTicketRealtime,
} from "@/components/tickets/useTicketRealtime";

type Attachment = {
  id: string;

  file_name: string;

  file_type:
    | string
    | null;

  file_size:
    | number
    | null;
};

type Reaction = {
  id: string;

  user_id: string;

  emoji: string;
};

export type TicketMessage = {
  id: string;

  user_id:
    | string
    | null;

  message: string;

  is_admin: boolean;

  created_at: string;

  attachments:
    Attachment[];

  reactions:
    Reaction[];

  optimistic?: boolean;
};

type TicketConversationProps = {
  ticketId: string;

  currentUserId: string;

  customerName: string;

  messages:
    TicketMessage[];

  closed: boolean;

  status: string;

  adminView?: boolean;
};

function formatDate(
  value: string
) {
  const date =
    new Date(
      value
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

function formatFileSize(
  value:
    | number
    | null
) {
  const bytes =
    Number(
      value ??
        0
    );

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1
  )} MB`;
}

function isImage(
  type:
    | string
    | null
) {
  return Boolean(
    type?.startsWith(
      "image/"
    )
  );
}

function getFileIcon(
  type:
    | string
    | null
) {
  if (
    type?.startsWith(
      "image/"
    )
  ) {
    return ImageIcon;
  }

  if (
    type?.includes(
      "zip"
    )
  ) {
    return FileArchive;
  }

  if (
    type?.includes(
      "pdf"
    ) ||
    type?.includes(
      "word"
    ) ||
    type?.includes(
      "text"
    )
  ) {
    return FileText;
  }

  return File;
}

const reactionOptions = [
  "👍",
  "❤️",
  "😂",
  "🎉",
  "😮",
  "👀",
  "🙏",
  "🔥",
];

export default function TicketConversation({
  ticketId,
  currentUserId,
  customerName,
  messages:
    initialMessages,
  closed,
  status:
    initialStatus,
  adminView = false,
}: TicketConversationProps) {
  const [
    messages,
    setMessages,
  ] = useState<
    TicketMessage[]
  >(
    initialMessages
  );

  const [
    reactionOpen,
    setReactionOpen,
  ] = useState<
    string | null
  >(
    null
  );

  const syncMessages =
    useCallback(
      async () => {
        const supabase =
          createClient();

        const {
          data,
          error,
        } = await supabase
          .from(
            "ticket_replies"
          )
          .select(`
            id,
            user_id,
            message,
            is_admin,
            created_at,

            ticket_attachments (
              id,
              file_name,
              file_type,
              file_size
            ),

            ticket_reactions (
              id,
              user_id,
              emoji
            )
          `)
          .eq(
            "ticket_id",
            ticketId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );

        if (
          error
        ) {
          console.error(
            "Failed to sync ticket conversation:",
            error
          );

          return;
        }

        const next:
          TicketMessage[] =
          (
            data ??
            []
          ).map(
            (
              reply
            ) => ({
              id:
                reply.id,

              user_id:
                reply.user_id,

              message:
                reply.message,

              is_admin:
                reply.is_admin,

              created_at:
                reply.created_at,

              attachments:
                reply.ticket_attachments ??
                [],

              reactions:
                reply.ticket_reactions ??
                [],
            })
          );

        setMessages(
          next
        );
      },
      [
        ticketId,
      ]
    );

  const {
    status,
    otherTyping,
    broadcastTyping,
  } =
    useTicketRealtime({
      ticketId,

      currentUserId,

      initialStatus,

      onConversationChange:
        syncMessages,
    });

  const isClosed =
    closed ||
    status ===
      "closed";

  async function sendMessage(
    message: string,
    files: File[]
  ) {
    const temporaryId =
      `temp-${Date.now()}-${Math.random()}`;

    const optimistic:
      TicketMessage = {
      id:
        temporaryId,

      user_id:
        currentUserId,

      message,

      is_admin:
        adminView,

      created_at:
        new Date().toISOString(),

      attachments:
        [],

      reactions:
        [],

      optimistic:
        true,
    };

    setMessages(
      (
        current
      ) => [
        ...current,
        optimistic,
      ]
    );

    const formData =
      new FormData();

    formData.set(
      "message",
      message
    );

    for (
      const file
      of files
    ) {
      formData.append(
        "files",
        file
      );
    }

    try {
      const response =
        await fetch(
          `/api/tickets/${ticketId}/messages`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
            "Unable to send message."
        );
      }

      await syncMessages();
    } catch (
      error
    ) {
      setMessages(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              temporaryId
          )
      );

      throw error;
    }
  }

  async function toggleReaction(
    replyId: string,
    emoji: string
  ) {
    if (
      replyId.startsWith(
        "temp-"
      )
    ) {
      return;
    }

    setReactionOpen(
      null
    );

    const response =
      await fetch(
        `/api/tickets/${ticketId}/reactions`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              replyId,
              emoji,
            }),
        }
      );

    if (
      response.ok
    ) {
      await syncMessages();
    }
  }

  return (
    <section className="min-w-0 overflow-visible rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Conversation
        </h2>

        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
          {otherTyping ? (
            <>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              </span>

              <span>
                {adminView
                  ? `${customerName} is typing...`
                  : "Embernix is typing..."}
              </span>
            </>
          ) : (
            <span>
              Messages, files and reactions.
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6 px-3 py-5 sm:px-6 sm:py-6">
        {messages.map(
          (
            item
          ) => {
            const mine =
              adminView
                ? item.is_admin
                : !item.is_admin;

            const grouped =
              new Map<
                string,
                {
                  count: number;
                  mine: boolean;
                }
              >();

            for (
              const reaction
              of item.reactions
            ) {
              const current =
                grouped.get(
                  reaction.emoji
                ) ?? {
                  count: 0,
                  mine: false,
                };

              current.count +=
                1;

              if (
                reaction.user_id ===
                currentUserId
              ) {
                current.mine =
                  true;
              }

              grouped.set(
                reaction.emoji,
                current
              );
            }

            return (
              <div
                key={
                  item.id
                }
                className={`flex ${
                  mine
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div className="relative max-w-[94%] sm:max-w-[78%]">
                  <div
                    className={`rounded-[18px] px-4 py-3.5 ${
                      mine
                        ? "bg-[var(--primary)] text-white"
                        : "border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]"
                    } ${
                      item.optimistic
                        ? "opacity-65"
                        : ""
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
                      <p
                        className={`text-xs font-semibold ${
                          mine
                            ? "text-white"
                            : "text-[var(--foreground)]"
                        }`}
                      >
                        {item.is_admin
                          ? "Embernix"
                          : customerName}
                      </p>

                      <p
                        className={`text-[10px] ${
                          mine
                            ? "text-white/70"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {item.optimistic
                          ? "Sending..."
                          : formatDate(
                              item.created_at
                            )}
                      </p>
                    </div>

                    {item.message && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {
                          item.message
                        }
                      </p>
                    )}

                    {item.attachments.length >
                      0 && (
                      <div className={`${item.message ? "mt-3" : ""} space-y-2`}>
                        {item.attachments.map(
                          (
                            attachment
                          ) => {
                            const href =
                              `/api/tickets/${ticketId}/attachments/${attachment.id}`;

                            if (
                              isImage(
                                attachment.file_type
                              )
                            ) {
                              return (
                                <a
                                  key={
                                    attachment.id
                                  }
                                  href={
                                    href
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl border border-black/10 bg-white"
                                >
                                  <img
                                    src={
                                      href
                                    }
                                    alt={
                                      attachment.file_name
                                    }
                                    className="max-h-[360px] w-full object-cover"
                                  />

                                  <div className="flex items-center justify-between gap-3 px-3 py-2 text-slate-700">
                                    <span className="min-w-0 truncate text-xs font-medium">
                                      {
                                        attachment.file_name
                                      }
                                    </span>

                                    <span className="shrink-0 text-[10px] text-slate-500">
                                      {formatFileSize(
                                        attachment.file_size
                                      )}
                                    </span>
                                  </div>
                                </a>
                              );
                            }

                            const Icon =
                              getFileIcon(
                                attachment.file_type
                              );

                            return (
                              <a
                                key={
                                  attachment.id
                                }
                                href={
                                  href
                                }
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                  mine
                                    ? "border-white/20 bg-white/10"
                                    : "border-[var(--border)] bg-white"
                                }`}
                              >
                                <Icon className="h-4 w-4 shrink-0" />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">
                                    {
                                      attachment.file_name
                                    }
                                  </p>

                                  <p
                                    className={`mt-0.5 text-[10px] ${
                                      mine
                                        ? "text-white/65"
                                        : "text-[var(--muted)]"
                                    }`}
                                  >
                                    {formatFileSize(
                                      attachment.file_size
                                    )}
                                  </p>
                                </div>

                                <Download className="h-4 w-4 shrink-0" />
                              </a>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  {!item.optimistic && (
                    <div
                      className={`mt-1.5 flex flex-wrap items-center gap-1 ${
                        mine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {Array.from(
                        grouped.entries()
                      ).map(
                        ([
                          emoji,
                          reaction,
                        ]) => (
                          <button
                            key={
                              emoji
                            }
                            type="button"
                            onClick={() =>
                              toggleReaction(
                                item.id,
                                emoji
                              )
                            }
                            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs ${
                              reaction.mine
                                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "border-[var(--border)] bg-white text-[var(--foreground)]"
                            }`}
                          >
                            <span>
                              {
                                emoji
                              }
                            </span>

                            <span className="text-[10px] font-semibold">
                              {
                                reaction.count
                              }
                            </span>
                          </button>
                        )
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setReactionOpen(
                              reactionOpen ===
                                item.id
                                ? null
                                : item.id
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)]"
                          aria-label="Add reaction"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        {reactionOpen ===
                          item.id && (
                          <div
                            className={`absolute z-40 mt-2 flex gap-1 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.14)] ${
                              mine
                                ? "right-0"
                                : "left-0"
                            }`}
                          >
                            {reactionOptions.map(
                              (
                                emoji
                              ) => (
                                <button
                                  key={
                                    emoji
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleReaction(
                                      item.id,
                                      emoji
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[var(--surface-hover)]"
                                >
                                  {
                                    emoji
                                  }
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      {isClosed ? (
        <div className="border-t border-[var(--border-light)] px-5 py-5 text-center text-sm text-[var(--muted)]">
          This ticket is closed.
        </div>
      ) : (
        <div className="border-t border-[var(--border-light)] p-3 sm:p-5">
          <TicketComposer
            onSend={
              sendMessage
            }
            onTypingChange={
              broadcastTyping
            }
          />
        </div>
      )}
    </section>
  );
}