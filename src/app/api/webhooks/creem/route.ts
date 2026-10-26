import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
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

  if (!key || !["test", "production"].includes(environment ?? "")) {
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

  const expectedMode = environment === "test" ? "test" : "prod";

  if (
    checkout.mode &&
    checkout.mode !== expectedMode &&
    checkout.mode !== environment
  ) {
    throw new Error("Creem environment mismatch.");
  }

  return checkout;
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
    throw new Error("Completed checkout is missing purchase details.");
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
    throw new Error("Creem has not verified a one-time paid order.");
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
    throw new Error("Creem checkout does not match the local order.");
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

  const subtotal = Number(localOrder.subtotal_cents);
  const localDiscount = Number(
    localOrder.creem_discount_cents
  );

  const creemAmount = cents(order.amount);
  const creemDiscount = cents(order.discount_amount);
  const creemTax = cents(order.tax_amount);
  const creemPaid = cents(order.amount_paid);

  if (
    !Number.isSafeInteger(subtotal) ||
    subtotal <= 0 ||
    !Number.isSafeInteger(localDiscount) ||
    localDiscount < 0 ||
    localDiscount > subtotal ||
    creemAmount === null ||
    creemAmount !== subtotal
  ) {
    throw new Error("Creem base price mismatch.");
  }

  let discount: number;
  let tax: number;
  let paid: number;

  if (
    creemPaid !== null &&
    creemDiscount !== null
  ) {
    discount = creemDiscount;
    paid = creemPaid;

    const calculatedTax =
      paid - subtotal + discount;

    if (
      !Number.isSafeInteger(calculatedTax) ||
      calculatedTax < 0 ||
      (creemTax !== null && creemTax !== calculatedTax)
    ) {
      throw new Error("Creem payment totals do not reconcile.");
    }

    tax = calculatedTax;
  } else {
    if (
      localDiscount !== 0 ||
      creemDiscount !== null && creemDiscount !== 0 ||
      creemTax !== null && creemTax !== 0 ||
      creemPaid !== null && creemPaid !== subtotal
    ) {
      throw new Error(
        "Coupon or tax checkout requires complete paid amount details."
      );
    }

    discount = 0;
    tax = 0;
    paid = creemAmount;
  }

  if (discount !== localDiscount) {
    throw new Error("Creem discount mismatch.");
  }

  const { data: result, error: fulfillmentError } =
    await admin.rpc("complete_creem_product_checkout_v2", {
      p_event_id: eventId,
      p_checkout_id: checkoutId,
      p_order_number: localOrder.order_number,
      p_creem_order_id: orderId,
      p_creem_customer_id: customerId,
      p_creem_product_id: creemProductId,
      p_user_id: localOrder.user_id,
      p_subtotal_cents: subtotal,
      p_discount_cents: discount,
      p_tax_cents: tax,
      p_amount_paid_cents: paid,
      p_currency: currency,
    });

  if (fulfillmentError) {
    console.error("Creem fulfillment database error:", fulfillmentError);
    throw new Error("Database fulfillment failed.");
  }

  if (!["completed", "duplicate", "already_paid"].includes(result)) {
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
      console.error("Creem payment reversal needs review:", {
        eventId: event.id,
        eventType: event.eventType,
      });
    }

    return NextResponse.json({
      received: true,
      handled: false,
    });
  }

  try {
    const checkout = event.object as Data;
    const checkoutId = text(checkout.id);

    if (!checkoutId) {
      throw new Error("Missing Creem checkout ID.");
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
    console.error("Creem webhook processing failed:", error);

    return NextResponse.json(
      { error: "Payment verification or fulfillment failed." },
      { status: 500 }
    );
  }
}
