import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CapturedNoteSchema = z.object({
  title: z.string(),
  summary: z.string(),
  actionItems: z.array(z.string()),
  category: z.string(),

  // Important:
  // Due dates must now be YYYY-MM-DD or null.
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript = body.transcript;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        {
          error: "Transcript is required.",
        },
        {
          status: 400,
        }
      );
    }

    const useMockAI = process.env.USE_MOCK_AI === "true";

    if (useMockAI) {
      return NextResponse.json({
        title: "Finish Voice-to-Notion landing page",
        summary:
          "Finish the Voice-to-Notion landing page and send it to Mark.",
        actionItems: [
          "Finish the Voice-to-Notion landing page",
          "Send it to Mark",
        ],
        category: "Work",
        dueDate: "2026-09-01",
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

    /*
     * Give GPT the real current date so phrases such as:
     *
     * "today"
     * "tomorrow"
     * "next Friday"
     *
     * can be converted into an actual ISO date.
     */
    const currentDate = new Date().toISOString().split("T")[0];

    const response = await openai.responses.parse({
      model: "gpt-5.4-mini",

      input: [
        {
          role: "system",
          content: `
You convert raw voice-note transcripts into structured productivity notes.

The current date is ${currentDate}.

Extract:

1. title
   - Short and clear.
   - Describe the main subject or task.

2. summary
   - Concisely summarize what the speaker meant.

3. actionItems
   - Return actionable tasks explicitly stated or clearly requested.
   - Do not invent unrelated tasks.

4. category
   - Return one short useful category.
   - Examples:
     Work
     Personal
     Health
     Finance
     Shopping
     Ideas
     Study
     Other

5. dueDate
   - CRITICAL: Return ONLY a calendar date in YYYY-MM-DD format.
   - Never return words such as:
     "Today"
     "Tomorrow"
     "Friday"
     "Next week"

   Convert relative dates into an actual YYYY-MM-DD date using the current
   date supplied above.

   Examples:

   If current date is 2026-09-01:

   "today"
   → 2026-09-01

   "tomorrow"
   → 2026-09-02

   If the speaker does not provide or clearly imply a due date:
   → null

Do not invent dates, people, facts, or tasks that the speaker did not state.
          `,
        },

        {
          role: "user",
          content: transcript,
        },
      ],

      text: {
        format: zodTextFormat(
          CapturedNoteSchema,
          "captured_note"
        ),
      },
    });

    const note = response.output_parsed;

    if (!note) {
      return NextResponse.json(
        {
          error: "Could not structure note.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ...note,
      mock: false,
    });
  } catch (error) {
    console.error("STRUCTURE NOTE ERROR:", error);

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
        error: "Failed to structure note.",
      },
      {
        status: 500,
      }
    );
  }
}