import OpenAI from "openai";

import {
  z,
} from "zod";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  NextResponse,
} from "next/server";

import {
  checkRateLimit,
} from "@/lib/rate-limit";

import {
  getAuthenticatedUser,
  hasReachedCaptureLimit,
  incrementMonthlyUsage,
} from "@/lib/usage";

/* =========================================================
   VOICE TO NOTION
   SECURE AI STRUCTURING API

   C9.5.5 — RATE LIMITING
   ========================================================= */

const openai =
  new OpenAI({
    apiKey:
      process.env
        .OPENAI_API_KEY,
  });

const MAX_TRANSCRIPT_CHARACTERS =
  20_000;

const MAX_JSON_REQUEST_BYTES =
  100 *
  1024;

const STRUCTURE_RATE_LIMIT = {
  routeKey:
    "structure-note",

  limit:
    15,

  windowSeconds:
    60,
} as const;

const ALLOWED_CATEGORIES =
  [
    "Work",
    "Personal",
    "Study",
    "Health",
    "Finance",
    "Meeting",
    "Idea",
    "Task",
    "Shopping",
    "Travel",
    "Research",
    "Reminder",
    "Other",
  ] as const;

/* =========================================================
   REQUEST SCHEMA
   ========================================================= */

const StructureNoteRequestSchema =
  z.object({
    transcript:
      z
        .string()
        .trim()
        .min(
          1
        )
        .max(
          MAX_TRANSCRIPT_CHARACTERS
        ),
  });

/* =========================================================
   AI OUTPUT SCHEMA
   ========================================================= */

const CapturedNoteSchema =
  z.object({
    title:
      z.string(),

    summary:
      z.string(),

    actionItems:
      z.array(
        z.string()
      ),

    category:
      z.enum(
        ALLOWED_CATEGORIES
      ),

    priority:
      z.enum([
        "Low",
        "Medium",
        "High",
      ]),

    dueDate:
      z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/
        )
        .nullable(),
  });

/* =========================================================
   HELPERS
   ========================================================= */

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

/* =========================================================
   ROUTE
   ========================================================= */

