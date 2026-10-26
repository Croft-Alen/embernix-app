import { createHmac, timingSafeEqual } from "node:crypto";
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

type CreemConfig = {
  apiKey: string;
  baseUrl: string;
  environment: "test" | "production";
};

type PaymentAccounting = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  amountPaidCents: number;
  currency: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function money(
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

function nestedId(
  source: JsonRecord,
  key: string
): string | null {
  const value = source[key];

  if (typeof value === "string") {
    return value.trim() || null;
  }

  return isRecord(value)
    ? str(value, "id")
    : null;
}

function requireUuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !uuidPattern.test(value)
  ) {
    throw new Error("Invalid local purchase identifier.");
  }

  return value;
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
    throw new Error("Invalid webhook payload.");
  }

  const id = str(payload, "id");
  const eventType = str(payload, "eventType");
  const object = record(payload, "object");

  if (!id || !eventType || !object) {
    throw new Error("Missing webhook event information.");
  }

  return { id, eventType, object };
}

function creemConfig(): CreemConfig {
  const apiKey = process.env.CREEM_API_KEY;
  const environment =
    process.env.CREEM_ENVIRONMENT?.toLowerCase();

  if (!apiKey) {
    throw new Error("CREEM_API_KEY is missing.");
  }

  if (
    environment !== "test" &&
    environment !== "production"
  ) {
    throw new Error("Invalid CREEM_ENVIRONMENT.");
  }

  return {
    apiKey,
    environment,
    baseUrl:
      environment === "test"
        ? "https://test-api.creem.io"
        : "https://api.creem.io",
  };
}

async function creemGet(
  config: CreemConfig,
  path: string,
  parameters: Record<string, string>
): Promise<JsonRecord> {
  const url = new URL(path, config.baseUrl);

  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }

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
    console.error("Creem API request failed:", {
      path,
      status: response.status,
    });

    throw new Error("Unable to verify payment with Creem.");
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error("Invalid Creem API response.");
  }

  return data;
}

function verifyMode(
  source: JsonRecord,
  config: CreemConfig
): void {
  const mode = str(source, "mode");

  if (
    mode &&
    mode !== (config.environment === "test" ? "test" : "prod") &&
    mode !== config.environment
  ) {
    throw new Error("Creem environment mismatch.");
  }
}

async function retrieveCheckout(
  config: CreemConfig,
  checkoutId: string
): Promise<JsonRecord> {
  const checkout = await creemGet(
    config,
    "/v1/checkouts",
    { checkout_id: checkoutId }
  );

  verifyMode(checkout, config);

  if (
    str(checkout, "id") !== checkoutId ||
    str(checkout, "status") !== "completed"
  ) {
    throw new Error("Checkout is not verified as completed.");
  }

  return checkout;
}

async function retrieveTransaction(
  config: CreemConfig,
  creemOrderId: string,
  creemCustomerId: string,
  transactionId: string | null
): Promise<JsonRecord> {
  if (transactionId) {
    const transaction = await creemGet(
      config,
      "/v1/transactions",
      { transaction_id: transactionId }
    );

    if (str(transaction, "id") !== transactionId) {
      throw new Error("Creem transaction ID mismatch.");
    }

    return transaction;
  }

  const response = await creemGet(
    config,
    "/v1/transactions/search",
    {
      order_id: creemOrderId,
      page_number: "1",
      page_size: "100",
    }
  );

  const collection = Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.transactions)
      ? response.transactions
      : null;

  if (!collection) {
    throw new Error(
      "Creem transaction search returned an unsupported response."
    );
  }

  const matching = collection.filter((item) => {
    if (!isRecord(item)) {
      return false;
    }

    return (
      nestedId(item, "order") === creemOrderId &&
      nestedId(item, "customer") === creemCustomerId &&
      str(item, "status") === "paid"
    );
  });

  if (matching.length !== 1) {
    throw new Error(
      "Unable to identify exactly one paid Creem transaction."
    );
  }

  const match = matching[0] as JsonRecord;
  const matchId = str(match, "id");

  if (!matchId) {
    throw new Error("Creem transaction ID is missing.");
  }

  const transaction = await creemGet(
    config,
    "/v1/transactions",
    { transaction_id: matchId }
  );

  if (str(transaction, "id") !== matchId) {
    throw new Error("Creem transaction ID mismatch.");
  }

  return transaction;
}

