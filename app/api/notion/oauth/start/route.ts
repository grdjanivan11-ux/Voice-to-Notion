import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId =
    process.env.NOTION_OAUTH_CLIENT_ID;

  const clientSecret =
    process.env.NOTION_OAUTH_CLIENT_SECRET;

  const redirectUri =
    process.env.NOTION_OAUTH_REDIRECT_URI;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    return NextResponse.json(
      {
        error:
          "Notion OAuth environment variables are missing.",
      },
      {
        status: 500,
      }
    );
  }

  const timestamp = Date.now();
  const nonce = crypto.randomUUID();

  const payload =
    `${timestamp}.${nonce}`;

  const signature =
    createHmac(
      "sha256",
      clientSecret
    )
      .update(payload)
      .digest("hex");

  const state =
    `${payload}.${signature}`;

  const authorizationUrl =
    new URL(
      "https://api.notion.com/v1/oauth/authorize"
    );

  authorizationUrl.searchParams.set(
    "client_id",
    clientId
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  authorizationUrl.searchParams.set(
    "response_type",
    "code"
  );

  authorizationUrl.searchParams.set(
    "owner",
    "user"
  );

  authorizationUrl.searchParams.set(
    "state",
    state
  );

  return NextResponse.redirect(
    authorizationUrl.toString()
  );
}