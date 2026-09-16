import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getPaddle,
} from "@/lib/paddle/server";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type CheckoutRequest = {
  orderNumber?: string;
  couponCode?:
    | string
    | null;
};

type ResolvedDiscount = {
  discountId:
    | string
    | null;

  code:
    | string
    | null;
};

function normalizeCode(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase();
}

function buildHostedCheckoutUrl(
  transactionId: string,
  customerEmail: string,
  discount: ResolvedDiscount
) {
  const baseUrl =
    process.env
      .PADDLE_HOSTED_CHECKOUT_URL;

  if (!baseUrl) {
    throw new Error(
      "PADDLE_HOSTED_CHECKOUT_URL is not configured."
    );
  }

  const url =
    new URL(baseUrl);

  url.searchParams.set(
    "transaction_id",
    transactionId
  );

  if (discount.code) {
    url.searchParams.set(
      "discount_code",
      discount.code
    );
  } else if (
    discount.discountId
  ) {
    url.searchParams.set(
      "discount_id",
      discount.discountId
    );
  }

  if (customerEmail) {
    url.searchParams.set(
      "user_email",
      customerEmail
    );
  }

  url.searchParams.set(
    "theme",
    "light"
  );

  return url.toString();
}

function checkoutResponse(
  body: Record<
    string,
    unknown
  >,
  orderNumber: string,
  status = 200
) {
  const response =
    NextResponse.json(
      body,
      {
        status,
      }
    );

  response.cookies.set(
    "embernix_checkout_order",
    orderNumber,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge:
        60 * 60,
    }
  );

  return response;
}

