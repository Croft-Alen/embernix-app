"use client";

import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  LoaderCircle,
  Pilcrow,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

import { createClient } from "@/lib/supabase/client";

type ProductRichTextEditorProps = {
  productId: string;
  initialContent?: string | null;
};

function extensionFromMime(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";

  return "jpg";
}

export default function ProductRichTextEditor({
  productId,
  initialContent,
}: ProductRichTextEditorProps) {
  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const [html, setHtml] = useState(
    initialContent ?? ""
  );

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,

      Image.configure({
        inline: false,
        allowBase64: false,
      }),

      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),

      Placeholder.configure({
        placeholder:
          "Write the full product description here...",
      }),
    ],

    content: initialContent ?? "",

    editorProps: {
      attributes: {
        class: [
          "min-h-[420px]",
          "px-6",
          "py-5",
          "outline-none",
          "text-[15px]",
          "leading-7",
          "text-[var(--foreground)]",

          "[&_p]:my-3",

          "[&_h2]:mt-8",
          "[&_h2]:mb-3",
          "[&_h2]:text-2xl",
          "[&_h2]:font-semibold",
          "[&_h2]:tracking-tight",

          "[&_h3]:mt-6",
          "[&_h3]:mb-2",
          "[&_h3]:text-xl",
          "[&_h3]:font-semibold",

          "[&_strong]:font-semibold",

          "[&_em]:italic",

          "[&_ul]:my-4",
          "[&_ul]:list-disc",
          "[&_ul]:pl-7",

          "[&_ol]:my-4",
          "[&_ol]:list-decimal",
          "[&_ol]:pl-7",

          "[&_li]:my-1",

          "[&_a]:font-medium",
          "[&_a]:text-[var(--primary)]",
          "[&_a]:underline",

          "[&_blockquote]:my-5",
          "[&_blockquote]:border-l-4",
          "[&_blockquote]:border-[var(--border)]",
          "[&_blockquote]:pl-4",
          "[&_blockquote]:text-[var(--muted)]",

          "[&_img]:my-6",
          "[&_img]:block",
          "[&_img]:h-auto",
          "[&_img]:max-w-full",
          "[&_img]:rounded-xl",
          "[&_img]:border",
          "[&_img]:border-[var(--border)]",
        ].join(" "),
      },
    },

    onUpdate({ editor }) {
      setHtml(editor.getHTML());
    },
  });

  function setLink() {
    if (!editor) return;

    const existing =
      editor.getAttributes("link").href ?? "";

    const url = window.prompt(
      "Enter link URL",
      existing || "https://"
    );

    if (url === null) return;

    if (!url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .unsetLink()
        .run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: url.trim(),
      })
      .run();
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!editor) return;

    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Use a JPG, PNG, WEBP, or GIF image."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Description image must be smaller than 10 MB."
      );
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const supabase = createClient();

      const extension =
        extensionFromMime(file.type);

      const path =
        `${productId}/description/` +
        `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-media")
          .upload(path, file, {
            contentType: file.type,
            cacheControl: "3600",
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("product-media")
        .getPublicUrl(path);

      editor
        .chain()
        .focus()
        .setImage({
          src: publicUrl,
          alt: file.name,
        })
        .run();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Image upload failed."
      );
    } finally {
      setUploadingImage(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  if (!editor) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-[var(--border)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  const buttonBase =
    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors";

  function buttonClass(active = false) {
    return `${buttonBase} ${
      active
        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
        : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"
    }`;
  }

  return (
    <div>
      <input
        type="hidden"
        name="description"
        value={html}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={uploadImage}
        className="hidden"
      />

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-light)] bg-[var(--surface-secondary)] p-2">
          <button
            type="button"
            title="Paragraph"
            onClick={() =>
              editor
                .chain()
                .focus()
                .setParagraph()
                .run()
            }
            className={buttonClass(
              editor.isActive("paragraph")
            )}
          >
            <Pilcrow className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Heading 2"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 2,
                })
                .run()
            }
            className={buttonClass(
              editor.isActive("heading", {
                level: 2,
              })
            )}
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Heading 3"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 3,
                })
                .run()
            }
            className={buttonClass(
              editor.isActive("heading", {
                level: 3,
              })
            )}
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <button
            type="button"
            title="Bold"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
            className={buttonClass(
              editor.isActive("bold")
            )}
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Italic"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
            className={buttonClass(
              editor.isActive("italic")
            )}
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <button
            type="button"
            title="Bullet list"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
            className={buttonClass(
              editor.isActive("bulletList")
            )}
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Numbered list"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
            className={buttonClass(
              editor.isActive("orderedList")
            )}
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <button
            type="button"
            title="Add link"
            onClick={setLink}
            className={buttonClass(
              editor.isActive("link")
            )}
          >
            <LinkIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Remove link"
            disabled={
              !editor.isActive("link")
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetLink()
                .run()
            }
            className={`${buttonClass()} disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <Unlink className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Upload image"
            disabled={uploadingImage}
            onClick={() =>
              imageInputRef.current?.click()
            }
            className={`${buttonClass()} disabled:cursor-wait`}
          >
            {uploadingImage ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <button
            type="button"
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .undo()
                .run()
            }
            className={`${buttonClass()} disabled:opacity-30`}
          >
            <Undo2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .redo()
                .run()
            }
            className={`${buttonClass()} disabled:opacity-30`}
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <EditorContent editor={editor} />
      </div>

      {uploadingImage && (
        <p className="mt-2 text-sm text-[var(--primary)]">
          Uploading image...
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-[var(--muted)]">
        Uploaded images are inserted exactly where your
        cursor is positioned in the description.
      </p>
    </div>
  );
}