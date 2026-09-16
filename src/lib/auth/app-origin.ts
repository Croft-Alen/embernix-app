import { headers } from "next/headers";

export async function getAppOrigin() {
  const configuredUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const headerStore = await headers();

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host");

  if (!host) {
    throw new Error(
      "Unable to determine application origin."
    );
  }

  const forwardedProtocol =
    headerStore.get("x-forwarded-proto");

  const protocol =
    forwardedProtocol ??
    (host.includes("localhost")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}