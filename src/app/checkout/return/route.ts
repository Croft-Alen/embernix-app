
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get(
    "order"
  );

  const destination = new URL(
    "/products",
    request.nextUrl.origin
  );

  if (
    orderNumber &&
    /^EMB-\d{8}-[A-Z0-9]{8,12}$/.test(orderNumber)
  ) {
    destination.pathname = "/checkout/success";
    destination.searchParams.set("order", orderNumber);
  }

  return NextResponse.redirect(destination, 303);
}
