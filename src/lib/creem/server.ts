
import "server-only";

type RecordData = Record<string, unknown>;

function record(value: unknown): RecordData | null {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as RecordData)
    : null;
}

function requiredText(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Creem ${name} is missing.`);
  }

  return value.trim();
}

function nonnegativeInteger(
  value: unknown,
  name: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`Invalid Creem ${name}.`);
  }

  return value;
}

function baseUrl(): string {
  if (process.env.CREEM_ENVIRONMENT === "test") {
    return "https://test-api.creem.io";
  }

  if (process.env.CREEM_ENVIRONMENT === "production") {
    return "https://api.creem.io";
  }

  throw new Error(
    "CREEM_ENVIRONMENT must be test or production."
  );
}

async function creemRequest(
  path: string,
  init: RequestInit = {}
): Promise<RecordData> {
  const key = process.env.CREEM_API_KEY;

  if (!key) {
    throw new Error(
      "CREEM_API_KEY is not configured."
    );
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "x-api-key": key,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const payload: unknown =
    await response.json().catch(() => null);

  if (!response.ok) {
    const expectedMissingDiscount =
      response.status === 404 &&
      path.startsWith("/v1/discounts?");

    if (!expectedMissingDiscount) {
      console.error("Creem request failed:", {
        path,
        status: response.status,
      });
    }

    throw new Error(
      `Creem API request failed (${response.status}).`
    );
  }

  const data = record(payload);

  if (!data) {
    throw new Error(
      "Creem returned an invalid response."
    );
  }

  return data;
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

export type CreateCreemDiscountInput = {
  name: string;
  code: string;
  type: "percentage" | "fixed";
  percentage?: number;
  amount?: number;
  currency?: string;
  maxRedemptions?: number | null;
  expiryDate?: string | null;
  productIds: string[];
};

function parseDiscount(
  data: RecordData
): CreemDiscount {
  return {
    id: requiredText(data.id, "discount ID"),
    code: requiredText(data.code, "discount code"),
    status:
      typeof data.status === "string"
        ? data.status
        : "unknown",
    type:
      typeof data.type === "string"
        ? data.type
        : "unknown",
    percentage:
      typeof data.percentage === "number"
        ? data.percentage
        : null,
    amount:
      typeof data.amount === "number"
        ? data.amount
        : null,
    currency:
      typeof data.currency === "string"
        ? data.currency
        : null,
    expiryDate:
      typeof data.expiry_date === "string"
        ? data.expiry_date
        : null,
    maxRedemptions:
      typeof data.max_redemptions === "number"
        ? data.max_redemptions
        : null,
    redeemCount:
      typeof data.redeem_count === "number"
        ? data.redeem_count
        : 0,
    products: Array.isArray(
      data.applies_to_products
    )
      ? data.applies_to_products.filter(
          (id): id is string =>
            typeof id === "string"
        )
      : [],
  };
}

export async function createCreemDiscount(
  input: CreateCreemDiscountInput
): Promise<CreemDiscount> {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const productIds = [
    ...new Set(input.productIds),
  ];

  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw new Error("Invalid discount code.");
  }

  if (!name || name.length > 200) {
    throw new Error("Invalid discount name.");
  }

  if (
    !productIds.length ||
    productIds.some(
      (id) =>
        !/^prod_[A-Za-z0-9_-]+$/.test(id)
    )
  ) {
    throw new Error(
      "Valid Creem products are required."
    );
  }

  if (
    input.maxRedemptions != null &&
    (!Number.isSafeInteger(
      input.maxRedemptions
    ) ||
      input.maxRedemptions <= 0)
  ) {
    throw new Error(
      "Invalid redemption limit."
    );
  }

  if (
    input.expiryDate &&
    !Number.isFinite(
      new Date(input.expiryDate).getTime()
    )
  ) {
    throw new Error(
      "Invalid discount expiry."
    );
  }

  if (input.type === "percentage") {
    if (
      input.percentage === undefined ||
      !Number.isInteger(
        input.percentage
      ) ||
      input.percentage < 1 ||
      input.percentage > 100
    ) {
      throw new Error(
        "Invalid percentage discount."
      );
    }
  } else {
    if (
      input.amount === undefined ||
      !Number.isSafeInteger(
        input.amount
      ) ||
      input.amount <= 0 ||
      !input.currency ||
      !/^[A-Z]{3}$/.test(
        input.currency.toUpperCase()
      )
    ) {
      throw new Error(
        "Invalid fixed discount."
      );
    }
  }

  const payload = await creemRequest(
    "/v1/discounts",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        code,
        type: input.type,
        duration: "once",
        applies_to_products: productIds,
        ...(input.type === "percentage"
          ? {
              percentage:
                input.percentage,
            }
          : {
              amount: input.amount,
              currency:
                input.currency?.toUpperCase(),
            }),
        ...(input.maxRedemptions != null
          ? {
              max_redemptions:
                input.maxRedemptions,
            }
          : {}),
        ...(input.expiryDate
          ? {
              expiry_date:
                new Date(
                  input.expiryDate
                ).toISOString(),
            }
          : {}),
      }),
    }
  );

  const discount = parseDiscount(payload);

  if (
    !/^dis_[A-Za-z0-9_-]+$/.test(
      discount.id
    ) ||
    discount.code.toUpperCase() !==
      code
  ) {
    throw new Error(
      "Creem returned an unexpected discount."
    );
  }

  return discount;
}

export async function getCreemDiscountByCode(
  code: string
): Promise<CreemDiscount> {
  const normalized = code
    .trim()
    .toUpperCase();

  if (
    !/^[A-Z0-9]{1,32}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "Invalid discount code."
    );
  }

  const data = await creemRequest(
    `/v1/discounts?discount_code=${encodeURIComponent(
      normalized
    )}`
  );

  return parseDiscount(data);
}

export type CreemTransaction = {
  id: string;
  orderId: string;
  customerId: string | null;
  currency: string;
  status: string;
  type: string;
  amount: number;
  discountAmount: number;
  taxAmount: number;
  amountPaid: number;
};

export async function getCreemTransaction(
  transactionId: string
): Promise<CreemTransaction> {
  if (
    !/^tran_[A-Za-z0-9_-]+$/.test(
      transactionId
    )
  ) {
    throw new Error(
      "Invalid Creem transaction ID."
    );
  }

  const result = await creemRequest(
    `/v1/transactions?transaction_id=${encodeURIComponent(
      transactionId
    )}`
  );

  const id = requiredText(
    result.id,
    "transaction ID"
  );

  if (id !== transactionId) {
    throw new Error(
      "Creem transaction ID mismatch."
    );
  }

  return {
    id,
    orderId: requiredText(
      typeof result.order === "string"
        ? result.order
        : record(result.order)?.id,
      "transaction order"
    ),
    customerId:
      typeof result.customer === "string"
        ? result.customer
        : typeof record(result.customer)?.id ===
            "string"
          ? (record(result.customer)
              ?.id as string)
          : null,
    currency: requiredText(
      result.currency,
      "transaction currency"
    ).toUpperCase(),
    status: requiredText(
      result.status,
      "transaction status"
    ),
    type: requiredText(
      result.type,
      "transaction type"
    ),
    amount: nonnegativeInteger(
      result.amount,
      "amount"
    ),
    discountAmount:
      result.discount_amount == null
        ? 0
        : nonnegativeInteger(
            result.discount_amount,
            "discount amount"
          ),
    taxAmount:
      result.tax_amount == null
        ? 0
        : nonnegativeInteger(
            result.tax_amount,
            "tax amount"
          ),
    amountPaid: nonnegativeInteger(
      result.amount_paid,
      "amount paid"
    ),
  };
}

export async function createCreemCheckout(
  input: {
    productId: string;
    orderNumber: string;
    customerEmail: string;
    successUrl: string;
    metadata: Record<string, string>;
    discountCode?: string | null;
  }
): Promise<{
  id: string;
  checkoutUrl: string;
}> {
  if (
    !/^prod_[A-Za-z0-9_-]+$/.test(
      input.productId
    )
  ) {
    throw new Error(
      "Invalid Creem product ID."
    );
  }

  if (
    !input.orderNumber ||
    !input.customerEmail
  ) {
    throw new Error(
      "Missing checkout information."
    );
  }

  const payload = await creemRequest(
    "/v1/checkouts",
    {
      method: "POST",
      body: JSON.stringify({
        product_id:
          input.productId,
        request_id:
          input.orderNumber,
        units: 1,
        customer: {
          email:
            input.customerEmail,
        },
        success_url:
          input.successUrl,
        metadata:
          input.metadata,
        ...(input.discountCode
          ? {
              discount_code:
                input.discountCode,
            }
          : {}),
      }),
    }
  );

  const id = requiredText(
    payload.id,
    "checkout ID"
  );

  const url = requiredText(
    payload.checkout_url,
    "checkout URL"
  );

  if (
    !/^ch_[A-Za-z0-9_-]+$/.test(
      id
    )
  ) {
    throw new Error(
      "Invalid Creem checkout ID."
    );
  }

  const checkoutUrl = new URL(
    url
  );

  if (
    checkoutUrl.protocol !== "https:" ||
    !(
      checkoutUrl.hostname ===
        "creem.io" ||
      checkoutUrl.hostname.endsWith(
        ".creem.io"
      )
    )
  ) {
    throw new Error(
      "Unexpected Creem checkout URL."
    );
  }

  return {
    id,
    checkoutUrl:
      checkoutUrl.toString(),
  };
}
