"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

type InvoicePaymentStatusWatcherProps = {
  enabled: boolean;
};

export default function InvoicePaymentStatusWatcher({
  enabled,
}: InvoicePaymentStatusWatcherProps) {
  const router =
    useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let attempts = 0;

    const interval =
      window.setInterval(
        () => {
          attempts += 1;

          router.refresh();

          if (
            attempts >= 20
          ) {
            window.clearInterval(
              interval
            );
          }
        },
        2000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    enabled,
    router,
  ]);

  return null;
}