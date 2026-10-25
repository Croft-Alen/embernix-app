import {
  Environment,
  Paddle,
} from "@paddle/paddle-node-sdk";

let paddleClient:
  | Paddle
  | null = null;

export function getPaddle() {
  const apiKey =
    process.env.PADDLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PADDLE_API_KEY is not configured."
    );
  }

  if (!paddleClient) {
    const environment =
      process.env
        .PADDLE_ENVIRONMENT ===
      "production"
        ? Environment.production
        : Environment.sandbox;

    paddleClient =
      new Paddle(
        apiKey,
        {
          environment,
        }
      );
  }

  return paddleClient;
}