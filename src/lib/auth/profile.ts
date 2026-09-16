import type {
  User,
} from "@supabase/supabase-js";

export type UserProfile = {
  id: string;

  full_name:
    | string
    | null;

  avatar_url:
    | string
    | null;

  created_at: string;

  updated_at: string;
};

export function getProviderAvatar(
  user: User
) {
  const metadata =
    user.user_metadata ??
    {};

  return (
    metadata.avatar_url ??
    metadata.picture ??
    null
  );
}

export function getDisplayName(
  user: User,
  profile?:
    | UserProfile
    | null
) {
  if (
    profile?.full_name?.trim()
  ) {
    return profile.full_name.trim();
  }

  const metadata =
    user.user_metadata ??
    {};

  return (
    metadata.full_name ??
    metadata.name ??
    user.email?.split(
      "@"
    )[0] ??
    "User"
  );
}

export function getAvatarUrl(
  user: User,
  profile?:
    | UserProfile
    | null
) {
  /*
   * User-uploaded Embernix
   * avatar always wins.
   */
  if (
    profile?.avatar_url
  ) {
    return profile.avatar_url;
  }

  /*
   * Otherwise fall back to
   * Google / Discord avatar.
   */
  return getProviderAvatar(
    user
  );
}

export function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "U";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[
      parts.length - 1
    ].charAt(0)
  ).toUpperCase();
}