function verifiedAccounting(
  transaction: JsonRecord,
  order: JsonRecord
): PaymentAccounting {
  const subtotalCents = money(transaction, "amount");
  const discountCents = money(
    transaction,
    "discount_amount"
  );
  const taxCents = money(transaction, "tax_amount");
  const amountPaidCents = money(
    transaction,
    "amount_paid"
  );

  const currency = str(transaction, "currency");
  const orderCurrency = str(order, "currency");

  if (
    subtotalCents === null ||
    discountCents === null ||
    taxCents === null ||
    amountPaidCents === null ||
    !currency ||
    !orderCurrency
  ) {
    throw new Error(
      "Creem transaction contains incomplete payment accounting."
    );
  }

  if (currency.toUpperCase() !== orderCurrency.toUpperCase()) {
    throw new Error("Creem payment currency mismatch.");
  }

  if (
    subtotalCents - discountCents + taxCents !==
    amountPaidCents
  ) {
    throw new Error("Creem payment totals do not reconcile.");
  }

  const orderAmount = money(order, "amount");
  const orderSubtotal = money(order, "sub_total");
  const orderDiscount = money(order, "discount_amount");
  const orderTax = money(order, "tax_amount");
  const orderPaid = money(order, "amount_paid");

  if (
    (orderAmount !== null &&
      orderAmount !== subtotalCents) ||
    (orderSubtotal !== null &&
      orderSubtotal !== subtotalCents) ||
    (orderDiscount !== null &&
      orderDiscount !== discountCents) ||
    (orderTax !== null &&
      orderTax !== taxCents) ||
    (orderPaid !== null &&
      orderPaid !== amountPaidCents)
  ) {
    throw new Error(
      "Creem order and transaction amounts disagree."
    );
  }

  return {
    subtotalCents,
    discountCents,
    taxCents,
    amountPaidCents,
    currency: currency.toUpperCase(),
  };
}

