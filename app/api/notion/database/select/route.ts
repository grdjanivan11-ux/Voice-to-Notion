import {
  Client,
} from "@notionhq/client";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  checkRateLimit,
} from "@/lib/rate-limit";

import {
  getAuthenticatedUser,
} from "@/lib/usage";

const MAX_JSON_REQUEST_BYTES =
  8 *
  1024;

const NOTION_DESTINATION_RATE_LIMIT = {
  routeKey:
    "notion-destination-select",

  limit:
    20,

  windowSeconds:
    60,
} as const;

function isValidNotionId(
  value:
    string
) {
  const normalized =
    value.replace(
      /-/g,
      ""
    );

  return /^[0-9a-fA-F]{32}$/.test(
    normalized
  );
}

const SelectDatabaseRequestSchema =
  z.object({
    dataSourceId:
      z
        .string()
        .trim()
        .min(1)
        .max(64)
        .refine(
          isValidNotionId,
          {
            message:
              "Invalid Notion data source ID.",
          }
        ),
  });

function getContentLength(
  request:
    Request
) {
  const value =
    request.headers.get(
      "content-length"
    );

  if (
    !value
  ) {
    return null;
  }

  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <
      0
  ) {
    return null;
  }

  return parsed;
}

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

export async function POST(
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
        NOTION_DESTINATION_RATE_LIMIT
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
            "Too many destination changes. Please try again shortly.",

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
                NOTION_DESTINATION_RATE_LIMIT.limit
              ),

            "X-RateLimit-Remaining":
              "0",
          },
        }
      );
    }

    /* =====================================================
       REQUEST SIZE
       ===================================================== */

    const contentLength =
      getContentLength(
        request
      );

    if (
      contentLength !==
        null &&
      contentLength >
        MAX_JSON_REQUEST_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Destination request is too large.",

          code:
            "PAYLOAD_TOO_LARGE",
        },
        {
          status:
            413,
        }
      );
    }

    /* =====================================================
       JSON
       ===================================================== */

    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch (
      error
    ) {
      console.error(
        "DATABASE SELECTION JSON PARSE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Invalid JSON request body.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       INPUT VALIDATION
       ===================================================== */

    const parsedBody =
      SelectDatabaseRequestSchema.safeParse(
        body
      );

    if (
      !parsedBody.success
    ) {
      return NextResponse.json(
        {
          error:
            "A valid Notion destination is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const dataSourceId =
      parsedBody.data
        .dataSourceId;

    /* =====================================================
       LOAD THIS USER'S NOTION CONNECTION
       ===================================================== */

    const {
      data:
        connection,
      error:
        connectionError,
    } =
      await supabaseAdmin
        .from(
          "notion_connections"
        )
        .select(
          `
            workspace_id,
            access_token
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      connectionError
    ) {
      console.error(
        "DATABASE SELECTION CONNECTION LOOKUP ERROR:",
        connectionError
      );

      return NextResponse.json(
        {
          error:
            "Could not load your Notion connection.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !connection
    ) {
      return NextResponse.json(
        {
          error:
            "No Notion connection was found for this account.",
        },
        {
          status:
            404,
        }
      );
    }

    /* =====================================================
       VERIFY DESTINATION OWNERSHIP / ACCESS
       ===================================================== */

    const notion =
      new Client({
        auth:
          connection
            .access_token,
      });

    try {
      await notion
        .dataSources
        .retrieve({
          data_source_id:
            dataSourceId,
        });
    } catch (
      error
    ) {
      console.error(
        "DATABASE SELECTION NOTION VERIFY ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "That Notion destination is not available to your connected workspace.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       UPDATE ONLY THIS USER'S CONNECTION
       ===================================================== */

    const {
      data:
        updatedConnection,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "notion_connections"
        )
        .update({
          selected_data_source_id:
            dataSourceId,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          user.id
        )
        .select(
          `
            workspace_id,
            selected_data_source_id
          `
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "DATABASE SELECTION UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Could not save database selection.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !updatedConnection
    ) {
      return NextResponse.json(
        {
          error:
            "No Notion connection was found for this account.",
        },
        {
          status:
            404,
        }
      );
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        selectedDataSourceId:
          updatedConnection
            .selected_data_source_id,

        workspaceId:
          updatedConnection
            .workspace_id,
      },
      {
        headers: {
          "X-RateLimit-Limit":
            String(
              NOTION_DESTINATION_RATE_LIMIT.limit
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
      "DATABASE SELECTION ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not save database selection.",
      },
      {
        status:
          500,
      }
    );
  }
}
