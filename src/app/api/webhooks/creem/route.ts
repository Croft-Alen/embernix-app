
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
    ? value
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

  const expected = createHmac(
    "sha256",
    secret
  )
    .update(body, "utf8")
    .digest();

  const received = Buffer.from(
    signature,
    "hex"
  );

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

  return { id, eventType, object };
}

async function completeCheckout(
  event: CreemEvent
): Promise<string> {
  const checkout = event.object;

  const checkoutId = str(checkout, "id");
  const requestId = str(checkout, "request_id");
  const checkoutStatus = str(checkout, "status");

  const order = record(checkout, "order");
  const product = record(checkout, "product");
  const customer = record(checkout, "customer");
  const metadata = record(checkout, "metadata");

  if (
    !checkoutId ||
    !requestId ||
    checkoutStatus !== "completed" ||
    !order ||
    !product ||
    !customer ||
    !metadata
  ) {
    throw new Error(
      "Completed checkout has missing fields."
    );
  }

  const creemOrderId = str(order, "id");
  const orderStatus = str(order, "status");
  const orderType = str(order, "type");
  const orderProductId = str(order, "product");

  const creemProductId = str(product, "id");
  const billingType = str(product, "billing_type");

  const creemCustomerId = str(customer, "id");
  const customerEmail = str(customer, "email");

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
    !creemOrderId ||
    orderStatus !== "paid" ||
    !creemProductId ||
    !creemCustomerId ||
    !customerEmail ||
    !metadataOrderNumber ||
    !metadataUserId ||
    !metadataProductId
  ) {
    throw new Error(
      "Missing paid order information."
    );
  }

  // Only one-time digital product purchases are
  // supported by this fulfillment function.
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
    requestId !== metadataOrderNumber ||
    (orderProductId &&
      orderProductId !== creemProductId)
  ) {
    throw new Error(
      "Checkout product or order reference mismatch."
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    !uuidPattern.test(metadataUserId) ||
    !uuidPattern.test(metadataProductId)
  ) {
    throw new Error(
      "Invalid Embernix purchase identifiers."
    );
  }

  // Creem's monetary values use minor units.
  const subtotalCents = amount(
    order,
    "sub_total"
  );
  const discountCents = amount(
    order,
    "discount_amount"
  );
  const taxCents = amount(
    order,
    "tax_amount"
  );
  const amountPaidCents = amount(
    order,
    "amount_paid"
  );
  const currency = str(order, "currency");

  if (
    subtotalCents === null ||
    discountCents === null ||
    taxCents === null ||
    amountPaidCents === null ||
    !currency
  ) {
    throw new Error(
      "Creem did not provide complete payment accounting."
    );
  }

  const admin = createAdminClient();

  // Match product mapping to the original
  // Embernix product identifier.
  const {
    data: localProduct,
    error: productError,
  } = await admin
    .from("products")
    .select("id")
    .eq("id", metadataProductId)
    .eq("creem_product_id", creemProductId)
    .maybeSingle();

  if (productError || !localProduct) {
    throw new Error(
      "Creem product mapping mismatch."
    );
  }

  // Confirm the Creem checkout belongs to
  // the same Embernix customer and order.
  const {
    data: localOrder,
    error: orderError,
  } = await admin
    .from("orders")
    .select(
      "id,user_id,order_number,customer_email,creem_checkout_id"
    )
    .eq("order_number", requestId)
    .eq("user_id", metadataUserId)
    .eq("creem_checkout_id", checkoutId)
    .maybeSingle();

  if (orderError || !localOrder) {
    throw new Error(
      "Local checkout order mismatch."
    );
  }

  if (
    localOrder.customer_email &&
    localOrder.customer_email.toLowerCase() !==
      customerEmail.toLowerCase()
  ) {
    throw new Error(
      "Checkout customer email mismatch."
    );
  }

  // The database function verifies all amounts,
  // currency, order contents, and event idempotency
  // in one transaction before granting ownership.
  const {
    data: result,
    error: fulfillmentError,
  } = await admin.rpc(
    "complete_creem_product_checkout_v2",
    {
      p_event_id: event.id,
      p_checkout_id: checkoutId,
      p_order_number: requestId,
      p_creem_order_id: creemOrderId,
      p_creem_customer_id: creemCustomerId,
      p_creem_product_id: creemProductId,
      p_user_id: metadataUserId,
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

    // These events must be addressed before
    // enabling production sales. Acknowledge them
    // without making an unverified state change.
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

    // Let Creem retry a failed fulfillment.
    return NextResponse.json(
      {
        error:
          "Payment verification or fulfillment failed.",
      },
      { status: 500 }
    );
  }
}
