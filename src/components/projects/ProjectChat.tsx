"use client";

import {
  FileText,
  LoaderCircle,
  Paperclip,
  Send,
} from "lucide-react";

import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  sendProjectMessage,
  toggleProjectReaction,
} from "@/app/(client)/projects/actions";

type Attachment = {
  id: string;
  file_name: string;
  file_type:
    | string
    | null;
  file_size:
    | number
    | null;
  signed_url: string;
};

type Reaction = {
  id: string;
  user_id: string;
  reaction: string;
};

type Message = {
  id: string;

  sender_type:
    | "customer"
    | "admin";

  sender_user_id:
    string;

  message:
    | string
    | null;

  created_at:
    string;

  attachments:
    Attachment[];

  reactions:
    Reaction[];
};

type ProjectChatProps = {
  projectId: string;
  currentUserId: string;
  messages: Message[];
  disabled?: boolean;
};

const REACTIONS = [
  "👍",
  "❤️",
  "✅",
  "👀",
  "🙏",
];

function formatFileSize(
  size:
    | number
    | null
) {
  if (!size) {
    return "";
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${Math.round(
      size / 1024
    )} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

export default function ProjectChat({
  projectId,
  currentUserId,
  messages,
  disabled = false,
}: ProjectChatProps) {
  const [
    message,
    setMessage,
  ] = useState("");

  const [
    files,
    setFiles,
  ] = useState<File[]>(
    []
  );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  function handleSend() {
    if (
      isPending ||
      disabled
    ) {
      return;
    }

    if (
      !message.trim() &&
      files.length === 0
    ) {
      return;
    }

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

    startTransition(
      async () => {
        await sendProjectMessage(
          projectId,
          formData
        );

        setMessage("");
        setFiles([]);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      }
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border-light)] px-5 py-4">
        <h2 className="font-semibold">
          Project chat
        </h2>

        <p className="mt-1 text-xs text-[var(--muted)]">
          Talk directly with the Embernix team.
        </p>
      </div>

      <div className="max-h-[620px] space-y-5 overflow-y-auto p-5">
        {messages.length ===
        0 ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">
            No messages yet.
          </div>
        ) : (
          messages.map(
            (
              chatMessage
            ) => {
              const mine =
                chatMessage
                  .sender_user_id ===
                currentUserId;

              return (
                <div
                  key={
                    chatMessage.id
                  }
                  className={`flex ${
                    mine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="max-w-[85%]">
                    <p className="mb-1 text-xs text-[var(--muted)]">
                      {mine
                        ? "You"
                        : chatMessage.sender_type ===
                            "admin"
                          ? "Embernix"
                          : "Customer"}
                    </p>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        mine
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-secondary)] text-[var(--foreground)]"
                      }`}
                    >
                      {chatMessage.message && (
                        <p className="whitespace-pre-wrap leading-6">
                          {
                            chatMessage.message
                          }
                        </p>
                      )}

                      {chatMessage
                        .attachments
                        .length >
                        0 && (
                        <div className="mt-3 space-y-2">
                          {chatMessage.attachments.map(
                            (
                              attachment
                            ) => (
                              <a
                                key={
                                  attachment.id
                                }
                                href={
                                  attachment.signed_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                                  mine
                                    ? "border-white/20 bg-white/10"
                                    : "border-[var(--border)] bg-white"
                                }`}
                              >
                                <FileText className="h-4 w-4 shrink-0" />

                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium">
                                    {
                                      attachment.file_name
                                    }
                                  </p>

                                  <p className="text-[10px] opacity-70">
                                    {formatFileSize(
                                      attachment.file_size
                                    )}
                                  </p>
                                </div>
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1">
                      {REACTIONS.map(
                        (
                          reaction
                        ) => {
                          const relevant =
                            chatMessage.reactions.filter(
                              (
                                current
                              ) =>
                                current.reaction ===
                                reaction
                            );

                          const reacted =
                            relevant.some(
                              (
                                current
                              ) =>
                                current.user_id ===
                                currentUserId
                            );

                          return (
                            <button
                              key={
                                reaction
                              }
                              type="button"
                              onClick={() =>
                                startTransition(
                                  async () => {
                                    await toggleProjectReaction(
                                      projectId,
                                      chatMessage.id,
                                      reaction
                                    );
                                  }
                                )
                              }
                              className={`rounded-lg px-1.5 py-1 text-xs transition-colors ${
                                reacted
                                  ? "bg-[var(--primary-soft)]"
                                  : "hover:bg-[var(--surface-secondary)]"
                              }`}
                            >
                              {
                                reaction
                              }

                              {relevant.length >
                                0 && (
                                <span className="ml-1">
                                  {
                                    relevant.length
                                  }
                                </span>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <p className="mt-1 text-[10px] text-[var(--muted-light)]">
                      {new Date(
                        chatMessage.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {!disabled && (
        <div className="border-t border-[var(--border-light)] p-4">
          {files.length >
            0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map(
                (
                  file,
                  index
                ) => (
                  <button
                    key={`${file.name}-${index}`}
                    type="button"
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
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
                  >
                    {file.name} ×
                  </button>
                )
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
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
              placeholder="Write a message..."
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />

            <input
              ref={
                fileInputRef
              }
              type="file"
              multiple
              className="hidden"
              onChange={(
                event
              ) =>
                setFiles(
                  Array.from(
                    event.target
                      .files ??
                      []
                  ).slice(
                    0,
                    5
                  )
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                handleSend
              }
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-50"
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}