import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function GET(
  request: NextRequest
) {
  const invoiceId =
    request.cookies.get(
      "embernix_invoice_checkout"
    )?.value;

  if (invoiceId) {
    const invoiceUrl =
      new URL(
        `/invoices/${invoiceId}`,
        request.url
      );

    invoiceUrl.searchParams.set(
      "payment",
      "processing"
    );

    const response =
      NextResponse.redirect(
        invoiceUrl
      );

    response.cookies.delete(
      "embernix_invoice_checkout"
    );

    return response;
  }

  const orderNumber =
    request.cookies.get(
      "embernix_checkout_order"
    )?.value;

  if (!orderNumber) {
    return NextResponse.redirect(
      new URL(
        "/products",
        request.url
      )
    );
  }

  const successUrl =
    new URL(
      "/checkout/success",
      request.url
    );

  successUrl.searchParams.set(
    "order",
    orderNumber
  );

  successUrl.searchParams.set(
    "payment",
    "processing"
  );

  const response =
    NextResponse.redirect(
      successUrl
    );

  response.cookies.delete(
    "embernix_checkout_order"
  );

  return response;
}