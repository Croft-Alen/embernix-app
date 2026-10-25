import { getPaddle } from "@/lib/paddle/server";

export type PaddleCatalogProductInput = {
  productId: string;

  name: string;

  shortDescription:
    | string
    | null;

  imageUrl:
    | string
    | null;

  priceCents: number;

  currency: string;

  paddleProductId:
    | string
    | null;

  paddlePriceId:
    | string
    | null;
};

export type PaddleCatalogSyncResult = {
  paddleProductId: string;
  paddlePriceId: string;
};

function normalizeCurrency(
  currency: string
) {
  return currency
    .trim()
    .toUpperCase();
}

function cleanDescription(
  value:
    | string
    | null
) {
  const description =
    value?.trim();

  if (!description) {
    return null;
  }

  return description.slice(
    0,
    2048
  );
}

function cleanImageUrl(
  value:
    | string
    | null
) {
  const imageUrl =
    value?.trim();

  if (!imageUrl) {
    return null;
  }

  try {
    const url =
      new URL(imageUrl);

    if (
      url.protocol !==
      "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function createPaddleProduct(
  input: PaddleCatalogProductInput
) {
  const paddle =
    getPaddle();

  const product =
    await paddle.products.create({
      name:
        input.name,

      /*
       * "standard" is appropriate for
       * downloadable software/themes.
       *
       * Paddle's standard tax category is
       * available by default.
       */
      taxCategory:
        "standard",

      description:
        cleanDescription(
          input.shortDescription
        ),

      imageUrl:
        cleanImageUrl(
          input.imageUrl
        ),

      customData: {
        embernix_product_id:
          input.productId,
      },
    });

  if (!product?.id) {
    throw new Error(
      "Paddle did not return a product ID."
    );
  }

  return product;
}

async function updatePaddleProduct(
  paddleProductId: string,
  input: PaddleCatalogProductInput
) {
  const paddle =
    getPaddle();

  return paddle.products.update(
    paddleProductId,
    {
      name:
        input.name,

      description:
        cleanDescription(
          input.shortDescription
        ),

      imageUrl:
        cleanImageUrl(
          input.imageUrl
        ),

      customData: {
        embernix_product_id:
          input.productId,
      },
    }
  );
}

async function createPaddlePrice(
  paddleProductId: string,
  input: PaddleCatalogProductInput
) {
  const paddle =
    getPaddle();

  const currency =
    normalizeCurrency(
      input.currency
    );

  const price =
    await paddle.prices.create({
      productId:
        paddleProductId,

      name:
        input.name,

      description:
        `${input.name} one-time purchase`,

      unitPrice: {
        amount:
          String(
            input.priceCents
          ),

        currencyCode:
          currency as never,
      },

      billingCycle:
        null,

      taxMode:
        "account_setting",

      quantity: {
        minimum: 1,
        maximum: 1,
      },

      customData: {
        embernix_product_id:
          input.productId,
      },
    });

  if (!price?.id) {
    throw new Error(
      "Paddle did not return a price ID."
    );
  }

  return price;
}

async function archivePaddlePrice(
  paddlePriceId: string
) {
  const paddle =
    getPaddle();

  await paddle.prices.update(
    paddlePriceId,
    {
      status:
        "archived",
    }
  );
}

async function getPaddlePrice(
  paddlePriceId: string
) {
  const paddle =
    getPaddle();

  return paddle.prices.get(
    paddlePriceId
  );
}

export async function syncProductToPaddle(
  input: PaddleCatalogProductInput
): Promise<PaddleCatalogSyncResult> {
  /*
   * STEP 1:
   * Ensure Paddle Product exists.
   */
  let paddleProductId =
    input.paddleProductId;

  if (!paddleProductId) {
    const product =
      await createPaddleProduct(
        input
      );

    paddleProductId =
      product.id;
  } else {
    /*
     * Keep product metadata synced.
     */
    await updatePaddleProduct(
      paddleProductId,
      input
    );
  }

  /*
   * STEP 2:
   * Determine whether existing price
   * still matches Embernix.
   */
  let paddlePriceId =
    input.paddlePriceId;

  let mustCreatePrice =
    !paddlePriceId;

  if (paddlePriceId) {
    try {
      const existingPrice =
        await getPaddlePrice(
          paddlePriceId
        );

      const currentAmount =
        Number(
          existingPrice.unitPrice
            ?.amount
        );

      const currentCurrency =
        String(
          existingPrice.unitPrice
            ?.currencyCode ??
            ""
        ).toUpperCase();

      const desiredCurrency =
        normalizeCurrency(
          input.currency
        );

      const samePrice =
        currentAmount ===
          input.priceCents &&
        currentCurrency ===
          desiredCurrency &&
        existingPrice.status ===
          "active";

      mustCreatePrice =
        !samePrice;
    } catch (error) {
      console.error(
        "Unable to inspect existing Paddle price:",
        error
      );

      /*
       * If existing ID is broken/missing,
       * create a replacement.
       */
      mustCreatePrice =
        true;
    }
  }

  /*
   * STEP 3:
   * Price changed?
   *
   * Archive old price and create a new one.
   */
  if (mustCreatePrice) {
    const oldPriceId =
      paddlePriceId;

    const newPrice =
      await createPaddlePrice(
        paddleProductId,
        input
      );

    paddlePriceId =
      newPrice.id;

    if (
      oldPriceId &&
      oldPriceId !==
        paddlePriceId
    ) {
      try {
        await archivePaddlePrice(
          oldPriceId
        );
      } catch (error) {
        /*
         * Do NOT fail the new valid price
         * just because archival failed.
         */
        console.error(
          "Failed to archive previous Paddle price:",
          error
        );
      }
    }
  }

  if (
    !paddleProductId ||
    !paddlePriceId
  ) {
    throw new Error(
      "Paddle catalog sync did not return complete IDs."
    );
  }

  return {
    paddleProductId,
    paddlePriceId,
  };
}