export async function POST(
  request: Request
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

       Protect the expensive AI structuring endpoint before
       parsing input or calling OpenAI.
       ===================================================== */

    const rateLimit =
      await checkRateLimit(
        user.id,
        STRUCTURE_RATE_LIMIT
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
            "Too many AI structuring requests. Please try again shortly.",

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
                STRUCTURE_RATE_LIMIT.limit
              ),

            "X-RateLimit-Remaining":
              "0",
          },
        }
      );
    }

    /* =====================================================
       PLAN LIMIT
       ===================================================== */

    const limit =
      await hasReachedCaptureLimit(
        user.id
      );

    if (
      limit.reached
    ) {
      return NextResponse.json(
        {
          error:
            limit.plan.name ===
            "free"
              ? "You have used all 30 AI captures included in your Free plan this month."
              : "You have reached your monthly Pro AI capture allowance.",

          code:
            "PLAN_LIMIT_REACHED",

          plan:
            limit.plan.name,

          usage:
            limit.usage,
        },
        {
          status:
            429,
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
            "Transcript request is too large.",

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
        "STRUCTURE NOTE JSON PARSE ERROR:",
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
      StructureNoteRequestSchema.safeParse(
        body
      );

    if (
      !parsedBody.success
    ) {
      const transcriptTooLong =
        parsedBody.error.issues.some(
          (
            issue
          ) =>
            issue.path[0] ===
              "transcript" &&
            issue.code ===
              "too_big"
        );

      if (
        transcriptTooLong
      ) {
        return NextResponse.json(
          {
            error:
              `Transcript is too long. Maximum length is ${MAX_TRANSCRIPT_CHARACTERS.toLocaleString()} characters.`,

            code:
              "TRANSCRIPT_TOO_LONG",

            maxCharacters:
              MAX_TRANSCRIPT_CHARACTERS,
          },
          {
            status:
              413,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "A non-empty transcript is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const cleanTranscript =
      parsedBody.data
        .transcript;

    /* =====================================================
       MOCK

       Mock AI intentionally does NOT consume real usage.
       ===================================================== */

    const useMockAI =
      process.env
        .USE_MOCK_AI ===
      "true";

    if (
      useMockAI
    ) {
      const mockNote = {
        title:
          "Finish Voice to Notion project",

        summary:
          "Finish the Voice to Notion project and prepare it for launch.",

        actionItems: [
          "Finish the Voice to Notion project",
          "Prepare the product for launch",
        ],

        category:
          "Work",

        priority:
          "High",

        dueDate:
          null,

        mock:
          true,
      };

      return NextResponse.json(
        mockNote,
        {
          headers: {
            "X-RateLimit-Limit":
              String(
                STRUCTURE_RATE_LIMIT.limit
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
    }

    /* =====================================================
       OPENAI CONFIGURATION
       ===================================================== */

    if (
      !process.env
        .OPENAI_API_KEY
    ) {
      console.error(
        "OPENAI_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "AI structuring service is unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       OPENAI
       ===================================================== */

    const currentDate =
      new Date()
        .toISOString()
        .split(
          "T"
        )[0];

    const response =
      await openai.responses.parse(
        {
          model:
            "gpt-5.4-mini",

          input: [
            {
              role:
                "system",

              content: `
You convert raw voice notes into structured productivity notes.

The current date is ${currentDate}.

The speaker may talk about ANY normal topic including:
work, personal life, school, health, money, meetings, ideas,
shopping, travel, research, reminders, tasks, plans,
reference information, observations or general thoughts.

Do not assume every note is a task.

Return exactly these fields:

title
summary
actionItems
category
priority
dueDate

TITLE

Create a short natural title that represents the main idea.

SUMMARY

Summarize what the user actually said.
Preserve important context.
Do not invent facts.

ACTION ITEMS

Extract only genuine actionable tasks.

If there are no genuine tasks:
[]

Never invent tasks.

CATEGORY

Return EXACTLY ONE of:

Work
Personal
Study
Health
Finance
Meeting
Idea
Task
Shopping
Travel
Research
Reminder
Other

Normalize related meanings.

PRIORITY

Return exactly:

Low
Medium
High

Use urgency AND importance.

High:
- urgent deadline
- must happen today or extremely soon
- serious consequence if missed
- explicitly critical or urgent

Medium:
- meaningful actionable task
- upcoming deadline
- should reasonably be completed soon

Low:
- idea
- reference information
- optional task
- general thought
- no urgency
- no meaningful deadline

DUE DATE

Return:

YYYY-MM-DD

or:

null

Resolve relative dates using ${currentDate}.

Never invent a deadline.

IMPORTANT:

- preserve the speaker's meaning
- do not invent people
- do not invent deadlines
- do not invent tasks
- support a wide variety of normal voice notes
- not every capture needs action items
- not every capture needs a due date
              `,
            },

            {
              role:
                "user",

              content:
                cleanTranscript,
            },
          ],

          text: {
            format:
              zodTextFormat(
                CapturedNoteSchema,
                "captured_note"
              ),
          },
        }
      );

    const note =
      response.output_parsed;

    if (
      !note
    ) {
      return NextResponse.json(
        {
          error:
            "Could not structure note.",
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       USAGE

       OpenAI has already succeeded.

       Usage telemetry must never convert a successful AI
       response into a failed user request.
       ===================================================== */

    try {
      await incrementMonthlyUsage(
        user.id,
        "ai_captures",
        1
      );
    } catch (
      usageError
    ) {
      console.error(
        "STRUCTURE USAGE TRACKING ERROR:",
        usageError
      );
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json(
      {
        ...note,

        mock:
          false,
      },
      {
        headers: {
          "X-RateLimit-Limit":
            String(
              STRUCTURE_RATE_LIMIT.limit
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
      "STRUCTURE NOTE ERROR:",
      error
    );

    if (
      error instanceof
        OpenAI.APIError &&
      error.status ===
        429
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API credits are unavailable or the rate limit was reached.",
        },
        {
          status:
            429,
        }
      );
    }

    if (
      error instanceof
        OpenAI.APIError &&
      error.status ===
        401
    ) {
      console.error(
        "OPENAI STRUCTURE AUTHENTICATION ERROR"
      );

      return NextResponse.json(
        {
          error:
            "AI structuring service is unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to structure note.",
      },
      {
        status:
          500,
      }
    );
  }
}
