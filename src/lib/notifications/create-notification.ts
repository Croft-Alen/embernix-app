
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "ticket_reply"
  | "ticket_resolved"
  | "ticket_closed"
  | "product_update"
  | "purchase_success"
  | "license_reactivated";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  href = null,
  metadata = {},
  dedupeKey = null,
}: CreateNotificationInput): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      href,
      metadata,
      dedupe_key: dedupeKey,
    });

  if (!error || error.code === "23505") {
    return true;
  }

  console.error(
    "Failed to create notification:",
    error
  );

  return false;
}
