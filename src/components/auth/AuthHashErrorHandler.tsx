"use client";

import {
  useEffect,
} from "react";

function providerLabel(
  provider: string | null
) {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "discord") {
    return "Discord";
  }

  return "Account";
}

export function AuthHashErrorHandler() {
  useEffect(() => {
    const hash =
      window.location.hash;

    if (
      !hash ||
      hash.length <= 1
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        hash.substring(1)
      );

    const error =
      params.get(
        "error"
      );

    const errorCode =
      params.get(
        "error_code"
      );

    const errorDescription =
      params.get(
        "error_description"
      );

    if (
      !error &&
      !errorCode &&
      !errorDescription
    ) {
      return;
    }

    const provider =
      sessionStorage.getItem(
        "embernix_linking_provider"
      );

    sessionStorage.removeItem(
      "embernix_linking_provider"
    );

    let message =
      "Unable to complete sign-in.";

    let destination =
      "/login";

    if (
      errorCode ===
      "identity_already_exists"
    ) {
      message =
        `${providerLabel(
          provider
        )} account already connected.`;

      destination =
        "/account";
    } else if (
      error ===
        "access_denied" ||
      errorCode ===
        "access_denied"
    ) {
      message =
        provider
          ? `${providerLabel(
              provider
            )} connection cancelled.`
          : "Sign-in cancelled.";

      destination =
        provider
          ? "/account"
          : "/login";
    } else if (
      provider
    ) {
      message =
        errorDescription ||
        `Unable to connect ${providerLabel(
          provider
        )}.`;

      destination =
        "/account";
    } else if (
      errorDescription
    ) {
      message =
        errorDescription;
    }

    window.history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search
    );

    window.location.replace(
      `${destination}?error=${encodeURIComponent(
        message
      )}`
    );
  }, []);

  return null;
}