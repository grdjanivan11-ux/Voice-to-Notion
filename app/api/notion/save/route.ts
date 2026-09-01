import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

type SaveNoteRequest = {
  title: string;
  summary: string;
  actionItems: string[];
  category: string;
  dueDate: string | null;
  transcript: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveNoteRequest;

    const {
      title,
      summary,
      actionItems,
      category,
      dueDate,
      transcript,
    } = body;

    const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

    if (!dataSourceId) {
      return NextResponse.json(
        {
          error: "NOTION_DATA_SOURCE_ID is missing.",
        },
        {
          status: 500,
        }
      );
    }

    if (!process.env.NOTION_TOKEN) {
      return NextResponse.json(
        {
          error: "NOTION_TOKEN is missing.",
        },
        {
          status: 500,
        }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        {
          error: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(actionItems)) {
      return NextResponse.json(
        {
          error: "Action items must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    const page = await notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId,
      },

      properties: {
        Name: {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
        },

        Category: {
          type: "select",
          select: category
            ? {
                name: category,
              }
            : null,
        },

        ...(dueDate
          ? {
              "Due Date": {
                type: "date" as const,
                date: {
                  start: dueDate,
                  end: null,
                  time_zone: null,
                },
              },
            }
          : {}),
      },

      children: [
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Summary",
                },
              },
            ],
            is_toggleable: false,
          },
        },

        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: summary || "No summary available.",
                },
              },
            ],
          },
        },

        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Action Items",
                },
              },
            ],
            is_toggleable: false,
          },
        },

        ...actionItems.map((item) => ({
          object: "block" as const,
          type: "to_do" as const,
          to_do: {
            rich_text: [
              {
                type: "text" as const,
                text: {
                  content: item,
                },
              },
            ],
            checked: false,
          },
        })),

        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Original Transcript",
                },
              },
            ],
            is_toggleable: false,
          },
        },

        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: transcript || "No transcript available.",
                },
              },
            ],
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      pageId: page.id,
      url: "url" in page ? page.url : null,
    });
  } catch (error) {
    console.error("NOTION SAVE ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown Notion error";

    return NextResponse.json(
      {
        error: "Failed to save note to Notion.",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}