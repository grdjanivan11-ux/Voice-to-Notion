import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  incrementMonthlyUsage,
} from "@/lib/usage";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

/* =========================================================
   VOICE TO NOTION
   TRANSCRIPTION API

   C9.1:
   - requires authenticated user
   - counts successful transcriptions
   - tracks recorded seconds when supplied
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
       FORM DATA
       ===================================================== */

    const formData =
      await request.formData();

    const audio =
      formData.get(
        "audio"
      );

    const durationValue =
      formData.get(
        "durationSeconds"
      );

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
      audio.size ===
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

    /* =====================================================
       RECORDING DURATION
       ===================================================== */

    let durationSeconds =
      0;

    if (
      typeof durationValue ===
      "string"
    ) {
      const parsedDuration =
        Number.parseInt(
          durationValue,
          10
        );

      if (
        Number.isFinite(
          parsedDuration
        ) &&
        parsedDuration >
          0
      ) {
        durationSeconds =
          Math.min(
            parsedDuration,
            60 * 60 * 12
          );
      }
    }

    /* =====================================================
       MOCK MODE
       ===================================================== */

    const useMockAI =
      process.env
        .USE_MOCK_AI ===
      "true";

    if (
      useMockAI
    ) {
      /*
        Mock requests still represent
        a successful product operation,
        so we track them while testing.
      */

      await incrementMonthlyUsage(
        user.id,
        "transcriptions",
        1
      );

      if (
        durationSeconds >
        0
      ) {
        await incrementMonthlyUsage(
          user.id,
          "transcription_seconds",
          durationSeconds
        );
      }

      return NextResponse.json({
        transcript:
          "Tomorrow I need to finish the Voice to Notion landing page and send it to Mark. This is a work task.",

        mock:
          true,
      });
    }

    /* =====================================================
       OPENAI CONFIG
       ===================================================== */

    if (
      !process.env
        .OPENAI_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing.",
        },
        {
          status:
            500,
        }
      );
    }

    console.log(
      "Transcribing audio:",
      {
        userId:
          user.id,

        name:
          audio.name,

        type:
          audio.type,

        size:
          audio.size,

        durationSeconds,
      }
    );

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

       Only count successful transcription.
       ===================================================== */

    await incrementMonthlyUsage(
      user.id,
      "transcriptions",
      1
    );

    if (
      durationSeconds >
      0
    ) {
      await incrementMonthlyUsage(
        user.id,
        "transcription_seconds",
        durationSeconds
      );
    }

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      transcript,
      mock:
        false,
    });
  } catch (error) {
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
      return NextResponse.json(
        {
          error:
            "OpenAI API authentication failed.",
        },
        {
          status:
            401,
        }
      );
    }

    if (
      error instanceof
        Error &&
      error.message ===
        "Could not update usage."
    ) {
      return NextResponse.json(
        {
          error:
            "Your transcription succeeded, but usage tracking failed. Please try again.",
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