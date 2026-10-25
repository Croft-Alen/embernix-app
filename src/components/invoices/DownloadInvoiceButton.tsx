"use client";

import {
  Download,
} from "lucide-react";

type DownloadInvoiceButtonProps = {
  invoiceId: string;

  variant?:
    | "primary"
    | "secondary";
};

export default function DownloadInvoiceButton({
  invoiceId,
  variant = "secondary",
}: DownloadInvoiceButtonProps) {
  const className =
    variant ===
    "primary"
      ? "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
      : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]";

  return (
    <a
      href={`/api/invoices/${invoiceId}/pdf`}
      className={
        className
      }
    >
      <Download className="h-4 w-4" />

      Download PDF
    </a>
  );
}