"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getAppOrigin,
} from "@/lib/auth/app-origin";

function getString(
  value:
    | FormDataEntryValue
    | null
) {
  return String(
    value ?? ""
  ).trim();
}

function redirectError(
  path: string,
  message: string
): never {
  redirect(
    `${path}?error=${encodeURIComponent(
      message
    )}`
  );
}

function redirectMessage(
  path: string,
  message: string
): never {
  redirect(
    `${path}?message=${encodeURIComponent(
      message
    )}`
  );
}

/* =========================================================
   LOGIN
========================================================= */

export async function login(
  formData: FormData
) {
  const email =
    getString(
      formData.get("email")
    ).toLowerCase();

  const password =
    String(
      formData.get(
        "password"
      ) ?? ""
    );

  if (
    !email ||
    !password
  ) {
    redirectError(
      "/login",
      "Please enter your email and password."
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirectError(
      "/login",
      error.message
    );
  }

  revalidatePath(
    "/",
    "layout"
  );

  redirect(
    "/dashboard"
  );
}

/* =========================================================
   REGISTER
========================================================= */

export async function register(
  formData: FormData
) {
  const name =
    getString(
      formData.get("name")
    );

  const email =
    getString(
      formData.get("email")
    ).toLowerCase();

  const password =
    String(
      formData.get(
        "password"
      ) ?? ""
    );

  const confirmPassword =
    String(
      formData.get(
        "confirmPassword"
      ) ?? ""
    );

  if (
    !name ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    redirectError(
      "/register",
      "Please complete all fields."
    );
  }

  if (
    name.length < 2
  ) {
    redirectError(
      "/register",
      "Please enter your full name."
    );
  }

  if (
    password.length < 8
  ) {
    redirectError(
      "/register",
      "Password must be at least 8 characters."
    );
  }

  if (
    password !==
    confirmPassword
  ) {
    redirectError(
      "/register",
      "Passwords do not match."
    );
  }

  const supabase =
    await createClient();

  const appOrigin =
    await getAppOrigin();

  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          full_name:
            name,
        },

        emailRedirectTo:
          `${appOrigin}/auth/callback?next=/dashboard`,
      },
    });

  if (error) {
    redirectError(
      "/register",
      error.message
    );
  }

  revalidatePath(
    "/",
    "layout"
  );

  /*
   * If email confirmation is disabled,
   * Supabase may immediately create a session.
   */
  if (data.session) {
    redirect(
      "/dashboard"
    );
  }

  redirectMessage(
    "/login",
    "Account created. Please check your email to confirm your account."
  );
}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export async function forgotPassword(
  formData: FormData
) {
  const email =
    getString(
      formData.get("email")
    ).toLowerCase();

  if (!email) {
    redirectError(
      "/forgot-password",
      "Please enter your email address."
    );
  }

  const supabase =
    await createClient();

  const appOrigin =
    await getAppOrigin();

  const {
    error,
  } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${appOrigin}/auth/callback?next=/reset-password`,
      }
    );

  /*
   * Do not expose whether an email/account exists.
   */
  if (error) {
    console.error(
      "Password reset request failed:",
      error
    );
  }

  redirectMessage(
    "/forgot-password",
    "If an Embernix account exists for this email, a password reset link has been sent."
  );
}

/* =========================================================
   UPDATE PASSWORD
========================================================= */

export async function updatePassword(
  formData: FormData
) {
  const password =
    String(
      formData.get(
        "password"
      ) ?? ""
    );

  const confirmPassword =
    String(
      formData.get(
        "confirmPassword"
      ) ?? ""
    );

  if (
    !password ||
    !confirmPassword
  ) {
    redirectError(
      "/reset-password",
      "Please complete both fields."
    );
  }

  if (
    password.length < 8
  ) {
    redirectError(
      "/reset-password",
      "Password must be at least 8 characters."
    );
  }

  if (
    password !==
    confirmPassword
  ) {
    redirectError(
      "/reset-password",
      "Passwords do not match."
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirectError(
      "/forgot-password",
      "Your password reset link is invalid or has expired. Please request a new one."
    );
  }

  const {
    error,
  } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    redirectError(
      "/reset-password",
      error.message
    );
  }

  /*
   * End the recovery session so the
   * user signs in normally afterwards.
   */
  await supabase.auth.signOut();

  revalidatePath(
    "/",
    "layout"
  );

  redirectMessage(
    "/login",
    "Your password has been updated. Sign in with your new password."
  );
}