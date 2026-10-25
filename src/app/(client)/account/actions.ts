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

function accountError(
  message: string
): never {
  redirect(
    `/account?error=${encodeURIComponent(
      message
    )}`
  );
}

function accountMessage(
  message: string
): never {
  redirect(
    `/account?message=${encodeURIComponent(
      message
    )}`
  );
}

export async function updateProfile(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    String(
      formData.get(
        "fullName"
      ) ?? ""
    ).trim();

  if (!fullName) {
    accountError(
      "Please enter your full name."
    );
  }

  if (
    fullName.length >
    100
  ) {
    accountError(
      "Name must be 100 characters or less."
    );
  }

  const {
    error,
  } = await supabase
    .from("profiles")
    .update({
      full_name:
        fullName,
    })
    .eq(
      "id",
      user.id
    );

  if (error) {
    accountError(
      error.message
    );
  }

  revalidatePath(
    "/account"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/",
    "layout"
  );

  accountMessage(
    "Profile updated."
  );
}

export async function updateAccountPassword(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    accountError(
      "Please complete both password fields."
    );
  }

  if (
    password !==
    confirmPassword
  ) {
    accountError(
      "Passwords do not match."
    );
  }

  if (
    password.length <
    8
  ) {
    accountError(
      "Password must be at least 8 characters."
    );
  }

  const {
    error,
  } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    accountError(
      error.message
    );
  }

  revalidatePath(
    "/account"
  );

  accountMessage(
    "Password updated."
  );
}