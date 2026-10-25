import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function productPageUrl(
  request: NextRequest,
  productId: string,
  error: string
) {
  const url = new URL(
    `/products/${productId}`,
    request.url
  );

  url.searchParams.set(
    "error",
    error
  );

  return url;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: productId } =
    await context.params;

  const supabase =
    await createClient();

  /*
   * 1. Authentication
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      "Please sign in to download your product."
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * 2. Ownership verification
   */
  const {
    data: ownership,
    error: ownershipError,
  } = await supabase
    .from("customer_products")
    .select(`
      id,
      status
    `)
    .eq("user_id", user.id)
    .eq(
      "product_id",
      productId
    )
    .maybeSingle();

  if (
    ownershipError ||
    !ownership
  ) {
    return NextResponse.redirect(
      productPageUrl(
        request,
        productId,
        "You do not own this product."
      )
    );
  }

  if (
    ownership.status !==
    "active"
  ) {
    return NextResponse.redirect(
      productPageUrl(
        request,
        productId,
        "This product is not currently available for download."
      )
    );
  }

  /*
   * 3. Find primary private file.
   */
  const {
    data: file,
    error: fileError,
  } = await supabase
    .from("product_files")
    .select(`
      id,
      file_name,
      storage_path
    `)
    .eq(
      "product_id",
      productId
    )
    .eq(
      "is_primary",
      true
    )
    .maybeSingle();

  if (
    fileError ||
    !file
  ) {
    return NextResponse.redirect(
      productPageUrl(
        request,
        productId,
        "No downloadable file is available for this product yet."
      )
    );
  }

  /*
   * Extra safety:
   * product files must be physically located
   * inside the product's own Storage folder.
   */
  if (
    !file.storage_path.startsWith(
      `${productId}/`
    )
  ) {
    console.error(
      "Product file path does not match product:",
      {
        productId,
        storagePath:
          file.storage_path,
      }
    );

    return NextResponse.redirect(
      productPageUrl(
        request,
        productId,
        "The product file configuration is invalid."
      )
    );
  }

  /*
   * 4. Generate temporary signed URL.
   *
   * URL expires after 60 seconds.
   */
  const {
    data: signedFile,
    error: signedUrlError,
  } = await supabase.storage
    .from("product-files")
    .createSignedUrl(
      file.storage_path,
      60,
      {
        download:
          file.file_name,
      }
    );

  if (
    signedUrlError ||
    !signedFile?.signedUrl
  ) {
    console.error(
      "Failed to create product signed URL:",
      signedUrlError
    );

    return NextResponse.redirect(
      productPageUrl(
        request,
        productId,
        "Unable to prepare your download. Please try again."
      )
    );
  }

  /*
   * 5. Redirect browser to temporary
   * Supabase download URL.
   */
  return NextResponse.redirect(
    signedFile.signedUrl
  );
}