import OpenAI from "openai";

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
   SECURE TRANSCRIPTION API

   C9.5.5 — RATE LIMITING
   ========================================================= */

const openai =
  new OpenAI({
    apiKey:
      process.env
        .OPENAI_API_KEY,
  });

const MAX_AUDIO_BYTES =
  25 *
  1024 *
  1024;

const MAX_MULTIPART_BYTES =
  MAX_AUDIO_BYTES +
  1024 *
    1024;

const TRANSCRIBE_RATE_LIMIT = {
  routeKey:
    "transcribe",

  limit:
    10,

  windowSeconds:
    60,
} as const;

const ALLOWED_AUDIO_TYPES =
  new Set([
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/m4a",
    "audio/x-m4a",
  ]);

/* =========================================================
   HELPERS
   ========================================================= */

function getNormalizedMimeType(
  type:
    string
) {
  return type
    .split(";")[0]
    .trim()
    .toLowerCase();
}

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

       Protect the expensive transcription endpoint before
       processing the upload or calling OpenAI.
       ===================================================== */

    const rateLimit =
      await checkRateLimit(
        user.id,
        TRANSCRIBE_RATE_LIMIT
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
            "Too many transcription requests. Please try again shortly.",

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
                TRANSCRIBE_RATE_LIMIT.limit
              ),

            "X-RateLimit-Remaining":
              "0",
          },
        }
      );
    }

    /* =====================================================
       PLAN + CAPTURE LIMIT
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

    const maxRecordingSeconds =
      limit.plan
        .entitlements
        .maxRecordingSeconds;

    /* =====================================================
       REQUEST SIZE

       Reject obviously oversized multipart requests before
       parsing them into memory.
       ===================================================== */

    const contentLength =
      getContentLength(
        request
      );

    if (
      contentLength !==
        null &&
      contentLength >
        MAX_MULTIPART_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Audio upload is too large. Maximum file size is 25 MB.",

          code:
            "AUDIO_TOO_LARGE",
        },
        {
          status:
            413,
        }
      );
    }

    /* =====================================================
       FORM DATA
       ===================================================== */

    let formData:
      FormData;

    try {
      formData =
        await request.formData();
    } catch (
      error
    ) {
      console.error(
        "TRANSCRIPTION FORM DATA ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Invalid audio upload.",
        },
        {
          status:
            400,
        }
      );
    }

    const audio =
      formData.get(
        "audio"
      );

    const durationValue =
      formData.get(
        "durationSeconds"
      );

    /* =====================================================
       AUDIO VALIDATION
       ===================================================== */

    if (
      !(
        audio instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Audio file is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      audio.size <=
      0
    ) {
      return NextResponse.json(
        {
          error:
            "The recorded audio file is empty.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      audio.size >
      MAX_AUDIO_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Audio upload is too large. Maximum file size is 25 MB.",

          code:
            "AUDIO_TOO_LARGE",
        },
        {
          status:
            413,
        }
      );
    }

    const mimeType =
      getNormalizedMimeType(
        audio.type
      );

    if (
      !mimeType ||
      !ALLOWED_AUDIO_TYPES.has(
        mimeType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported audio format. Use WebM, OGG, MP4, MP3, M4A or WAV.",

          code:
            "UNSUPPORTED_AUDIO_TYPE",
        },
        {
          status:
            415,
        }
      );
    }

    /* =====================================================
       DURATION VALIDATION
       ===================================================== */

    if (
      typeof durationValue !==
        "string" ||
      !/^\d+$/.test(
        durationValue
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid recording duration is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const durationSeconds =
      Number.parseInt(
        durationValue,
        10
      );

    if (
      !Number.isSafeInteger(
        durationSeconds
      ) ||
      durationSeconds <=
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Recording duration must be a positive number of seconds.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      durationSeconds >
      maxRecordingSeconds
    ) {
      return NextResponse.json(
        {
          error:
            `Recording exceeds the ${Math.max(
              1,
              Math.round(
                maxRecordingSeconds /
                  60
              )
            )}-minute ${limit.plan.displayName} plan limit.`,

          code:
            "RECORDING_LIMIT_EXCEEDED",

          plan:
            limit.plan.name,

          maxRecordingSeconds,
        },
        {
          status:
            413,
        }
      );
    }

    /* =====================================================
       MOCK

       Mock requests intentionally do NOT consume real usage.
       ===================================================== */

    const useMockAI =
      process.env
        .USE_MOCK_AI ===
      "true";

    if (
      useMockAI
    ) {
      return NextResponse.json({
        transcript:
          "Tomorrow I need to finish the Voice to Notion landing page and send it to Mark. This is a work task.",

        mock:
          true,
      });
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
            "Transcription service is unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       OPENAI TRANSCRIPTION
       ===================================================== */

    const transcription =
      await openai.audio.transcriptions.create(
        {
          file:
            audio,

          model:
            "gpt-transcribe",
        }
      );

    const transcript =
      transcription.text
        ?.trim();

    if (
      !transcript
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI returned an empty transcript.",
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       USAGE

       The paid AI operation has already succeeded.

       Telemetry failure must never turn a successful
       transcription into a failed request.
       ===================================================== */

    try {
      await incrementMonthlyUsage(
        user.id,
        "transcriptions",
        1
      );

      await incrementMonthlyUsage(
        user.id,
        "transcription_seconds",
        durationSeconds
      );
    } catch (
      usageError
    ) {
      console.error(
        "TRANSCRIPTION USAGE TRACKING ERROR:",
        usageError
      );
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json(
      {
        transcript,

        mock:
          false,
      },
      {
        headers: {
          "X-RateLimit-Limit":
            String(
              TRANSCRIBE_RATE_LIMIT.limit
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
      "TRANSCRIPTION API ERROR:",
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
        "OPENAI TRANSCRIPTION AUTHENTICATION ERROR"
      );

      return NextResponse.json(
        {
          error:
            "Transcription service is unavailable.",
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
          "Failed to transcribe audio.",
      },
      {
        status:
          500,
      }
    );
  }
}
