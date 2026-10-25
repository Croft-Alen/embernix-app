import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

function getSafeNextPath(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

function redirectToLoginError(
  request: NextRequest,
  message: string
) {
  const destination =
    new URL(
      "/login",
      request.url
    );

  destination.searchParams.set(
    "error",
    message
  );

  return NextResponse.redirect(
    destination
  );
}

export async function GET(
  request: NextRequest
) {
  const url =
    request.nextUrl;

  const providerError =
    url.searchParams.get(
      "error_description"
    ) ??
    url.searchParams.get(
      "error"
    );

  if (providerError) {
    return redirectToLoginError(
      request,
      providerError
    );
  }

  const code =
    url.searchParams.get(
      "code"
    );

  const next =
    getSafeNextPath(
      url.searchParams.get(
        "next"
      )
    );

  if (!code) {
    return redirectToLoginError(
      request,
      "Missing authentication code."
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "Authentication callback error:",
      error
    );

    return redirectToLoginError(
      request,
      "Authentication could not be completed. Please try again."
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      url.origin
    )
  );
}