import {
  createHmac,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  checkRateLimit,
} from "@/lib/rate-limit";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getAuthenticatedUser,
} from "@/lib/usage";

const NOTION_OAUTH_START_RATE_LIMIT = {
  routeKey:
    "notion-oauth-start",

  limit:
    5,

  windowSeconds:
    60,
} as const;

const OAUTH_STATE_TTL_MS =
  10 *
  60 *
  1000;

const NOTION_CALLBACK_PATH =
  "/api/notion/oauth/callback";

function getRetryAfterSeconds(
  resetAt:
    string | null
) {
  if (
    !resetAt
  ) {
    return 60;
  }

  const resetTime =
    new Date(
      resetAt
    ).getTime();

  if (
    !Number.isFinite(
      resetTime
    )
  ) {
    return 60;
  }

  return Math.max(
    1,
    Math.ceil(
      (
        resetTime -
        Date.now()
      ) /
        1000
    )
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
    const user =
      await getAuthenticatedUser(
        request
      );

    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status:
            401,
        }
      );
    }

    const rateLimit =
      await checkRateLimit(
        user.id,
        NOTION_OAUTH_START_RATE_LIMIT
      );

    if (
      !rateLimit.allowed
    ) {
      const retryAfter =
        getRetryAfterSeconds(
          rateLimit.resetAt
        );

      return NextResponse.json(
        {
          error:
            "Too many Notion connection attempts. Please try again shortly.",

          code:
            "RATE_LIMITED",

          remaining:
            0,

          resetAt:
            rateLimit.resetAt,
        },
        {
          status:
            429,

          headers: {
            "Retry-After":
              String(
                retryAfter
              ),

            "X-RateLimit-Limit":
              String(
                NOTION_OAUTH_START_RATE_LIMIT.limit
              ),

            "X-RateLimit-Remaining":
              "0",
          },
        }
      );
    }

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
        "NOTION OAUTH ENVIRONMENT CONFIGURATION IS MISSING"
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
        "NOTION OAUTH REDIRECT URI CONFIGURATION IS INVALID"
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

    const timestamp =
      Date.now();

    const nonce =
      crypto.randomUUID();

    const expiresAt =
      new Date(
        timestamp +
          OAUTH_STATE_TTL_MS
      ).toISOString();

    const payload =
      `${timestamp}.${nonce}.${user.id}`;

    const signature =
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

    const state =
      `${payload}.${signature}`;

    const {
      error:
        stateInsertError,
    } =
      await supabaseAdmin
        .from(
          "oauth_states"
        )
        .insert({
          nonce,
          user_id:
            user.id,
          provider:
            "notion",
          expires_at:
            expiresAt,
        });

    if (
      stateInsertError
    ) {
      console.error(
        "NOTION OAUTH STATE INSERT ERROR:",
        stateInsertError
      );

      return NextResponse.json(
        {
          error:
            "Could not start Notion connection securely.",
        },
        {
          status:
            500,
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

    authorizationUrl.searchParams.set(
      "state",
      state
    );

    return NextResponse.json(
      {
        success:
          true,

        authorizationUrl:
          authorizationUrl.toString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",

          "X-RateLimit-Limit":
            String(
              NOTION_OAUTH_START_RATE_LIMIT.limit
            ),

          "X-RateLimit-Remaining":
            String(
              Math.max(
                rateLimit.remaining,
                0
              )
            ),
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "NOTION OAUTH START ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not start Notion OAuth.",
      },
      {
        status:
          500,
      }
    );
  }
}
