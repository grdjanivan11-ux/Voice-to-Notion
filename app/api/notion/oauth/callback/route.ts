import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type NotionOAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  bot_id?: string;

  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string | null;

  owner?: unknown;

  error?: string;
};

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(request.url);

    const code =
      url.searchParams.get("code");

    const oauthError =
      url.searchParams.get("error");

    const returnedState =
      url.searchParams.get("state");

    const storedState =
      request.cookies.get(
        "notion_oauth_state"
      )?.value;

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

    if (
      !returnedState ||
      !storedState ||
      returnedState !== storedState
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid OAuth state.",
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

    const tokenResponse =
      await fetch(
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
      (await tokenResponse.json()) as NotionOAuthResponse;

    if (!tokenResponse.ok) {
      console.error(
        "NOTION OAUTH TOKEN ERROR:",
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
          status:
            tokenResponse.status,
        }
      );
    }

    if (!data.access_token) {
      return NextResponse.json(
        {
          error:
            "Notion did not return an access token.",
        },
        {
          status: 500,
        }
      );
    }

    if (!data.workspace_id) {
      return NextResponse.json(
        {
          error:
            "Notion did not return a workspace ID.",
        },
        {
          status: 500,
        }
      );
    }

    const connection = {
      workspace_id:
        data.workspace_id,

      workspace_name:
        data.workspace_name ?? null,

      access_token:
        data.access_token,

      ...(data.refresh_token
        ? {
            refresh_token:
              data.refresh_token,
          }
        : {}),

      updated_at:
        new Date().toISOString(),
    };

    const {
      error: databaseError,
    } =
      await supabaseAdmin
        .from(
          "notion_connections"
        )
        .upsert(
          connection,
          {
            onConflict:
              "workspace_id",
          }
        );

    if (databaseError) {
      console.error(
        "NOTION CONNECTION SAVE ERROR:",
        databaseError
      );

      return NextResponse.json(
        {
          error:
            "Notion connected, but the connection could not be saved.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "NOTION CONNECTION SAVED:",
      {
        workspaceId:
          data.workspace_id,

        workspaceName:
          data.workspace_name,

        hasAccessToken: true,

        hasRefreshToken:
          Boolean(
            data.refresh_token
          ),
      }
    );

    const response =
      NextResponse.json({
        success: true,

        workspace: {
          id:
            data.workspace_id,

          name:
            data.workspace_name ??
            null,

          icon:
            data.workspace_icon ??
            null,
        },

        saved: true,

        message:
          "Notion connected and saved successfully.",
      });

    response.cookies.delete(
      "notion_oauth_state"
    );

    return response;
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