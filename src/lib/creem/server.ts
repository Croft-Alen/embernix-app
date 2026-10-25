import "server-only";

type CreemRecord = Record<string, unknown>;

function isRecord(value: unknown): value is CreemRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function creemBaseUrl(): string {
  return process.env.CREEM_ENVIRONMENT === "production"
    ? "https://api.creem.io"
    : "https://test-api.creem.io";
}

async function creemRequest(path: string, init?: RequestInit): Promise<CreemRecord> {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new Error("CREEM_API_KEY is not configured.");

  const response = await fetch(`${creemBaseUrl()}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload)) {
    console.error("Creem API request failed", { path, status: response.status });
    throw new Error(`Creem request failed (${response.status}).`);
  }
  return payload;
}

export type CreemDiscount = {
  id: string;
  code: string;
  status: string;
  type: string;
  percentage: number | null;
  amount: number | null;
  currency: string | null;
  expiryDate: string | null;
  maxRedemptions: number | null;
  redeemCount: number;
  products: string[];
};

export async function getCreemDiscountByCode(code: string): Promise<CreemDiscount> {
  const result = await creemRequest(
    `/v1/discounts?discount_code=${encodeURIComponent(code)}`
  );
  if (typeof result.id !== "string" || typeof result.code !== "string") {
    throw new Error("Creem returned an invalid discount.");
  }
  return {
    id: result.id,
    code: result.code,
    status: typeof result.status === "string" ? result.status : "unknown",
    type: typeof result.type === "string" ? result.type : "unknown",
    percentage: typeof result.percentage === "number" ? result.percentage : null,
    amount: typeof result.amount === "number" ? result.amount : null,
    currency: typeof result.currency === "string" ? result.currency : null,
    expiryDate: typeof result.expiry_date === "string" ? result.expiry_date : null,
    maxRedemptions: typeof result.max_redemptions === "number" ? result.max_redemptions : null,
    redeemCount: typeof result.redeem_count === "number" ? result.redeem_count : 0,
    products: Array.isArray(result.applies_to_products)
      ? result.applies_to_products.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export async function createCreemCheckout(input: {
  productId: string;
  orderNumber: string;
  customerEmail: string;
  successUrl: string;
  metadata: Record<string, string>;
  discountCode?: string | null;
}): Promise<{ id: string; checkoutUrl: string }> {
  const payload = await creemRequest("/v1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_id: input.productId,
      request_id: input.orderNumber,
      units: 1,
      customer: { email: input.customerEmail },
      success_url: input.successUrl,
      metadata: input.metadata,
      ...(input.discountCode ? { discount_code: input.discountCode } : {}),
    }),
  });
  const id = payload.id;
  const url = payload.checkout_url;
  if (typeof id !== "string" || typeof url !== "string") {
    throw new Error("Creem did not return a checkout ID and URL.");
  }
  const checkoutUrl = new URL(url);
  if (
    checkoutUrl.protocol !== "https:" ||
    !(checkoutUrl.hostname === "creem.io" || checkoutUrl.hostname.endsWith(".creem.io"))
  ) {
    throw new Error("Creem returned an unexpected checkout URL.");
  }
  return { id, checkoutUrl: checkoutUrl.toString() };
}
