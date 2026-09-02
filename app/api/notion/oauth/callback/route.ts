import { NextResponse } from "next/server";

type NotionOAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string | null;
  error?: string;
};

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url);

    const code =
      url.searchParams.get("code");

    const oauthError =
      url.searchParams.get("error");

    if (oauthError) {
      return NextResponse.json(
        {
          error:
            `Notion authorization failed: ${oauthError}`,
        },
        {
          status: 400,
        }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Authorization code is missing.",
        },
        {
          status: 400,
        }
      );
    }

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

    const basicAuth =
      Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64");

    const response = await fetch(
      "https://api.notion.com/v1/oauth/token",
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${basicAuth}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          grant_type:
            "authorization_code",

          code,

          redirect_uri:
            redirectUri,
        }),
      }
    );

    const data =
      (await response.json()) as NotionOAuthResponse;

    if (!response.ok) {
      console.error(
        "NOTION OAUTH ERROR:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Could not exchange the Notion authorization code.",
          details:
            data.error ??
            "Unknown Notion OAuth error",
        },
        {
          status: response.status,
        }
      );
    }

    console.log(
      "NOTION OAUTH SUCCESS:",
      {
        workspaceId:
          data.workspace_id,

        workspaceName:
          data.workspace_name,

        botId:
          data.bot_id,

        hasAccessToken:
          Boolean(
            data.access_token
          ),

        hasRefreshToken:
          Boolean(
            data.refresh_token
          ),
      }
    );

    return NextResponse.json({
      success: true,

      workspace: {
        id:
          data.workspace_id ??
          null,

        name:
          data.workspace_name ??
          null,

        icon:
          data.workspace_icon ??
          null,
      },

      message:
        "Notion connected successfully.",
    });
  } catch (error) {
    console.error(
      "NOTION OAUTH CALLBACK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to complete Notion OAuth.",
      },
      {
        status: 500,
      }
    );
  }
}