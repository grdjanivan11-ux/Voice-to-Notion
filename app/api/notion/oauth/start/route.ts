import { NextResponse } from "next/server";

export async function GET() {
  const clientId =
    process.env.NOTION_OAUTH_CLIENT_ID;

  const redirectUri =
    process.env.NOTION_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
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

  return NextResponse.redirect(
    authorizationUrl.toString()
  );
}