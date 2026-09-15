"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useEffect,
} from "react";

type PaymentStatusWatcherProps = {
  isPaid: boolean;
};

export default function PaymentStatusWatcher({
  isPaid,
}: PaymentStatusWatcherProps) {
  const router =
    useRouter();

  useEffect(() => {
    if (isPaid) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          router.refresh();
        },
        1500
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    isPaid,
    router,
  ]);

  return null;
}