async function resolveDiscount(
  couponCode:
    | string
    | null
    | undefined,
  currency: string
): Promise<ResolvedDiscount> {
  const code =
    normalizeCode(
      couponCode
    );

  if (!code) {
    return {
      discountId:
        null,

      code:
        null,
    };
  }

  const admin =
    createAdminClient();

  const {
    data: coupon,
    error,
  } = await admin
    .from("coupons")
    .select(`
      id,
      code,
      discount_type,
      amount,
      currency,
      active,
      expires_at,
      paddle_discount_id
    `)
    .eq(
      "code",
      code
    )
    .maybeSingle();

  if (
    error ||
    !coupon
  ) {
    throw new Error(
      "Coupon code is invalid."
    );
  }

  if (!coupon.active) {
    throw new Error(
      "This coupon is no longer active."
    );
  }

  if (
    !coupon
      .paddle_discount_id
  ) {
    throw new Error(
      "This coupon is not connected to Paddle."
    );
  }

  if (
    coupon.expires_at
  ) {
    const expiry =
      new Date(
        coupon.expires_at
      );

    if (
      !Number.isNaN(
        expiry.getTime()
      ) &&
      expiry.getTime() <=
        Date.now()
    ) {
      throw new Error(
        "This coupon has expired."
      );
    }
  }

  if (
    coupon.discount_type ===
      "flat" &&
    String(
      coupon.currency ??
        ""
    ).toUpperCase() !==
      currency.toUpperCase()
  ) {
    throw new Error(
      "This coupon cannot be used with this currency."
    );
  }

  return {
    discountId:
      coupon.paddle_discount_id,

    code:
      coupon.code,
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request
        .json()
        .catch(
          () => null
        )) as
        | CheckoutRequest
        | null;

    const orderNumber =
      body?.orderNumber
        ?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        {
          error:
            "Order number is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: order,
      error:
        orderError,
    } = await admin
      .from("orders")
      .select(`
        id,
        user_id,
        order_number,
        status,
        payment_status,
        currency,
        customer_email,
        paddle_transaction_id
      `)
      .eq(
        "order_number",
        orderNumber
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      order.status ===
        "paid" ||
      order.payment_status ===
        "paid"
    ) {
      return checkoutResponse(
        {
          alreadyPaid:
            true,
        },
        order.order_number
      );
    }

    if (
      order.status !==
        "pending" ||
      order.payment_status !==
        "unpaid"
    ) {
      return NextResponse.json(
        {
          error:
            "This order cannot currently be paid.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: item,
      error:
        itemError,
    } = await admin
      .from("order_items")
      .select(`
        id,
        item_type,
        product_id,
        service_id,
        product_name,
        unit_price_cents,
        quantity
      `)
      .eq(
        "order_id",
        order.id
      )
      .limit(1)
      .maybeSingle();

    if (
      itemError ||
      !item
    ) {
      return NextResponse.json(
        {
          error:
            "Order item was not found.",
        },
        {
          status: 400,
        }
      );
    }

    const itemType =
      String(
        item.item_type ??
          "product"
      );

    const paddle =
      getPaddle();

    if (
      itemType ===
      "product"
    ) {
      if (
        !item.product_id
      ) {
        return NextResponse.json(
          {
            error:
              "Product information is missing.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: product,
        error:
          productError,
      } = await admin
        .from("products")
        .select(`
          id,
          paddle_price_id,
          active,
          currency
        `)
        .eq(
          "id",
          item.product_id
        )
        .maybeSingle();

      if (
        productError ||
        !product
      ) {
        return NextResponse.json(
          {
            error:
              "Product was not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        !product
          .paddle_price_id
      ) {
        return NextResponse.json(
          {
            error:
              "This product is not connected to checkout yet.",
          },
          {
            status: 400,
          }
        );
      }

      let discount:
        ResolvedDiscount;

      try {
        discount =
          await resolveDiscount(
            body?.couponCode,
            product.currency
          );
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof
                Error
                ? error.message
                : "Coupon is invalid.",
          },
          {
            status: 400,
          }
        );
      }

      const customData = {
        embernix_payment_type:
          "order",

        embernix_item_type:
          "product",

        embernix_order_id:
          order.id,

        embernix_order_number:
          order.order_number,

        embernix_user_id:
          user.id,

        embernix_product_id:
          product.id,

        embernix_coupon_code:
          discount.code,
      };

      if (
        order
          .paddle_transaction_id
      ) {
        await paddle.transactions.update(
          order.paddle_transaction_id,
          {
            discountId:
              discount.discountId,

            customData,
          } as never
        );

        return checkoutResponse(
          {
            checkoutUrl:
              buildHostedCheckoutUrl(
                order
                  .paddle_transaction_id,

                order.customer_email ??
                  user.email ??
                  "",

                discount
              ),

            transactionId:
              order
                .paddle_transaction_id,

            couponCode:
              discount.code,

            discountId:
              discount.discountId,
          },
          order.order_number
        );
      }

      const transaction =
        await paddle.transactions.create(
          {
            items: [
              {
                priceId:
                  product
                    .paddle_price_id,

                quantity:
                  Math.max(
                    Number(
                      item.quantity ??
                        1
                    ),
                    1
                  ),
              },
            ],

            collectionMode:
              "automatic",

            discountId:
              discount.discountId,

            customData,
          } as never
        );

      if (
        !transaction?.id
      ) {
        return NextResponse.json(
          {
            error:
              "Paddle did not return a transaction.",
          },
          {
            status: 502,
          }
        );
      }

      const {
        error:
          updateError,
      } = await admin
        .from("orders")
        .update({
          payment_provider:
            "paddle",

          provider_transaction_id:
            transaction.id,

          paddle_transaction_id:
            transaction.id,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          order.id
        );

      if (updateError) {
        console.error(
          "Failed saving Paddle transaction:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Unable to connect payment to your order.",
          },
          {
            status: 500,
          }
        );
      }

      return checkoutResponse(
        {
          checkoutUrl:
            buildHostedCheckoutUrl(
              transaction.id,

              order.customer_email ??
                user.email ??
                "",

              discount
            ),

          transactionId:
            transaction.id,

          couponCode:
            discount.code,

          discountId:
            discount.discountId,
        },
        order.order_number
      );
    }

    if (
      itemType !==
      "service" ||
      !item.service_id
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported checkout item.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: service,
      error:
        serviceError,
    } = await admin
      .from("services")
      .select(`
        id,
        name,
        short_description,
        active
      `)
      .eq(
        "id",
        item.service_id
      )
      .maybeSingle();

    if (
      serviceError ||
      !service
    ) {
      return NextResponse.json(
        {
          error:
            "Service was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: invoice,
      error:
        invoiceError,
    } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        total_cents
      `)
      .eq(
        "order_id",
        order.id
      )
      .maybeSingle();

    if (
      invoiceError ||
      !invoice
    ) {
      console.error(
        "Service checkout invoice missing:",
        invoiceError
      );

      return NextResponse.json(
        {
          error:
            "Service invoice was not found.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      invoice.status !==
      "unpaid"
    ) {
      return NextResponse.json(
        {
          error:
            "This service invoice cannot currently be paid.",
        },
        {
          status: 409,
        }
      );
    }

    const transactionItem = {
      quantity:
        1,

      price: {
        name:
          service.name,

        description:
          service.short_description ||
          service.name,

        billingCycle:
          null,

        trialPeriod:
          null,

        taxMode:
          "internal",

        unitPrice: {
          amount:
            String(
              invoice.total_cents
            ),

          currencyCode:
            order.currency,
        },

        product: {
          name:
            service.name,

          description:
            service.short_description ||
            "Embernix professional service",

          taxCategory:
            "standard",
        },
      },
    };

    const customData = {
      embernix_payment_type:
        "order",

      embernix_item_type:
        "service",

      embernix_order_id:
        order.id,

      embernix_order_number:
        order.order_number,

      embernix_user_id:
        user.id,

      embernix_service_id:
        service.id,

      embernix_invoice_id:
        invoice.id,

      embernix_invoice_number:
        invoice.invoice_number,
    };

    if (
      order
        .paddle_transaction_id
    ) {
      await paddle.transactions.update(
        order.paddle_transaction_id,
        {
          items: [
            transactionItem,
          ],

          customData,
        } as never
      );

      return checkoutResponse(
        {
          checkoutUrl:
            buildHostedCheckoutUrl(
              order
                .paddle_transaction_id,

              order.customer_email ??
                user.email ??
                "",

              {
                discountId:
                  null,

                code:
                  null,
              }
            ),

          transactionId:
            order
              .paddle_transaction_id,
        },
        order.order_number
      );
    }

    const transaction =
      await paddle.transactions.create(
        {
          items: [
            transactionItem,
          ],

          collectionMode:
            "automatic",

          customData,
        } as never
      );

    if (
      !transaction?.id
    ) {
      return NextResponse.json(
        {
          error:
            "Paddle did not return a transaction.",
        },
        {
          status: 502,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      error:
        orderUpdateError,
    } = await admin
      .from("orders")
      .update({
        payment_provider:
          "paddle",

        provider_transaction_id:
          transaction.id,

        paddle_transaction_id:
          transaction.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        order.id
      );

    if (
      orderUpdateError
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to connect payment to your order.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        invoiceUpdateError,
    } = await admin
      .from("invoices")
      .update({
        payment_provider:
          "paddle",

        paddle_transaction_id:
          transaction.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        invoice.id
      )
      .eq(
        "status",
        "unpaid"
      );

    if (
      invoiceUpdateError
    ) {
      console.error(
        "Failed attaching Paddle transaction to service invoice:",
        invoiceUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to connect payment to your invoice.",
        },
        {
          status: 500,
        }
      );
    }

    return checkoutResponse(
      {
        checkoutUrl:
          buildHostedCheckoutUrl(
            transaction.id,

            order.customer_email ??
              user.email ??
              "",

            {
              discountId:
                null,

              code:
                null,
            }
          ),

        transactionId:
          transaction.id,
      },
      order.order_number
    );
  } catch (error) {
    console.error(
      "Paddle checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start checkout. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}