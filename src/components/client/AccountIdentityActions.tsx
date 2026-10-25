"use client";

import {
  useState,
} from "react";

import Button from "@/components/ui/Button";

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
  return provider ===
    "google"
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
      sessionStorage.setItem(
        "embernix_linking_provider",
        provider
      );

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
        sessionStorage.removeItem(
          "embernix_linking_provider"
        );

        throw error;
      }

      if (!data?.url) {
        sessionStorage.removeItem(
          "embernix_linking_provider"
        );

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
          )} is not connected.`
        );
      }

      if (
        identities.length <=
        1
      ) {
        throw new Error(
          "Connect another sign-in method first."
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
    }
  }

  if (connected) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={
          loading
        }
        onClick={
          disconnectIdentity
        }
      >
        Disconnect
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      loading={
        loading
      }
      onClick={
        connectIdentity
      }
    >
      Connect
    </Button>
  );
}