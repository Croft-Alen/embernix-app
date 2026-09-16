"use client";

import EmojiPicker from "emoji-picker-react";

import {
  ChevronDown,
  Download,
  File,
  LoaderCircle,
  Paperclip,
  Send,
  Smile,
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

type ChatAttachment = {
  id: string;
  fileName: string;
  fileType:
    | string
    | null;
  fileSize: number;
  url:
    | string
    | null;
};

type ChatMessage = {
  id: string;

  senderUserId: string;

  senderType:
    | "customer"
    | "admin";

  message:
    | string
    | null;

  createdAt: string;

  editedAt:
    | string
    | null;

  attachments:
    ChatAttachment[];
};

type SignedUpload = {
  path: string;
  token: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UploadedAttachment = {
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type ProjectChatProps = {
  projectId: string;
  currentUserId: string;
  disabled?: boolean;
};

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
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function formatTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      hour:
        "numeric",

      minute:
        "2-digit",

      month:
        "short",

      day:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

export default function ProjectChat({
  projectId,
  currentUserId,
  disabled = false,
}: ProjectChatProps) {
  const [
    messages,
    setMessages,
  ] = useState<
    ChatMessage[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    text,
    setText,
  ] = useState("");

  const [
    files,
    setFiles,
  ] = useState<File[]>(
    []
  );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    emojiOpen,
    setEmojiOpen,
  ] = useState(false);

  const [
    showJumpButton,
    setShowJumpButton,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  const scrollAreaRef =
    useRef<HTMLDivElement>(
      null
    );

  const emojiWrapperRef =
    useRef<HTMLDivElement>(
      null
    );

  const refreshTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const supabaseRef =
    useRef(
      createClient()
    );

  const previousCountRef =
    useRef(0);

  const scrollToBottom =
    useCallback(
      (
        behavior:
          | ScrollBehavior =
          "smooth"
      ) => {
        const area =
          scrollAreaRef.current;

        if (!area) {
          return;
        }

        area.scrollTo({
          top:
            area.scrollHeight,

          behavior,
        });

        setShowJumpButton(
          false
        );
      },
      []
    );

  const loadMessages =
    useCallback(
      async (
        silent = false
      ) => {
        if (!silent) {
          setLoading(
            true
          );
        }

        try {
          const response =
            await fetch(
              `/api/projects/${projectId}/messages`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as {
              messages?: ChatMessage[];
              error?: string;
            };

          if (
            !response.ok ||
            !result.messages
          ) {
            throw new Error(
              result.error ||
                "Unable to load chat."
            );
          }

          setMessages(
            result.messages
          );
        } catch (
          loadError
        ) {
          console.error(
            "Chat load failed:",
            loadError
          );

          if (!silent) {
            setError(
              loadError instanceof
                Error
                ? loadError.message
                : "Unable to load chat."
            );
          }
        } finally {
          if (!silent) {
            setLoading(
              false
            );
          }
        }
      },
      [
        projectId,
      ]
    );

  useEffect(() => {
    void loadMessages();

    const supabase =
      supabaseRef.current;

    const channel =
      supabase
        .channel(
          `project-chat-${projectId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "project_messages",

            filter:
              `project_id=eq.${projectId}`,
          },
          () => {
            if (
              refreshTimer.current
            ) {
              clearTimeout(
                refreshTimer.current
              );
            }

            refreshTimer.current =
              setTimeout(
                () => {
                  void loadMessages(
                    true
                  );
                },
                250
              );
          }
        )
        .subscribe();

    const fallback =
      setInterval(
        () => {
          void loadMessages(
            true
          );
        },
        15000
      );

    return () => {
      if (
        refreshTimer.current
      ) {
        clearTimeout(
          refreshTimer.current
        );
      }

      clearInterval(
        fallback
      );

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    loadMessages,
    projectId,
  ]);

  useEffect(() => {
    if (
      messages.length ===
      0
    ) {
      previousCountRef.current =
        0;

      return;
    }

    const area =
      scrollAreaRef.current;

    if (!area) {
      return;
    }

    const distanceFromBottom =
      area.scrollHeight -
      area.scrollTop -
      area.clientHeight;

    const firstLoad =
      previousCountRef.current ===
      0;

    const nearBottom =
      distanceFromBottom <
      180;

    if (
      firstLoad ||
      nearBottom
    ) {
      requestAnimationFrame(
        () => {
          scrollToBottom(
            firstLoad
              ? "auto"
              : "smooth"
          );
        }
      );
    } else if (
      messages.length >
      previousCountRef.current
    ) {
      setShowJumpButton(
        true
      );
    }

    previousCountRef.current =
      messages.length;
  }, [
    messages,
    scrollToBottom,
  ]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        !emojiOpen
      ) {
        return;
      }

      const target =
        event.target as Node;

      if (
        emojiWrapperRef.current &&
        !emojiWrapperRef.current.contains(
          target
        )
      ) {
        setEmojiOpen(
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
  }, [
    emojiOpen,
  ]);

  function resizeTextarea() {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        120
      )}px`;
  }

  useEffect(() => {
    resizeTextarea();
  }, [
    text,
  ]);

  function insertEmoji(
    emoji: string
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      setText(
        (
          current
        ) =>
          current +
          emoji
      );

      return;
    }

    const start =
      textarea.selectionStart;

    const end =
      textarea.selectionEnd;

    setText(
      (
        current
      ) =>
        current.slice(
          0,
          start
        ) +
        emoji +
        current.slice(
          end
        )
    );

    requestAnimationFrame(
      () => {
        textarea.focus();

        const cursor =
          start +
          emoji.length;

        textarea.setSelectionRange(
          cursor,
          cursor
        );
      }
    );
  }

  async function uploadFiles(): Promise<
    UploadedAttachment[]
  > {
    if (
      files.length ===
      0
    ) {
      return [];
    }

    const response =
      await fetch(
        `/api/projects/${projectId}/uploads/sign`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              purpose:
                "chat",

              files:
                files.map(
                  (
                    file
                  ) => ({
                    name:
                      file.name,

                    type:
                      file.type,

                    size:
                      file.size,
                  })
                ),
            }),
        }
      );

    const data =
      (await response.json()) as {
        uploads?: SignedUpload[];
        error?: string;
      };

    if (
      !response.ok ||
      !data.uploads
    ) {
      throw new Error(
        data.error ||
          "Unable to prepare attachments."
      );
    }

    const supabase =
      supabaseRef.current;

    const uploaded:
      UploadedAttachment[] =
      [];

    for (
      let index = 0;
      index <
      data.uploads.length;
      index++
    ) {
      const signed =
        data.uploads[
          index
        ];

      const file =
        files[index];

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "project-files"
          )
          .uploadToSignedUrl(
            signed.path,
            signed.token,
            file,
            {
              contentType:
                file.type ||
                "application/octet-stream",
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          `Unable to upload ${file.name}.`
        );
      }

      uploaded.push({
        path:
          signed.path,

        fileName:
          file.name,

        fileType:
          file.type ||
          "application/octet-stream",

        fileSize:
          file.size,
      });
    }

    return uploaded;
  }

  async function sendMessage() {
    if (
      sending ||
      disabled
    ) {
      return;
    }

    if (
      !text.trim() &&
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
      const attachments =
        await uploadFiles();

      const response =
        await fetch(
          `/api/projects/${projectId}/messages`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  text.trim(),

                attachments,
              }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          messages?: ChatMessage[];
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Unable to send message."
        );
      }

      setText(
        ""
      );

      setFiles(
        []
      );

      setEmojiOpen(
        false
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      if (
        result.messages
      ) {
        setMessages(
          result.messages
        );
      }

      requestAnimationFrame(
        () => {
          scrollToBottom();
        }
      );
    } catch (
      sendError
    ) {
      console.error(
        "Message send failed:",
        sendError
      );

      setError(
        sendError instanceof
          Error
          ? sendError.message
          : "Unable to send message."
      );
    } finally {
      setSending(
        false
      );

      requestAnimationFrame(
        () => {
          textareaRef.current?.focus();
        }
      );
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void sendMessage();
    }
  }

  function handleScroll() {
    const area =
      scrollAreaRef.current;

    if (!area) {
      return;
    }

    const distance =
      area.scrollHeight -
      area.scrollTop -
      area.clientHeight;

    if (
      distance <
      100
    ) {
      setShowJumpButton(
        false
      );
    }
  }

  function addSelectedFiles(
    selected: File[]
  ) {
    setFiles(
      (
        current
      ) => {
        const combined = [
          ...current,
          ...selected,
        ];

        const unique =
          combined.filter(
            (
              file,
              index,
              array
            ) =>
              array.findIndex(
                (
                  currentFile
                ) =>
                  currentFile.name ===
                    file.name &&
                  currentFile.size ===
                    file.size &&
                  currentFile.lastModified ===
                    file.lastModified
              ) ===
              index
          );

        return unique.slice(
          0,
          5
        );
      }
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
        <div>
          <h2 className="font-semibold">
            Project chat
          </h2>

          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Customer and Embernix project communication
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />

          Live
        </div>
      </div>

      <div className="relative">
        <div
          ref={
            scrollAreaRef
          }
          onScroll={
            handleScroll
          }
          className="h-[520px] overflow-y-auto overscroll-contain px-5 py-5"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--muted)]" />
            </div>
          ) : messages.length ===
            0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">
                No messages yet
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">
                Use this chat for project discussion, questions,
                updates, files, and clarification.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map(
                (
                  message
                ) => {
                  const mine =
                    message.senderUserId ===
                    currentUserId;

                  return (
                    <div
                      key={
                        message.id
                      }
                      className={`flex ${
                        mine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div className="max-w-[82%]">
                        <div
                          className={`mb-1.5 flex items-center gap-2 px-1 ${
                            mine
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <span className="text-xs font-medium text-[var(--muted)]">
                            {mine
                              ? "You"
                              : message.senderType ===
                                  "admin"
                                ? "Embernix"
                                : "Customer"}
                          </span>

                          <span className="text-[10px] text-[var(--muted-light)]">
                            {formatTime(
                              message.createdAt
                            )}
                          </span>
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            mine
                              ? "rounded-br-md bg-[var(--primary)] text-white"
                              : "rounded-bl-md bg-[var(--surface-secondary)] text-[var(--foreground)]"
                          }`}
                        >
                          {message.message && (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {
                                message.message
                              }
                            </p>
                          )}

                          {message.attachments.length >
                            0 && (
                            <div
                              className={`space-y-2 ${
                                message.message
                                  ? "mt-3"
                                  : ""
                              }`}
                            >
                              {message.attachments.map(
                                (
                                  attachment
                                ) => (
                                  <a
                                    key={
                                      attachment.id
                                    }
                                    href={
                                      attachment.url ??
                                      undefined
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    download={
                                      attachment.fileName
                                    }
                                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                      mine
                                        ? "border-white/20 bg-white/10 hover:bg-white/15"
                                        : "border-[var(--border)] bg-white hover:bg-[var(--surface-hover)]"
                                    }`}
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5">
                                      <File className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium">
                                        {
                                          attachment.fileName
                                        }
                                      </p>

                                      <p className="mt-0.5 text-[10px] opacity-70">
                                        {formatFileSize(
                                          attachment.fileSize
                                        )}
                                      </p>
                                    </div>

                                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {showJumpButton && (
          <button
            type="button"
            onClick={() =>
              scrollToBottom()
            }
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
          >
            New messages

            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!disabled && (
        <div className="border-t border-[var(--border-light)] bg-white p-4">
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
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
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex max-w-[280px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-1.5"
                  >
                    <File className="h-3.5 w-3.5 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
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
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
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
                        )
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-white transition-colors focus-within:border-[var(--primary)]">
            <textarea
              ref={
                textareaRef
              }
              value={
                text
              }
              disabled={
                sending
              }
              onChange={(
                event
              ) =>
                setText(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              rows={1}
              placeholder="Write a message..."
              className="block max-h-[120px] min-h-[54px] w-full resize-none overflow-y-auto rounded-t-2xl bg-transparent px-4 py-3 text-sm leading-6 outline-none"
            />

            <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5">
              <div
                ref={
                  emojiWrapperRef
                }
                className="relative flex min-w-0 items-center gap-1"
              >
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {emojiOpen && (
                  <div className="absolute bottom-11 left-0 z-50 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
                    <EmojiPicker
                      width={350}
                      height={420}
                      lazyLoadEmojis
                      searchPlaceHolder="Search emoji..."
                      onEmojiClick={(
                        emojiData
                      ) => {
                        insertEmoji(
                          emojiData.emoji
                        );
                      }}
                    />
                  </div>
                )}

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(
                    event
                  ) => {
                    const selected =
                      Array.from(
                        event.target
                          .files ??
                          []
                      );

                    addSelectedFiles(
                      selected
                    );

                    event.target.value =
                      "";
                  }}
                />

                <button
                  type="button"
                  title="Attach files"
                  aria-label="Attach files"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <span className="ml-1 hidden truncate text-[10px] text-[var(--muted-light)] sm:inline">
                  Enter to send · Shift+Enter for newline
                </span>
              </div>

              <button
                type="button"
                disabled={
                  sending ||
                  (
                    !text.trim() &&
                    files.length ===
                      0
                  )
                }
                onClick={() =>
                  void sendMessage()
                }
                className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send

                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}