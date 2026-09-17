import {
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";

/* =========================================================
   VOICE TO NOTION
   PADDLE BROWSER CLIENT
   ========================================================= */

export type PaddleBillingInterval =
  | "month"
  | "year";

let paddlePromise:
  Promise<Paddle | undefined> |
  null =
    null;

/* =========================================================
   ENVIRONMENT
   ========================================================= */

function getPaddleEnvironment():
  | "sandbox"
  | "production" {
  return process.env
    .NEXT_PUBLIC_PADDLE_ENVIRONMENT ===
    "production"
      ? "production"
      : "sandbox";
}

/* =========================================================
   PADDLE INSTANCE

   Paddle should only be initialized once per page.
   ========================================================= */

export async function getPaddle() {
  const clientToken =
    process.env
      .NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (
    !clientToken
  ) {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing."
    );
  }

  if (
    !paddlePromise
  ) {
    paddlePromise =
      initializePaddle({
        token:
          clientToken,

        environment:
          getPaddleEnvironment(),
      });
  }

  const paddle =
    await paddlePromise;

  if (
    !paddle
  ) {
    throw new Error(
      "Paddle could not be initialized."
    );
  }

  return paddle;
}

/* =========================================================
   PRODUCT
   ========================================================= */

export function getPaddleProductId() {
  const productId =
    process.env
      .NEXT_PUBLIC_PADDLE_PRO_PRODUCT_ID;

  if (
    !productId
  ) {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_PRO_PRODUCT_ID is missing."
    );
  }

  return productId;
}

/* =========================================================
   PRICE
   ========================================================= */

export function getPaddlePriceId(
  interval:
    PaddleBillingInterval
) {
  const priceId =
    interval ===
    "year"
      ? process.env
          .NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID
      : process.env
          .NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;

  if (
    !priceId
  ) {
    throw new Error(
      interval ===
        "year"
        ? "NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID is missing."
        : "NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID is missing."
    );
  }

  return priceId;
}