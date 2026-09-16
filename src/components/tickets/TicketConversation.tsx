"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";

import {
  Download,
  File,
  FileArchive,
  FileText,
  ImageIcon,
  LoaderCircle,
  Paperclip,
  Plus,
  Send,
  Smile,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

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
};

type TicketConversationProps = {
  ticketId: string;

  currentUserId: string;

  customerName: string;

  messages:
    TicketMessage[];

  closed: boolean;

  adminView?: boolean;
};

const emojiOptions = [
  "😀",
  "😂",
  "😊",
  "😍",
  "😎",
  "🤔",
  "😮",
  "😢",
  "🙏",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "✅",
  "👀",
  "💯",
  "🚀",
  "✨",
  "💡",
];

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

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

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

function formatFileSize(
  size:
    | number
    | null
) {
  const bytes =
    Number(
      size ??
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

function attachmentIcon(
  attachment: Attachment
) {
  if (
    isImage(
      attachment.file_type
    )
  ) {
    return ImageIcon;
  }

  if (
    attachment.file_type?.includes(
      "zip"
    )
  ) {
    return FileArchive;
  }

  if (
    attachment.file_type?.includes(
      "pdf"
    ) ||
    attachment.file_type?.includes(
      "word"
    ) ||
    attachment.file_type?.includes(
      "text"
    )
  ) {
    return FileText;
  }

  return File;
}

export default function TicketConversation({
  ticketId,
  currentUserId,
  customerName,
  messages,
  closed,
  adminView = false,
}: TicketConversationProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    files,
    setFiles,
  ] = useState<
    File[]
  >([]);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    emojiOpen,
    setEmojiOpen,
  ] = useState(false);

  const [
    reactionOpen,
    setReactionOpen,
  ] = useState<
    string | null
  >(null);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  function addFiles(
    incoming:
      File[]
  ) {
    setError(
      null
    );

    const availableSlots =
      MAX_FILES -
      files.length;

    if (
      availableSlots <=
      0
    ) {
      setError(
        `You can attach up to ${MAX_FILES} files.`
      );

      return;
    }

    const accepted:
      File[] = [];

    for (
      const file
      of incoming.slice(
        0,
        availableSlots
      )
    ) {
      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setError(
          `${file.name} is larger than 10 MB.`
        );

        continue;
      }

      const duplicate =
        files.some(
          (
            current
          ) =>
            current.name ===
              file.name &&
            current.size ===
              file.size
        );

      if (
        !duplicate
      ) {
        accepted.push(
          file
        );
      }
    }

    setFiles(
      (
        current
      ) => [
        ...current,
        ...accepted,
      ]
    );
  }

  function handleFileInput(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    addFiles(
      Array.from(
        event.target.files ??
          []
      )
    );

    event.target.value =
      "";
  }

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(
      false
    );

    addFiles(
      Array.from(
        event.dataTransfer
          .files
      )
    );
  }

  function removeFile(
    index: number
  ) {
    setFiles(
      (
        current
      ) =>
        current.filter(
          (
            _,
            fileIndex
          ) =>
            fileIndex !==
            index
        )
    );
  }

  function addEmoji(
    emoji: string
  ) {
    setMessage(
      (
        current
      ) =>
        `${current}${emoji}`
    );

    setEmojiOpen(
      false
    );

    requestAnimationFrame(
      () => {
        textareaRef.current?.focus();
      }
    );
  }

  async function sendMessage(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      sending
    ) {
      return;
    }

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage &&
      files.length ===
        0
    ) {
      return;
    }

    setSending(
      true
    );

    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "message",
        cleanMessage
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

      setMessage(
        ""
      );

      setFiles(
        []
      );

      setEmojiOpen(
        false
      );

      router.refresh();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Unable to send message."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  async function toggleReaction(
    replyId: string,
    emoji: string
  ) {
    setReactionOpen(
      null
    );

    try {
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
        !response.ok
      ) {
        return;
      }

      router.refresh();
    } catch {
      // Ignore reaction network failure.
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border-light)] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Conversation
        </h2>

        <p className="mt-1 text-xs text-[var(--muted)]">
          Messages, files and reactions.
        </p>
      </div>

      <div className="space-y-6 px-3 py-5 sm:px-6 sm:py-6">
        {messages.length ===
        0 ? (
          <div className="py-12 text-center text-sm text-[var(--muted)]">
            No messages yet.
          </div>
        ) : (
          messages.map(
            (
              item
            ) => {
              const mine =
                adminView
                  ? item.is_admin
                  : !item.is_admin;

              const groups =
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
                  groups.get(
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

                groups.set(
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
                          {formatDate(
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
                              const url =
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
                                      url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-xl border border-black/10 bg-white"
                                  >
                                    <img
                                      src={
                                        url
                                      }
                                      alt={
                                        attachment.file_name
                                      }
                                      className="max-h-[360px] w-full object-cover"
                                    />

                                    <div className="flex items-center justify-between gap-3 px-3 py-2">
                                      <span className="min-w-0 truncate text-xs font-medium text-slate-700">
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

                              const AttachmentIcon =
                                attachmentIcon(
                                  attachment
                                );

                              return (
                                <a
                                  key={
                                    attachment.id
                                  }
                                  href={
                                    url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                    mine
                                      ? "border-white/20 bg-white/10"
                                      : "border-[var(--border)] bg-white"
                                  }`}
                                >
                                  <AttachmentIcon className="h-4 w-4 shrink-0" />

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

                    <div
                      className={`mt-1.5 flex flex-wrap items-center gap-1 ${
                        mine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {Array.from(
                        groups.entries()
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
                          aria-label="Add reaction"
                          onClick={() =>
                            setReactionOpen(
                              reactionOpen ===
                                item.id
                                ? null
                                : item.id
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        {reactionOpen ===
                          item.id && (
                          <div
                            className={`absolute z-30 mt-2 flex gap-1 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.14)] ${
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
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {closed ? (
        <div className="border-t border-[var(--border-light)] px-5 py-5 text-center text-sm text-[var(--muted)]">
          This ticket is closed.
        </div>
      ) : (
        <form
          onSubmit={
            sendMessage
          }
          className="border-t border-[var(--border-light)] p-3 sm:p-5"
        >
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              {
                error
              }
            </div>
          )}

          {files.length >
            0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex max-w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />

                    <div className="min-w-0">
                      <p className="max-w-[170px] truncate text-xs font-medium sm:max-w-[240px]">
                        {
                          file.name
                        }
                      </p>

                      <p className="text-[10px] text-[var(--muted)]">
                        {formatFileSize(
                          file.size
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(
                          index
                        )
                      }
                      className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div
            onDragEnter={(
              event
            ) => {
              event.preventDefault();

              setDragging(
                true
              );
            }}
            onDragOver={(
              event
            ) => {
              event.preventDefault();

              setDragging(
                true
              );
            }}
            onDragLeave={(
              event
            ) => {
              event.preventDefault();

              setDragging(
                false
              );
            }}
            onDrop={
              handleDrop
            }
            className={`rounded-[16px] border bg-white transition-colors ${
              dragging
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border)]"
            }`}
          >
            {dragging && (
              <div className="border-b border-[var(--border-light)] px-4 py-2 text-center text-xs font-medium text-[var(--primary)]">
                Drop files here
              </div>
            )}

            <textarea
              ref={
                textareaRef
              }
              value={
                message
              }
              onChange={(
                event
              ) =>
                setMessage(
                  event.target
                    .value
                )
              }
              rows={
                4
              }
              maxLength={
                10000
              }
              placeholder="Write a message..."
              className="min-h-[96px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)]"
            />

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-light)] px-2 py-2">
              <div className="flex items-center gap-1">
                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  multiple
                  onChange={
                    handleFileInput
                  }
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip,.txt,.json,.doc,.docx,.xls,.xlsx"
                />

                <button
                  type="button"
                  title="Attach files"
                  aria-label="Attach files"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                >
                  <Paperclip className="h-[18px] w-[18px]" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    title="Emoji"
                    aria-label="Emoji"
                    onClick={() =>
                      setEmojiOpen(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                  >
                    <Smile className="h-[18px] w-[18px]" />
                  </button>

                  {emojiOpen && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-40 grid w-[230px] grid-cols-5 gap-1 rounded-[16px] border border-[var(--border)] bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,0.16)]">
                      {emojiOptions.map(
                        (
                          emoji
                        ) => (
                          <button
                            key={
                              emoji
                            }
                            type="button"
                            onClick={() =>
                              addEmoji(
                                emoji
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-[var(--surface-hover)]"
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

                <span className="hidden pl-1 text-[10px] text-[var(--muted-light)] sm:inline">
                  Max 5 files · 10 MB each
                </span>
              </div>

              <button
                type="submit"
                disabled={
                  sending ||
                  (
                    !message.trim() &&
                    files.length ===
                      0
                  )
                }
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? (
                  <LoaderCircle className="h-[17px] w-[17px] animate-spin" />
                ) : (
                  <Send className="h-[17px] w-[17px]" />
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}