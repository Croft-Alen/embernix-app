import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getCreemTransaction } from "@/lib/creem/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Data = Record<string, unknown>;

function asObject(value: unknown): Data | null {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Data)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function cents(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function idOf(value: unknown): string | null {
  return text(value) ?? text(asObject(value)?.id);
}

function validSignature(
  raw: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(raw, "utf8")
    .digest();

  return timingSafeEqual(
    expected,
    Buffer.from(signature, "hex")
  );
}

async function getCheckout(checkoutId: string): Promise<Data> {
  const key = process.env.CREEM_API_KEY;
  const environment = process.env.CREEM_ENVIRONMENT;

  if (
    !key ||
    (environment !== "test" && environment !== "production")
  ) {
    throw new Error("Creem API configuration is incomplete.");
  }

  const baseUrl =
    environment === "test"
      ? "https://test-api.creem.io"
      : "https://api.creem.io";

  const url = new URL("/v1/checkouts", baseUrl);
  url.searchParams.set("checkout_id", checkoutId);

  const response = await fetch(url, {
    headers: {
      "x-api-key": key,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `Creem checkout verification failed (${response.status}).`
    );
  }

  const checkout = asObject(await response.json());

  if (
    !checkout ||
    checkout.id !== checkoutId ||
    checkout.status !== "completed"
  ) {
    throw new Error("Checkout has not been completed.");
  }

  const expectedMode =
    environment === "test" ? "test" : "prod";

  if (
    checkout.mode &&
    checkout.mode !== expectedMode &&
    checkout.mode !== environment
  ) {
    throw new Error("Creem environment mismatch.");
  }

  return checkout;
}

type PaymentTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  paid: number;
};

async function verifyPaymentTotals(input: {
  checkout: Data;
  order: Data;
  orderId: string;
  customerId: string;
  currency: string;
  localSubtotal: number;
  localDiscount: number;
}): Promise<PaymentTotals> {
  const {
    checkout,
    order,
    orderId,
    customerId,
    currency,
    localSubtotal,
    localDiscount,
  } = input;

  if (
    !Number.isSafeInteger(localSubtotal) ||
    localSubtotal <= 0 ||
    !Number.isSafeInteger(localDiscount) ||
    localDiscount < 0 ||
    localDiscount > localSubtotal
  ) {
    throw new Error("Invalid original order accounting.");
  }

  const transactionId =
    idOf(order.transaction) ??
    idOf(checkout.transaction);

  if (transactionId) {
    const transaction = await getCreemTransaction(transactionId);

    if (
      transaction.orderId !== orderId ||
      (transaction.customerId &&
        transaction.customerId !== customerId) ||
      transaction.currency !== currency ||
      transaction.status !== "paid" ||
      transaction.type !== "payment"
    ) {
      throw new Error("Creem transaction does not match the order.");
    }

    const discount = transaction.discountAmount;
    const tax = transaction.taxAmount;
    const paid = transaction.amountPaid;

    if (discount !== localDiscount) {
      throw new Error("Creem discount mismatch.");
    }

    const expectedPaid = localSubtotal - discount + tax;

    if (
      !Number.isSafeInteger(expectedPaid) ||
      expectedPaid < 0 ||
      expectedPaid !== paid
    ) {
      throw new Error("Creem transaction total mismatch.");
    }

    const expectedNet = localSubtotal - discount;

    if (
      transaction.amount !== localSubtotal &&
      transaction.amount !== expectedNet
    ) {
      throw new Error("Creem transaction amount mismatch.");
    }

    const checkoutAmount = cents(order.amount);

    if (
      checkoutAmount !== null &&
      checkoutAmount !== localSubtotal &&
      checkoutAmount !== expectedNet
    ) {
      throw new Error("Creem order amount mismatch.");
    }

    return {
      subtotal: localSubtotal,
      discount,
      tax,
      paid,
    };
  }

  if (localDiscount !== 0) {
    throw new Error(
      "Discounted checkout requires a verified Creem transaction."
    );
  }

  const checkoutAmount = cents(order.amount);
  const orderDiscount = cents(order.discount_amount);
  const orderTax = cents(order.tax_amount);
  const orderPaid = cents(order.amount_paid);

  if (
    checkoutAmount !== localSubtotal ||
    (orderDiscount !== null && orderDiscount !== 0) ||
    (orderTax !== null && orderTax !== 0) ||
    (orderPaid !== null && orderPaid !== localSubtotal)
  ) {
    throw new Error(
      "Checkout requires complete transaction details."
    );
  }

  return {
    subtotal: localSubtotal,
    discount: 0,
    tax: 0,
    paid: localSubtotal,
  };
}

async function fulfill(
  eventId: string,
  checkoutId: string
): Promise<string> {
  const admin = createAdminClient();

  const { data: localOrder, error: orderError } = await admin
    .from("orders")
    .select(
      "id,user_id,order_number,customer_email,currency,subtotal_cents,creem_discount_cents,creem_checkout_id"
    )
    .eq("creem_checkout_id", checkoutId)
    .maybeSingle();

  if (orderError || !localOrder) {
    throw new Error("Original Embernix order not found.");
  }

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("product_id,item_type,quantity,unit_price_cents")
    .eq("order_id", localOrder.id);

  if (
    itemsError ||
    !items ||
    items.length !== 1 ||
    items[0].item_type !== "product" ||
    Number(items[0].quantity) !== 1 ||
    Number(items[0].unit_price_cents) !==
      Number(localOrder.subtotal_cents)
  ) {
    throw new Error("Original order items do not match.");
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id,creem_product_id")
    .eq("id", items[0].product_id)
    .maybeSingle();

  if (productError || !product?.creem_product_id) {
    throw new Error("Creem product mapping is missing.");
  }

  const checkout = await getCheckout(checkoutId);
  const order = asObject(checkout.order);
  const checkoutProduct = asObject(checkout.product);
  const customer = asObject(checkout.customer);

  if (!order || !checkoutProduct || !customer) {
    throw new Error(
      "Completed checkout is missing purchase details."
    );
  }

  const orderId = text(order.id);
  const creemProductId = text(checkoutProduct.id);
  const customerId = text(customer.id);
  const customerEmail = text(customer.email);
  const currency = text(order.currency)?.toUpperCase();
  const billingType = text(checkoutProduct.billing_type);
  const orderType = text(order.type);

  if (
    !orderId ||
    !creemProductId ||
    !customerId ||
    !customerEmail ||
    !currency ||
    order.status !== "paid" ||
    billingType !== "onetime" ||
    (orderType &&
      orderType !== "onetime" &&
      orderType !== "one_time")
  ) {
    throw new Error(
      "Creem has not verified a one-time paid order."
    );
  }

  if (
    checkout.request_id !== localOrder.order_number ||
    checkoutId !== localOrder.creem_checkout_id ||
    creemProductId !== product.creem_product_id ||
    (idOf(order.product) &&
      idOf(order.product) !== creemProductId) ||
    (idOf(order.customer) &&
      idOf(order.customer) !== customerId) ||
    currency !== String(localOrder.currency).toUpperCase()
  ) {
    throw new Error(
      "Creem checkout does not match the local order."
    );
  }

  if (
    localOrder.customer_email &&
    localOrder.customer_email.toLowerCase() !==
      customerEmail.toLowerCase()
  ) {
    throw new Error("Customer email mismatch.");
  }

  const metadata = asObject(checkout.metadata);

  if (
    metadata &&
    ((text(metadata.orderNumber) &&
      metadata.orderNumber !== localOrder.order_number) ||
      (text(metadata.userId) &&
        metadata.userId !== localOrder.user_id) ||
      (text(metadata.productId) &&
        metadata.productId !== product.id))
  ) {
    throw new Error("Checkout metadata mismatch.");
  }

  const verified = await verifyPaymentTotals({
    checkout,
    order,
    orderId,
    customerId,
    currency,
    localSubtotal: Number(localOrder.subtotal_cents),
    localDiscount: Number(localOrder.creem_discount_cents),
  });

  const { data: result, error: fulfillmentError } =
    await admin.rpc("complete_creem_product_checkout_v2", {
      p_event_id: eventId,
      p_checkout_id: checkoutId,
      p_order_number: localOrder.order_number,
      p_creem_order_id: orderId,
      p_creem_customer_id: customerId,
      p_creem_product_id: creemProductId,
      p_user_id: localOrder.user_id,
      p_subtotal_cents: verified.subtotal,
      p_discount_cents: verified.discount,
      p_tax_cents: verified.tax,
      p_amount_paid_cents: verified.paid,
      p_currency: currency,
    });

  if (fulfillmentError) {
    console.error(
      "Creem fulfillment database error:",
      fulfillmentError
    );

    throw new Error("Database fulfillment failed.");
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
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 }
    );
  }

  const raw = await request.text();

  if (Buffer.byteLength(raw, "utf8") > 1024 * 1024) {
    return NextResponse.json(
      { error: "Webhook too large." },
      { status: 413 }
    );
  }

  if (
    !validSignature(
      raw,
      request.headers.get("creem-signature"),
      secret
    )
  ) {
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 401 }
    );
  }

  let event: Data | null;

  try {
    event = asObject(JSON.parse(raw));
  } catch {
    event = null;
  }

  if (
    !event ||
    !text(event.id) ||
    !text(event.eventType) ||
    !asObject(event.object)
  ) {
    return NextResponse.json(
      { error: "Invalid webhook event." },
      { status: 400 }
    );
  }

  if (event.eventType !== "checkout.completed") {
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
    }

    return NextResponse.json({
      received: true,
      handled: false,
    });
  }

  try {
    const payload = event.object as Data;
    const checkoutId = text(payload.id);

    if (!checkoutId) {
      throw new Error("Missing checkout ID.");
    }

    const result = await fulfill(
      event.id as string,
      checkoutId
    );

    return NextResponse.json({
      received: true,
      result,
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