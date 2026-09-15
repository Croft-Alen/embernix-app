"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Please enter your email and password.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/", "layout");

  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (!name || !email || !password || !confirmPassword) {
    redirect("/register?error=Please complete all fields.");
  }

  if (password !== confirmPassword) {
    redirect("/register?error=Passwords do not match.");
  }

  if (password.length < 8) {
    redirect(
      "/register?error=Password must be at least 8 characters."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(
      `/register?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/dashboard");
  }

  redirect(
    "/login?message=Account created. Please check your email to confirm your account."
  );
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      "/forgot-password?error=Please enter your email address."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    }
  );

  if (error) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(
    "/forgot-password?message=Check your email for the password reset link."
  );
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (!password || !confirmPassword) {
    redirect(
      "/reset-password?error=Please complete both fields."
    );
  }

  if (password !== confirmPassword) {
    redirect(
      "/reset-password?error=Passwords do not match."
    );
  }

  if (password.length < 8) {
    redirect(
      "/reset-password?error=Password must be at least 8 characters."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/forgot-password?error=Your password reset session has expired. Please request a new link."
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      `/reset-password?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/", "layout");

  redirect(
    "/login?message=Your password has been updated. You can now sign in."
  );
}