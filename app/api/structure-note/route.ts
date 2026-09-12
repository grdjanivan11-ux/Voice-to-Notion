import OpenAI from "openai";

import { z } from "zod";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
  incrementMonthlyUsage,
} from "@/lib/usage";

/* =========================================================
   OPENAI
   ========================================================= */

const openai =
  new OpenAI({
    apiKey:
      process.env
        .OPENAI_API_KEY,
  });

/* =========================================================
   CATEGORIES
   ========================================================= */

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
   STRUCTURED OUTPUT
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
   POST
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
       BODY
       ===================================================== */

    const body =
      await request.json();

    const transcript =
      body.transcript;

    if (
      !transcript ||
      typeof transcript !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Transcript is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const cleanTranscript =
      transcript.trim();

    if (
      !cleanTranscript
    ) {
      return NextResponse.json(
        {
          error:
            "Transcript is empty.",
        },
        {
          status:
            400,
        }
      );
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
          "2026-09-11",

        mock:
          true,
      };

      /*
        AI captures are our primary
        SaaS usage metric.

        Only increment after a
        successful structured result.
      */

      await incrementMonthlyUsage(
        user.id,
        "ai_captures",
        1
      );

      return NextResponse.json(
        mockNote
      );
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

    const currentDate =
      new Date()
        .toISOString()
        .split(
          "T"
        )[0];

    /* =====================================================
       AI
       ===================================================== */

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

Examples:

"Remember to buy milk tomorrow."
→ "Buy milk tomorrow"

"I've been thinking about creating an AI fitness app."
→ "AI fitness app idea"

Avoid robotic titles such as:
"The speaker wants to..."

SUMMARY

Summarize what the user actually said.

Preserve important context.

Do not invent facts.

ACTION ITEMS

Extract only genuine actionable tasks.

Example:

"Buy milk and call Mark."
→
[
  "Buy milk",
  "Call Mark"
]

If the speaker is sharing information, knowledge, an idea,
an observation or a thought and there are no genuine tasks:

→ []

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

Homework, exams and schoolwork
→ Study

Business, clients and job responsibilities
→ Work

Startup ideas, product ideas and creative concepts
→ Idea

Groceries and things to purchase
→ Shopping

Trips, hotels, flights and destinations
→ Travel

Research notes and factual investigation
→ Research

Appointments and "remember to..." notes
→ Reminder

If none clearly applies
→ Other

Never create a category outside this list.

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

Examples:

"Submit the application tonight."
→ High

"Finish homework by Friday."
→ Medium

"I have an idea for an app."
→ Low

"Remember this quote."
→ Low

Do not mark everything High.

DUE DATE

Return:

YYYY-MM-DD

or:

null

Resolve relative dates using ${currentDate}.

Examples:

today
→ ${currentDate}

tomorrow
→ next calendar day

in two days
→ current date + 2 days

next Friday
→ next matching Friday

If there is no clear or reasonably implied deadline:
→ null

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

       This is our main billable metric.

       A capture counts ONLY after
       successful AI structuring.
       ===================================================== */

    await incrementMonthlyUsage(
      user.id,
      "ai_captures",
      1
    );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      ...note,

      mock:
        false,
    });
  } catch (error) {
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
            "The note was structured, but usage tracking failed. Please try again.",
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