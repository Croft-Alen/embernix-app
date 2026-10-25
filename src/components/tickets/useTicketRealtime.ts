"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type UseTicketRealtimeProps = {
  ticketId: string;
  currentUserId: string;
  initialStatus: string;
  onConversationChange: () => Promise<void>;
};

type TypingPayload = {
  userId?: string;
  typing?: boolean;
};

export function useTicketRealtime({
  ticketId,
  currentUserId,
  initialStatus,
  onConversationChange,
}: UseTicketRealtimeProps) {
  const [
    status,
    setStatus,
  ] = useState(
    initialStatus
  );

  const [
    otherTyping,
    setOtherTyping,
  ] = useState(
    false
  );

  const channelRef =
    useRef<ReturnType<
      ReturnType<
        typeof createClient
      >["channel"]
    > | null>(
      null
    );

  const typingTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const conversationCallbackRef =
    useRef(
      onConversationChange
    );

  useEffect(() => {
    conversationCallbackRef.current =
      onConversationChange;
  }, [
    onConversationChange,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase.channel(
        `ticket-live:${ticketId}`,
        {
          config: {
            broadcast: {
              self: false,
            },
          },
        }
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "ticket_replies",
          filter:
            `ticket_id=eq.${ticketId}`,
        },
        () => {
          void conversationCallbackRef.current();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "ticket_attachments",
          filter:
            `ticket_id=eq.${ticketId}`,
        },
        () => {
          void conversationCallbackRef.current();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "ticket_reactions",
          filter:
            `ticket_id=eq.${ticketId}`,
        },
        () => {
          void conversationCallbackRef.current();
        }
      )

      .on(
        "postgres_changes",
        {
          event:
            "UPDATE",
          schema:
            "public",
          table:
            "tickets",
          filter:
            `id=eq.${ticketId}`,
        },
        (
          payload
        ) => {
          const next =
            payload.new as {
              status?: string;
            };

          if (
            next.status
          ) {
            setStatus(
              next.status
            );
          }
        }
      )

      .on(
        "broadcast",
        {
          event:
            "typing",
        },
        ({
          payload,
        }) => {
          const data =
            payload as TypingPayload;

          if (
            !data.userId ||
            data.userId ===
              currentUserId
          ) {
            return;
          }

          setOtherTyping(
            Boolean(
              data.typing
            )
          );

          if (
            typingTimerRef.current
          ) {
            clearTimeout(
              typingTimerRef.current
            );
          }

          if (
            data.typing
          ) {
            typingTimerRef.current =
              setTimeout(
                () => {
                  setOtherTyping(
                    false
                  );
                },
                2500
              );
          }
        }
      )

      .subscribe();

    channelRef.current =
      channel;

    return () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      channelRef.current =
        null;

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    ticketId,
    currentUserId,
  ]);

  const broadcastTyping =
    useCallback(
      (
        typing: boolean
      ) => {
        const channel =
          channelRef.current;

        if (
          !channel
        ) {
          return;
        }

        void channel.send({
          type:
            "broadcast",

          event:
            "typing",

          payload: {
            userId:
              currentUserId,

            typing,
          },
        });
      },
      [
        currentUserId,
      ]
    );

  return {
    status,
    otherTyping,
    broadcastTyping,
  };
}