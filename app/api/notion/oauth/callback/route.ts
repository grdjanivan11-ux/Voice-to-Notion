import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type NotionOAuthResponse = {
  access_token?: string;
  refresh_token?: string;

  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string;

  owner?: unknown;

  duplicated_template_id?: string | null;

  error?: string;
};

export async function GET(
  request: Request
) {
  try {
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

    const url =
      new URL(
        request.url
      );

    const code =
      url.searchParams.get(
        "code"
      );

    const state =
      url.searchParams.get(
        "state"
      );

    const notionError =
      url.searchParams.get(
        "error"
      );

    if (notionError) {
      return NextResponse.json(
        {
          error:
            `Notion authorization failed: ${notionError}`,
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
            "Missing OAuth code.",
        },
        {
          status: 400,
        }
      );
    }

    if (!state) {
      return NextResponse.json(
        {
          error:
            "Missing OAuth state.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      VERIFY SIGNED STATE

      timestamp.nonce.userId.signature
    */

    const stateParts =
      state.split(".");

    if (
      stateParts.length !==
      4
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

    const [
      timestampString,
      nonce,
      userId,
      receivedSignature,
    ] = stateParts;

    const timestamp =
      Number(
        timestampString
      );

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid OAuth state timestamp.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      State expires after 10 minutes.
    */

    const MAX_STATE_AGE =
      10 * 60 * 1000;

    const age =
      Date.now() -
      timestamp;

    if (
      age < 0 ||
      age >
        MAX_STATE_AGE
    ) {
      return NextResponse.json(
        {
          error:
            "OAuth state expired. Please connect Notion again.",
        },
        {
          status: 400,
        }
      );
    }

    const payload =
      `${timestampString}.${nonce}.${userId}`;

    const expectedSignature =
      createHmac(
        "sha256",
        clientSecret
      )
        .update(payload)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    const receivedBuffer =
      Buffer.from(
        receivedSignature,
        "hex"
      );

    if (
      expectedBuffer.length !==
        receivedBuffer.length ||
      !timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      )
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

    /*
      EXTRA CHECK:
      make sure this user still exists
      in Supabase Auth.
    */

    const {
      data: userData,
      error:
        userLookupError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (
      userLookupError ||
      !userData.user
    ) {
      console.error(
        "OAUTH USER LOOKUP ERROR:",
        userLookupError
      );

      return NextResponse.json(
        {
          error:
            "The Voice to Notion user no longer exists.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      EXCHANGE NOTION CODE
      FOR ACCESS TOKEN
    */

    const basicAuth =
      Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString(
        "base64"
      );

    const tokenResponse =
      await fetch(
        "https://api.notion.com/v1/oauth/token",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Basic ${basicAuth}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                grant_type:
                  "authorization_code",

                code,

                redirect_uri:
                  redirectUri,
              }
            ),
        }
      );

    const data =
      (await tokenResponse.json()) as NotionOAuthResponse;

    if (
      !tokenResponse.ok
    ) {
      console.error(
        "NOTION TOKEN EXCHANGE ERROR:",
        data
      );

      return NextResponse.json(
        {
          error:
            data.error ||
            "Could not exchange the Notion OAuth code.",
        },
        {
          status:
            tokenResponse.status,
        }
      );
    }

    if (
      !data.access_token ||
      !data.workspace_id
    ) {
      return NextResponse.json(
        {
          error:
            "Notion returned an incomplete OAuth response.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      SAVE CONNECTION TO THE
      LOGGED-IN VOICE TO NOTION USER
    */

    const connection = {
      user_id:
        userId,

      workspace_id:
        data.workspace_id,

      workspace_name:
        data.workspace_name ??
        null,

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
      error:
        connectionError,
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

    if (
      connectionError
    ) {
      console.error(
        "NOTION CONNECTION SAVE ERROR:",
        connectionError
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

    return NextResponse.json({
      success: true,

      saved: true,

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

      user: {
        id:
          userData.user.id,

        email:
          userData.user.email ??
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
          "Could not complete Notion OAuth.",
      },
      {
        status: 500,
      }
    );
  }
}