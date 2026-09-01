import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "Audio file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error: "The recorded audio file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const useMockAI = process.env.USE_MOCK_AI === "true";

    if (useMockAI) {
      return NextResponse.json({
        transcript:
          "Tomorrow I need to finish the Voice to Notion landing page and send it to Mark. This is a work task.",
        mock: true,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    console.log("Transcribing audio:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-transcribe",
    });

    const transcript = transcription.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        {
          error: "OpenAI returned an empty transcript.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      transcript,
      mock: false,
    });
  } catch (error) {
    console.error("TRANSCRIPTION API ERROR:", error);

    if (
      error instanceof OpenAI.APIError &&
      error.status === 429
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API credits are unavailable or the rate limit was reached.",
        },
        {
          status: 429,
        }
      );
    }

    if (
      error instanceof OpenAI.APIError &&
      error.status === 401
    ) {
      return NextResponse.json(
        {
          error: "OpenAI API authentication failed.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to transcribe audio.",
      },
      {
        status: 500,
      }
    );
  }
}