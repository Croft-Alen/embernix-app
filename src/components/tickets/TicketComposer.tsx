"use client";

import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";

import {
  File,
  LoaderCircle,
  Paperclip,
  Send,
  Smile,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type TicketComposerProps = {
  placeholder?: string;

  disabled?: boolean;

  onSend: (
    message: string,
    files: File[]
  ) => Promise<void>;

  onTypingChange?: (
    typing: boolean
  ) => void;
};

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const emojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😂",

  "😊",
  "😍",
  "🥰",
  "😎",
  "🤔",

  "😮",
  "😢",
  "😭",
  "😅",
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
  "🤝",
  "👌",
  "🙌",
  "⭐",
];

function formatFileSize(
  bytes: number
) {
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

export default function TicketComposer({
  placeholder =
    "Write a message...",
  disabled = false,
  onSend,
  onTypingChange,
}: TicketComposerProps) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const typingTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

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
    emojiOpen,
    setEmojiOpen,
  ] = useState(
    false
  );

  const [
    dragging,
    setDragging,
  ] = useState(
    false
  );

  const [
    sending,
    setSending,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    return () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      onTypingChange?.(
        false
      );
    };
  }, [
    onTypingChange,
  ]);

  function handleTyping(
    value: string
  ) {
    setMessage(
      value
    );

    onTypingChange?.(
      Boolean(
        value.trim()
      )
    );

    if (
      typingTimerRef.current
    ) {
      clearTimeout(
        typingTimerRef.current
      );
    }

    typingTimerRef.current =
      setTimeout(
        () => {
          onTypingChange?.(
            false
          );
        },
        1200
      );
  }

  function addFiles(
    incoming:
      File[]
  ) {
    setError(
      null
    );

    const remaining =
      MAX_FILES -
      files.length;

    if (
      remaining <=
      0
    ) {
      setError(
        "You can attach up to 5 files."
      );

      return;
    }

    const accepted:
      File[] = [];

    for (
      const file
      of incoming.slice(
        0,
        remaining
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

  function handleFiles(
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
            currentIndex
          ) =>
            currentIndex !==
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

    textareaRef.current?.focus();

    onTypingChange?.(
      true
    );
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      disabled ||
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

    onTypingChange?.(
      false
    );

    try {
      await onSend(
        cleanMessage,
        files
      );

      setMessage(
        ""
      );

      setFiles(
        []
      );

      setEmojiOpen(
        false
      );
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

  return (
    <form
      onSubmit={
        submit
      }
    >
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
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
                <File className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                <div className="min-w-0">
                  <p className="max-w-[180px] truncate text-xs font-medium text-[var(--foreground)] sm:max-w-[260px]">
                    {
                      file.name
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
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
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-white"
                  aria-label="Remove attachment"
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
        className={`overflow-visible rounded-[16px] border bg-white ${
          dragging
            ? "border-[var(--primary)]"
            : "border-[var(--border)]"
        }`}
      >
        {dragging && (
          <div className="border-b border-[var(--border-light)] px-4 py-2 text-center text-xs font-semibold text-[var(--primary)]">
            Drop attachments here
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
            handleTyping(
              event.target
                .value
            )
          }
          disabled={
            disabled ||
            sending
          }
          rows={
            4
          }
          maxLength={
            10000
          }
          placeholder={
            placeholder
          }
          className="min-h-[105px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-light)] px-2 py-2">
          <div className="flex items-center gap-1">
            <input
              ref={
                fileInputRef
              }
              type="file"
              multiple
              className="hidden"
              onChange={
                handleFiles
              }
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip,.txt,.json,.doc,.docx,.xls,.xlsx"
            />

            <button
              type="button"
              disabled={
                disabled ||
                sending
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-40"
              aria-label="Attach files"
              title="Attach files"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>

            <div className="relative">
              <button
                type="button"
                disabled={
                  disabled ||
                  sending
                }
                onClick={() =>
                  setEmojiOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-40"
                aria-label="Add emoji"
                title="Emoji"
              >
                <Smile className="h-[18px] w-[18px]" />
              </button>

              {emojiOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 grid w-[240px] grid-cols-5 gap-1 rounded-[16px] border border-[var(--border)] bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,0.16)]">
                  {emojis.map(
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
              5 files · 10 MB each
            </span>
          </div>

          <button
            type="submit"
            disabled={
              disabled ||
              sending ||
              (
                !message.trim() &&
                files.length ===
                  0
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
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
  );
}