async function completeCheckout(
  event: CreemEvent
): Promise<string> {
  const checkoutId = str(event.object, "id");

  if (!checkoutId) {
    throw new Error("Webhook checkout ID is missing.");
  }

  const admin = createAdminClient();

  const { data: localOrder, error: orderError } =
    await admin
      .from("orders")
      .select(
        "id,user_id,order_number,customer_email,creem_checkout_id"
      )
      .eq("creem_checkout_id", checkoutId)
      .maybeSingle();

  if (orderError) {
    console.error("Supabase order lookup failed:", orderError);
    throw new Error("Unable to retrieve original order.");
  }

  if (!localOrder) {
    throw new Error("Original Embernix order not found.");
  }

  const localOrderId = requireUuid(localOrder.id);
  const localUserId = requireUuid(localOrder.user_id);
  const orderNumber = localOrder.order_number;

  if (
    typeof orderNumber !== "string" ||
    !orderNumber.trim()
  ) {
    throw new Error("Invalid Embernix order number.");
  }

  const { data: items, error: itemsError } =
    await admin
      .from("order_items")
      .select("product_id")
      .eq("order_id", localOrderId);

  if (itemsError) {
    console.error("Supabase order items lookup failed:", itemsError);
    throw new Error("Unable to retrieve order items.");
  }

  if (!items || items.length !== 1) {
    throw new Error(
      "Expected exactly one product in the original order."
    );
  }

  const localProductId = requireUuid(items[0].product_id);

  const { data: localProduct, error: productError } =
    await admin
      .from("products")
      .select("id,creem_product_id")
      .eq("id", localProductId)
      .maybeSingle();

  if (productError || !localProduct) {
    throw new Error("Original Embernix product not found.");
  }

  const localCreemProductId =
    localProduct.creem_product_id;

  if (
    typeof localCreemProductId !== "string" ||
    !localCreemProductId
  ) {
    throw new Error("Product is not connected to Creem.");
  }

  const config = creemConfig();
  const checkout = await retrieveCheckout(config, checkoutId);

  const requestId = str(checkout, "request_id");
  const creemOrder = record(checkout, "order");
  const creemProduct = record(checkout, "product");
  const creemCustomer = record(checkout, "customer");

  if (
    requestId !== orderNumber ||
    !creemOrder ||
    !creemProduct ||
    !creemCustomer
  ) {
    throw new Error(
      "Completed checkout does not match original order."
    );
  }

  const creemOrderId = str(creemOrder, "id");
  const creemOrderStatus = str(creemOrder, "status");
  const orderType = str(creemOrder, "type");
  const orderProductId = nestedId(creemOrder, "product");

  const creemProductId = str(creemProduct, "id");
  const billingType = str(creemProduct, "billing_type");

  const creemCustomerId = str(creemCustomer, "id");
  const customerEmail = str(creemCustomer, "email");

  if (
    !creemOrderId ||
    creemOrderStatus !== "paid" ||
    !creemProductId ||
    !creemCustomerId ||
    !customerEmail
  ) {
    throw new Error(
      "Completed checkout has missing paid order information."
    );
  }

  if (
    billingType !== "onetime" ||
    (orderType &&
      orderType !== "onetime" &&
      orderType !== "one_time")
  ) {
    throw new Error(
      "Recurring purchases are not supported here."
    );
  }

  if (
    creemProductId !== localCreemProductId ||
    (orderProductId &&
      orderProductId !== creemProductId)
  ) {
    throw new Error("Creem product mapping mismatch.");
  }

  const checkoutUnits = money(checkout, "units");

  if (checkoutUnits !== null && checkoutUnits !== 1) {
    throw new Error("Unexpected checkout quantity.");
  }

  const metadata = record(checkout, "metadata");

  if (metadata) {
    const metadataOrderNumber = str(
      metadata,
      "orderNumber"
    );
    const metadataUserId = str(metadata, "userId");
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
      throw new Error("Creem metadata mismatch.");
    }
  }

  if (
    localOrder.customer_email &&
    localOrder.customer_email.trim().toLowerCase() !==
      customerEmail.toLowerCase()
  ) {
    throw new Error("Checkout customer email mismatch.");
  }

  const orderCustomerId = nestedId(
    creemOrder,
    "customer"
  );

  if (
    orderCustomerId &&
    orderCustomerId !== creemCustomerId
  ) {
    throw new Error("Creem order customer mismatch.");
  }

  const transactionId = nestedId(
    creemOrder,
    "transaction"
  );

  const transaction = await retrieveTransaction(
    config,
    creemOrderId,
    creemCustomerId,
    transactionId
  );

  verifyMode(transaction, config);

  if (
    str(transaction, "status") !== "paid" ||
    str(transaction, "type") !== "payment" ||
    nestedId(transaction, "order") !== creemOrderId ||
    nestedId(transaction, "customer") !== creemCustomerId
  ) {
    throw new Error(
      "Creem transaction is not a verified one-time payment."
    );
  }

  const refundedAmount = transaction.refunded_amount;

  if (
    refundedAmount !== null &&
    refundedAmount !== undefined &&
    refundedAmount !== 0
  ) {
    throw new Error(
      "Creem transaction has a refund."
    );
  }

  const accounting = verifiedAccounting(
    transaction,
    creemOrder
  );

  const productCurrency = str(
    creemProduct,
    "currency"
  );

  if (
    productCurrency &&
    productCurrency.toUpperCase() !== accounting.currency
  ) {
    throw new Error(
      "Creem product and payment currencies disagree."
    );
  }

  const { data: result, error: fulfillmentError } =
    await admin.rpc(
      "complete_creem_product_checkout_v2",
      {
        p_event_id: event.id,
        p_checkout_id: checkoutId,
        p_order_number: orderNumber,
        p_creem_order_id: creemOrderId,
        p_creem_customer_id: creemCustomerId,
        p_creem_product_id: creemProductId,
        p_user_id: localUserId,
        p_subtotal_cents: accounting.subtotalCents,
        p_discount_cents: accounting.discountCents,
        p_tax_cents: accounting.taxCents,
        p_amount_paid_cents: accounting.amountPaidCents,
        p_currency: accounting.currency,
      }
    );

  if (fulfillmentError) {
    console.error(
      "Creem payment fulfillment failed:",
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
    throw new Error("Unexpected fulfillment result.");
  }

  return result;
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.CREEM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CREEM_WEBHOOK_SECRET is missing.");

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

  if (Buffer.byteLength(rawBody, "utf8") > 1024 * 1024) {
    return NextResponse.json(
      { error: "Webhook payload too large." },
      { status: 413 }
    );
  }

  const signature = request.headers.get(
    "creem-signature"
  );

  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 401 }
    );
  }

  let event: CreemEvent;

  try {
    event = parseEvent(JSON.parse(rawBody));
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
        error: "Payment verification or fulfillment failed.",
      },
      { status: 500 }
    );
  }
}
