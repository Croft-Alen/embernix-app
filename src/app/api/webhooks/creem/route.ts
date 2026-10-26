
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type CreemEvent = {
  id: string;
  eventType: string;
  object: JsonRecord;
};

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function record(
  source: JsonRecord,
  key: string
): JsonRecord | null {
  const value = source[key];

  return isRecord(value) ? value : null;
}

function str(
  source: JsonRecord,
  key: string
): string | null {
  const value = source[key];

  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : null;
}

function amount(
  source: JsonRecord,
  key: string
): number | null {
  const value = source[key];

  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (
    !signature ||
    !/^[a-fA-F0-9]{64}$/.test(signature)
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest();

  const received = Buffer.from(signature, "hex");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

function parseEvent(payload: unknown): CreemEvent {
  if (!isRecord(payload)) {
    throw new Error("Invalid webhook body.");
  }

  const id = str(payload, "id");
  const eventType = str(payload, "eventType");
  const object = record(payload, "object");

  if (!id || !eventType || !object) {
    throw new Error("Missing webhook event data.");
  }

  return {
    id,
    eventType,
    object,
  };
}

function getCreemApiConfig() {
  const apiKey = process.env.CREEM_API_KEY;

  if (!apiKey) {
    throw new Error("CREEM_API_KEY is missing.");
  }

  const environment =
    process.env.CREEM_ENVIRONMENT?.toLowerCase();

  if (
    environment !== "test" &&
    environment !== "production"
  ) {
    throw new Error(
      "CREEM_ENVIRONMENT must be test or production."
    );
  }

  return {
    apiKey,
    baseUrl:
      environment === "test"
        ? "https://test-api.creem.io"
        : "https://api.creem.io",
    environment,
  };
}

async function retrieveCheckout(
  checkoutId: string
): Promise<JsonRecord> {
  const config = getCreemApiConfig();

  const url = new URL(
    "/v1/checkouts",
    config.baseUrl
  );

  url.searchParams.set("checkout_id", checkoutId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": config.apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error(
      "Creem checkout lookup failed:",
      {
        checkoutId,
        status: response.status,
      }
    );

    throw new Error(
      "Unable to verify checkout with Creem."
    );
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error(
      "Creem returned invalid checkout data."
    );
  }

  if (str(data, "id") !== checkoutId) {
    throw new Error(
      "Creem checkout identifier mismatch."
    );
  }

  if (str(data, "status") !== "completed") {
    throw new Error(
      "Checkout is not completed."
    );
  }

  const mode = str(data, "mode");

  if (mode && mode !== config.environment) {
    throw new Error(
      "Creem checkout environment mismatch."
    );
  }

  return data;
}

function getNestedId(
  source: JsonRecord,
  key: string
): string | null {
  const value = source[key];

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (isRecord(value)) {
    return str(value, "id");
  }

  return null;
}

function requireUuid(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(
      "Invalid local purchase identifier."
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new Error(
      "Invalid local purchase identifier."
    );
  }

  return value;
}

async function completeCheckout(
  event: CreemEvent
): Promise<string> {
  const eventCheckoutId = str(event.object, "id");

  if (!eventCheckoutId) {
    throw new Error(
      "Webhook checkout ID is missing."
    );
  }

  const admin = createAdminClient();

  const {
    data: localOrder,
    error: orderError,
  } = await admin
    .from("orders")
    .select(
      "id,user_id,order_number,customer_email,creem_checkout_id"
    )
    .eq("creem_checkout_id", eventCheckoutId)
    .maybeSingle();

  if (orderError) {
    console.error(
      "Creem local order lookup failed:",
      orderError
    );

    throw new Error(
      "Unable to load original checkout order."
    );
  }

  if (!localOrder) {
    throw new Error(
      "Original Embernix order not found."
    );
  }

  console.log(
    "Creem local order identifier types:",
    {
      orderIdType: typeof localOrder.id,
      userIdType: typeof localOrder.user_id,
      orderIdLength:
        typeof localOrder.id === "string"
          ? localOrder.id.length
          : null,
      userIdLength:
        typeof localOrder.user_id === "string"
          ? localOrder.user_id.length
          : null,
    }
  );

  let localOrderId: string;
  let localUserId: string;

  try {
    localOrderId = requireUuid(localOrder.id);
  } catch {
    throw new Error("Invalid Supabase order ID.");
  }

  try {
    localUserId = requireUuid(localOrder.user_id);
  } catch {
    throw new Error("Invalid Supabase user ID.");
  }

  const orderNumber = localOrder.order_number;

  if (
    typeof orderNumber !== "string" ||
    !orderNumber.trim()
  ) {
    throw new Error(
      "Original order number is invalid."
    );
  }

  const {
    data: items,
    error: itemsError,
  } = await admin
    .from("order_items")
    .select("product_id")
    .eq("order_id", localOrderId);

  if (itemsError) {
    console.error(
      "Creem order items lookup failed:",
      itemsError
    );

    throw new Error(
      "Unable to load original order items."
    );
  }

  if (!items || items.length !== 1) {
    throw new Error(
      "Creem checkout must contain exactly one product."
    );
  }

  console.log(
    "Creem local product identifier type:",
    {
      productIdType: typeof items[0].product_id,
      productIdLength:
        typeof items[0].product_id === "string"
          ? items[0].product_id.length
          : null,
    }
  );

  let localProductId: string;

  try {
    localProductId = requireUuid(
      items[0].product_id
    );
  } catch {
    throw new Error(
      "Invalid Supabase order item product ID."
    );
  }

  const {
    data: localProduct,
    error: productError,
  } = await admin
    .from("products")
    .select("id,creem_product_id")
    .eq("id", localProductId)
    .maybeSingle();

  if (productError || !localProduct) {
    throw new Error(
      "Original Embernix product not found."
    );
  }

  const localCreemProductId =
    localProduct.creem_product_id;

  if (
    typeof localCreemProductId !== "string" ||
    !localCreemProductId
  ) {
    throw new Error(
      "Product is not connected to Creem."
    );
  }

  const checkout = await retrieveCheckout(
    eventCheckoutId
  );

  const checkoutId = str(checkout, "id");
  const requestId = str(checkout, "request_id");
  const checkoutStatus = str(checkout, "status");

  const creemOrder = record(checkout, "order");
  const creemProduct = record(checkout, "product");
  const creemCustomer = record(checkout, "customer");

  if (
    !checkoutId ||
    !requestId ||
    checkoutStatus !== "completed" ||
    !creemOrder ||
    !creemProduct ||
    !creemCustomer
  ) {
    throw new Error(
      "Verified checkout has missing fields."
    );
  }

  const creemOrderId = str(creemOrder, "id");
  const orderStatus = str(creemOrder, "status");
  const orderType = str(creemOrder, "type");

  const orderProductId = getNestedId(
    creemOrder,
    "product"
  );

  const creemProductId = str(
    creemProduct,
    "id"
  );

  const billingType = str(
    creemProduct,
    "billing_type"
  );

  const creemCustomerId = str(
    creemCustomer,
    "id"
  );

  const customerEmail = str(
    creemCustomer,
    "email"
  );

  if (
    !creemOrderId ||
    orderStatus !== "paid" ||
    !creemProductId ||
    !creemCustomerId ||
    !customerEmail
  ) {
    throw new Error(
      "Creem checkout is missing paid order information."
    );
  }

  if (
    billingType !== "onetime" ||
    (orderType &&
      orderType !== "onetime" &&
      orderType !== "one_time")
  ) {
    throw new Error(
      "Recurring products cannot be fulfilled here."
    );
  }

  if (
    requestId !== orderNumber ||
    checkoutId !== localOrder.creem_checkout_id ||
    creemProductId !== localCreemProductId ||
    (orderProductId &&
      orderProductId !== creemProductId)
  ) {
    throw new Error(
      "Verified checkout does not match original purchase."
    );
  }

  const metadata = record(checkout, "metadata");

  if (metadata) {
    const metadataOrderNumber = str(
      metadata,
      "orderNumber"
    );

    const metadataUserId = str(
      metadata,
      "userId"
    );

    const metadataProductId = str(
      metadata,
      "productId"
    );

    if (
      (metadataOrderNumber &&
        metadataOrderNumber !== orderNumber) ||
      (metadataUserId &&
        metadataUserId !== localUserId) ||
      (metadataProductId &&
        metadataProductId !== localProductId)
    ) {
      throw new Error(
        "Verified checkout metadata does not match original order."
      );
    }
  }

  if (
    localOrder.customer_email &&
    localOrder.customer_email.trim().toLowerCase() !==
      customerEmail.trim().toLowerCase()
  ) {
    throw new Error(
      "Verified checkout customer email mismatch."
    );
  }

  const orderCustomerId = getNestedId(
    creemOrder,
    "customer"
  );

  if (
    orderCustomerId &&
    orderCustomerId !== creemCustomerId
  ) {
    throw new Error(
      "Creem order customer mismatch."
    );
  }

  const subtotalCents = amount(
    creemOrder,
    "sub_total"
  );

  const discountCents = amount(
    creemOrder,
    "discount_amount"
  );

  const taxCents = amount(
    creemOrder,
    "tax_amount"
  );

  const amountPaidCents = amount(
    creemOrder,
    "amount_paid"
  );

  const currency = str(
    creemOrder,
    "currency"
  );

  if (
    subtotalCents === null ||
    discountCents === null ||
    taxCents === null ||
    amountPaidCents === null ||
    !currency
  ) {
    console.error(
      "Creem payment accounting fields:",
      {
        checkoutId,
        orderFields: Object.keys(creemOrder),
      }
    );

    throw new Error(
      "Creem did not provide complete payment accounting."
    );
  }

  const {
    data: result,
    error: fulfillmentError,
  } = await admin.rpc(
    "complete_creem_product_checkout_v2",
    {
      p_event_id: event.id,
      p_checkout_id: checkoutId,
      p_order_number: orderNumber,
      p_creem_order_id: creemOrderId,
      p_creem_customer_id: creemCustomerId,
      p_creem_product_id: creemProductId,
      p_user_id: localUserId,
      p_subtotal_cents: subtotalCents,
      p_discount_cents: discountCents,
      p_tax_cents: taxCents,
      p_amount_paid_cents: amountPaidCents,
      p_currency: currency,
    }
  );

  if (fulfillmentError) {
    console.error(
      "Creem payment reconciliation failed:",
      fulfillmentError
    );

    throw new Error(
      "Unable to reconcile and fulfill purchase."
    );
  }

  if (
    result !== "completed" &&
    result !== "duplicate" &&
    result !== "already_paid"
  ) {
    throw new Error(
      "Unexpected fulfillment result."
    );
  }

  return result;
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.CREEM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "CREEM_WEBHOOK_SECRET is missing."
    );

    return NextResponse.json(
      { error: "Webhook unavailable." },
      { status: 503 }
    );
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Unable to read request." },
      { status: 400 }
    );
  }

  if (rawBody.length > 1024 * 1024) {
    return NextResponse.json(
      { error: "Webhook payload too large." },
      { status: 413 }
    );
  }

  const signature = request.headers.get(
    "creem-signature"
  );

  if (
    !verifySignature(
      rawBody,
      signature,
      webhookSecret
    )
  ) {
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 401 }
    );
  }

  let event: CreemEvent;

  try {
    event = parseEvent(
      JSON.parse(rawBody)
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook event." },
      { status: 400 }
    );
  }

  try {
    if (event.eventType === "checkout.completed") {
      const result = await completeCheckout(event);

      return NextResponse.json({
        received: true,
        result,
      });
    }

    if (
      event.eventType === "refund.created" ||
      event.eventType === "dispute.created"
    ) {
      console.error(
        "Creem payment reversal requires review:",
        {
          eventId: event.id,
          eventType: event.eventType,
        }
      );

      return NextResponse.json({
        received: true,
        handled: false,
      });
    }

    return NextResponse.json({
      received: true,
      handled: false,
    });
  } catch (error) {
    console.error(
      "Creem webhook processing failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Payment verification or fulfillment failed.",
      },
      { status: 500 }
    );
  }
}
