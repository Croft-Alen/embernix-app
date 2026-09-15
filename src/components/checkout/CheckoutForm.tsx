"use client";

import {
  LockKeyhole,
  UserRound,
} from "lucide-react";

import {
  useState,
} from "react";

import PaddleCheckoutButton from "@/components/checkout/PaddleCheckoutButton";

type CheckoutFormProps = {
  productSlug: string;
  email: string;
  amountLabel: string;
};

export default function CheckoutForm({
  productSlug,
  email,
  amountLabel,
}: CheckoutFormProps) {
  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  return (
    <div className="space-y-5">
      {/* ACCOUNT */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] px-6 py-5">
          <h2 className="text-base font-semibold">
            Your account
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Your purchase will be linked to this
            Embernix account.
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-secondary)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--primary)]">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">
                Signed in as
              </p>

              <p className="mt-1 truncate text-sm font-medium">
                {email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TERMS */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) =>
              setAcceptedTerms(
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />

          <span className="text-sm leading-6 text-[var(--muted)]">
            I agree to the{" "}
            <a
              href="https://embernix.org/terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--foreground)] underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and acknowledge the applicable policies
            for this digital purchase.
          </span>
        </label>
      </section>

      {/* PAY */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <PaddleCheckoutButton
          productSlug={
            productSlug
          }
          amountLabel={
            amountLabel
          }
          acceptedTerms={
            acceptedTerms
          }
        />

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <LockKeyhole className="h-3.5 w-3.5" />
          Payment details are handled securely by Paddle.
        </div>
      </section>
    </div>
  );
}