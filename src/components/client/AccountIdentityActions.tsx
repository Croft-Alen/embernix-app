"use client";

import {
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type OAuthProvider =
  | "google"
  | "discord";

type AccountIdentityActionsProps = {
  provider: OAuthProvider;
  connected: boolean;
};

function providerName(
  provider: OAuthProvider
) {
  return provider === "google"
    ? "Google"
    : "Discord";
}

export function AccountIdentityActions({
  provider,
  connected,
}: AccountIdentityActionsProps) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const supabase =
    createClient();

  async function connectIdentity() {
    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.linkIdentity({
          provider,

          options: {
            redirectTo:
              `${window.location.origin}/auth/callback?next=/account`,
          },
        });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error(
          `Unable to connect ${providerName(
            provider
          )}.`
        );
      }

      window.location.href =
        data.url;
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to connect ${providerName(
              provider
            )}.`;

      window.location.href =
        `/account?error=${encodeURIComponent(
          message
        )}`;
    } finally {
      setLoading(false);
    }
  }

  async function disconnectIdentity() {
    setLoading(true);

    try {
      const {
        data,
        error:
          identitiesError,
      } =
        await supabase.auth.getUserIdentities();

      if (
        identitiesError
      ) {
        throw identitiesError;
      }

      const identities =
        data?.identities ??
        [];

      const identity =
        identities.find(
          (
            currentIdentity
          ) =>
            currentIdentity.provider ===
            provider
        );

      if (!identity) {
        throw new Error(
          `${providerName(
            provider
          )} is not connected to this account.`
        );
      }

      if (
        identities.length <=
        1
      ) {
        throw new Error(
          "Connect another sign-in method before disconnecting this one."
        );
      }

      const {
        error:
          unlinkError,
      } =
        await supabase.auth.unlinkIdentity(
          identity
        );

      if (
        unlinkError
      ) {
        throw unlinkError;
      }

      window.location.href =
        `/account?message=${encodeURIComponent(
          `${providerName(
            provider
          )} disconnected.`
        )}`;
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to disconnect ${providerName(
              provider
            )}.`;

      window.location.href =
        `/account?error=${encodeURIComponent(
          message
        )}`;
    } finally {
      setLoading(false);
    }
  }

  if (
    connected
  ) {
    return (
      <button
        type="button"
        disabled={
          loading
        }
        onClick={
          disconnectIdentity
        }
        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Disconnecting..."
          : "Disconnect"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={
        loading
      }
      onClick={
        connectIdentity
      }
      className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading
        ? "Connecting..."
        : "Connect"}
    </button>
  );
}