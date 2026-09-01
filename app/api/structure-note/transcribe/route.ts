import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "Audio file is required",
        },
        {
          status: 400,
        }
      );
    }

    console.log("Received audio:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
    });

    const useMockAI = process.env.USE_MOCK_AI === "true";

    if (useMockAI) {
      return NextResponse.json({
        transcript:
          "Tomorrow I need to finish the Voice to Notion landing page and send it to Mark. This is a work task.",
        mock: true,
      });
    }

    return NextResponse.json(
      {
        error: "Real transcription is not enabled yet.",
      },
      {
        status: 501,
      }
    );
  } catch (error) {
    console.error("TRANSCRIPTION API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
      },
      {
        status: 500,
      }
    );
  }
}