"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/auth/app-origin";

type OAuthProvider =
  | "google"
  | "discord";

async function signInWithProvider(
  provider: OAuthProvider
) {
  const supabase =
    await createClient();

  const appOrigin =
    await getAppOrigin();

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithOAuth({
      provider,

      options: {
        redirectTo:
          `${appOrigin}/auth/callback?next=/dashboard`,
      },
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (!data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Unable to start ${provider} sign in.`
      )}`
    );
  }

  redirect(data.url);
}

export async function signInWithGoogle() {
  await signInWithProvider(
    "google"
  );
}

export async function signInWithDiscord() {
  await signInWithProvider(
    "discord"
  );
}