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

export async function GET(
  request:
    Request
) {
  try {
    /* =====================================================
       AUTH
       ===================================================== */

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

    /* =====================================================
       SHORT-TERM RATE LIMIT
       ===================================================== */

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

    /* =====================================================
       ENVIRONMENT
       ===================================================== */

    const clientId =
      process.env
        .NOTION_OAUTH_CLIENT_ID;

    const clientSecret =
      process.env
        .NOTION_OAUTH_CLIENT_SECRET;

    const redirectUri =
      process.env
        .NOTION_OAUTH_REDIRECT_URI;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri
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

    /* =====================================================
       BUILD SIGNED OAUTH STATE

       Format:
       timestamp.nonce.userId.signature
       ===================================================== */

    const timestamp =
      Date.now();

    const nonce =
      crypto.randomUUID();

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

    /* =====================================================
       BUILD NOTION AUTHORIZE URL
       ===================================================== */

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

    /* =====================================================
       SUCCESS

       The browser receives the URL and performs the actual
       navigation to Notion after this authenticated request.
       ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        authorizationUrl:
          authorizationUrl.toString(),
      },
      {
        headers: {
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
