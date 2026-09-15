"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function accountError(message: string): never {
  redirect(`/account?error=${encodeURIComponent(message)}`);
}

function accountMessage(message: string): never {
  redirect(`/account?message=${encodeURIComponent(message)}`);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(
    formData.get("fullName") ?? ""
  ).trim();

  if (!fullName) {
    accountError("Please enter your full name.");
  }

  if (fullName.length > 100) {
    accountError("Name must be 100 characters or less.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
    })
    .eq("id", user.id);

  if (error) {
    accountError(error.message);
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  accountMessage("Profile updated successfully.");
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    accountError("Please select an image.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    accountError(
      "Avatar must be a JPG, PNG, or WEBP image."
    );
  }

  const maxFileSize = 2 * 1024 * 1024;

  if (file.size > maxFileSize) {
    accountError("Avatar must be smaller than 2 MB.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const avatarPath = `${user.id}/avatar.${extension}`;

  // Remove older avatar formats before saving the new one.
  await supabase.storage
    .from("avatars")
    .remove([
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
    ]);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(avatarPath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    accountError(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("avatars")
    .getPublicUrl(avatarPath);

  // Cache-busting value so the newly uploaded image
  // appears immediately.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (profileError) {
    accountError(profileError.message);
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  accountMessage("Profile photo updated.");
}

export async function removeAvatar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: storageError } = await supabase.storage
    .from("avatars")
    .remove([
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
    ]);

  if (storageError) {
    accountError(storageError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
    })
    .eq("id", user.id);

  if (profileError) {
    accountError(profileError.message);
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  accountMessage("Custom profile photo removed.");
}

export async function updateAccountPassword(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const password = String(
    formData.get("password") ?? ""
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (!password || !confirmPassword) {
    accountError("Please complete both password fields.");
  }

  if (password !== confirmPassword) {
    accountError("Passwords do not match.");
  }

  if (password.length < 8) {
    accountError(
      "Password must be at least 8 characters."
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    accountError(error.message);
  }

  revalidatePath("/account");

  accountMessage("Password updated successfully.");
}