import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

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

type ConsumeOAuthStateRow = {
  consumed: boolean;
};

const MAX_STATE_AGE_MS =
  10 *
  60 *
  1000;

const NOTION_CALLBACK_PATH =
  "/api/notion/oauth/callback";

function isValidUuid(
  value:
    string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidHexSignature(
  value:
    string
) {
  return /^[0-9a-f]{64}$/i.test(
    value
  );
}

function getValidatedRedirectUri(
  value:
    string
) {
  let url:
    URL;

  try {
    url =
      new URL(
        value
      );
  } catch {
    return null;
  }

  const isLocalhost =
    url.hostname ===
      "localhost" ||
    url.hostname ===
      "127.0.0.1";

  const allowedProtocol =
    url.protocol ===
      "https:" ||
    (
      isLocalhost &&
      url.protocol ===
        "http:"
    );

  if (
    !allowedProtocol ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !==
      NOTION_CALLBACK_PATH
  ) {
    return null;
  }

  return url.toString();
}

export async function GET(
  request:
    Request
) {
  try {
    const clientId =
      process.env
        .NOTION_OAUTH_CLIENT_ID;

    const clientSecret =
      process.env
        .NOTION_OAUTH_CLIENT_SECRET;

    const configuredRedirectUri =
      process.env
        .NOTION_OAUTH_REDIRECT_URI;

    if (
      !clientId ||
      !clientSecret ||
      !configuredRedirectUri
    ) {
      console.error(
        "NOTION OAUTH CALLBACK ENVIRONMENT CONFIGURATION IS MISSING"
      );

      return NextResponse.json(
        {
          error:
            "Notion connection service is unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    const redirectUri =
      getValidatedRedirectUri(
        configuredRedirectUri
      );

    if (
      !redirectUri
    ) {
      console.error(
        "NOTION OAUTH CALLBACK REDIRECT URI CONFIGURATION IS INVALID"
      );

      return NextResponse.json(
        {
          error:
            "Notion connection service is unavailable.",
        },
        {
          status:
            500,
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

    if (
      notionError
    ) {
      console.error(
        "NOTION OAUTH PROVIDER ERROR:",
        notionError
      );

      return NextResponse.json(
        {
          error:
            "Notion authorization was not completed.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !code
    ) {
      return NextResponse.json(
        {
          error:
            "Missing OAuth code.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !state
    ) {
      return NextResponse.json(
        {
          error:
            "Missing OAuth state.",
        },
        {
          status:
            400,
        }
      );
    }

    const stateParts =
      state.split(
        "."
      );

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
          status:
            400,
        }
      );
    }

    const [
      timestampString,
      nonce,
      userId,
      receivedSignature,
    ] =
      stateParts;

    const timestamp =
      Number(
        timestampString
      );

    if (
      !Number.isFinite(
        timestamp
      ) ||
      !Number.isSafeInteger(
        timestamp
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid OAuth state.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isValidUuid(
        nonce
      ) ||
      !isValidUuid(
        userId
      ) ||
      !isValidHexSignature(
        receivedSignature
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid OAuth state.",
        },
        {
          status:
            400,
        }
      );
    }

    const age =
      Date.now() -
      timestamp;

    if (
      age <
        0 ||
      age >
        MAX_STATE_AGE_MS
    ) {
      return NextResponse.json(
        {
          error:
            "OAuth state expired. Please connect Notion again.",
        },
        {
          status:
            400,
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
        .update(
          payload
        )
        .digest(
          "hex"
        );

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
          status:
            400,
        }
      );
    }

    const {
      data:
        consumeData,
      error:
        consumeError,
    } =
      await supabaseAdmin
        .rpc(
          "consume_oauth_state",
          {
            p_nonce:
              nonce,
            p_user_id:
              userId,
            p_provider:
              "notion",
          }
        );

    if (
      consumeError
    ) {
      console.error(
        "NOTION OAUTH STATE CONSUME ERROR:",
        consumeError
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the Notion connection securely.",
        },
        {
          status:
            500,
        }
      );
    }

    const consumed =
      Array.isArray(
        consumeData
      )
        ? (
            consumeData[0] as
              | ConsumeOAuthStateRow
              | undefined
          )?.consumed ===
          true
        : (
            consumeData as
              | ConsumeOAuthStateRow
              | null
          )?.consumed ===
          true;

    if (
      !consumed
    ) {
      return NextResponse.json(
        {
          error:
            "OAuth state is invalid, expired, or has already been used. Please connect Notion again.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        userData,
      error:
        userLookupError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .getUserById(
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
          status:
            401,
        }
      );
    }

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

    let data:
      NotionOAuthResponse;

    try {
      data =
        (await tokenResponse.json()) as
          NotionOAuthResponse;
    } catch (
      error
    ) {
      console.error(
        "NOTION TOKEN RESPONSE PARSE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Notion returned an invalid OAuth response.",
        },
        {
          status:
            502,
        }
      );
    }

    if (
      !tokenResponse.ok
    ) {
      console.error(
        "NOTION TOKEN EXCHANGE ERROR:",
        {
          status:
            tokenResponse.status,
          providerError:
            data.error ?? null,
        }
      );

      return NextResponse.json(
        {
          error:
            "Could not complete the Notion connection. Please try connecting again.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !data.access_token ||
      !data.workspace_id
    ) {
      console.error(
        "NOTION TOKEN RESPONSE INCOMPLETE"
      );

      return NextResponse.json(
        {
          error:
            "Notion returned an incomplete OAuth response.",
        },
        {
          status:
            502,
        }
      );
    }

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
        new Date()
          .toISOString(),
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
          status:
            500,
        }
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        saved:
          true,

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
      },
      {
        headers: {
          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error
  ) {
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
        status:
          500,
      }
    );
  }
}
