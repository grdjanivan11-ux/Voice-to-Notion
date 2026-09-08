import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type SaveNoteRequest = {
  title: string;
  summary: string;
  actionItems: string[];
  category: string;
  dueDate: string | null;
  transcript: string;
  workspaceId: string;
};

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as SaveNoteRequest;

    const {
      title,
      summary,
      actionItems,
      category,
      dueDate,
      transcript,
      workspaceId,
    } = body;

    /*
      BASIC VALIDATION
    */

    if (
      !workspaceId ||
      typeof workspaceId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "workspaceId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !title ||
      typeof title !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        actionItems
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Action items must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      LOAD USER'S NOTION CONNECTION
      FROM SUPABASE
    */

    const {
      data: connection,
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
            workspace_name,
            access_token,
            selected_data_source_id
          `
        )
        .eq(
          "workspace_id",
          workspaceId
        )
        .single();

    if (
      connectionError ||
      !connection
    ) {
      console.error(
        "NOTION CONNECTION LOOKUP ERROR:",
        connectionError
      );

      return NextResponse.json(
        {
          error:
            "No Notion connection was found for this workspace.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      MAKE SURE USER SELECTED
      A DESTINATION DATABASE
    */

    if (
      !connection.selected_data_source_id
    ) {
      return NextResponse.json(
        {
          error:
            "No Notion destination has been selected.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      CREATE NOTION CLIENT USING
      THE USER'S OAUTH TOKEN
    */

    const notion =
      new Client({
        auth:
          connection.access_token,
      });

    /*
      CLEAN ACTION ITEMS
    */

    const cleanActionItems =
      actionItems
        .map((item) =>
          typeof item ===
          "string"
            ? item.trim()
            : ""
        )
        .filter(Boolean);

    /*
      CREATE NOTION PAGE
    */

    const page =
      await notion.pages.create({
        parent: {
          type:
            "data_source_id",

          data_source_id:
            connection.selected_data_source_id,
        },

        properties: {
          Name: {
            type: "title",

            title: [
              {
                type: "text",

                text: {
                  content:
                    title.trim(),
                },
              },
            ],
          },

          Category: {
            type: "select",

            select:
              category.trim()
                ? {
                    name:
                      category.trim(),
                  }
                : null,
          },

          ...(dueDate
            ? {
                "Due Date": {
                  type:
                    "date" as const,

                  date: {
                    start:
                      dueDate,

                    end: null,

                    time_zone:
                      null,
                  },
                },
              }
            : {}),
        },

        children: [
          /*
            SUMMARY
          */

          {
            object:
              "block",

            type:
              "heading_2",

            heading_2: {
              rich_text: [
                {
                  type:
                    "text",

                  text: {
                    content:
                      "Summary",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          {
            object:
              "block",

            type:
              "paragraph",

            paragraph: {
              rich_text: [
                {
                  type:
                    "text",

                  text: {
                    content:
                      summary.trim() ||
                      "No summary available.",
                  },
                },
              ],
            },
          },

          /*
            ACTION ITEMS
          */

          {
            object:
              "block",

            type:
              "heading_2",

            heading_2: {
              rich_text: [
                {
                  type:
                    "text",

                  text: {
                    content:
                      "Action Items",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          ...cleanActionItems.map(
            (item) => ({
              object:
                "block" as const,

              type:
                "to_do" as const,

              to_do: {
                rich_text: [
                  {
                    type:
                      "text" as const,

                    text: {
                      content:
                        item,
                    },
                  },
                ],

                checked:
                  false,
              },
            })
          ),

          /*
            ORIGINAL TRANSCRIPT
          */

          {
            object:
              "block",

            type:
              "heading_2",

            heading_2: {
              rich_text: [
                {
                  type:
                    "text",

                  text: {
                    content:
                      "Original Transcript",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          {
            object:
              "block",

            type:
              "paragraph",

            paragraph: {
              rich_text: [
                {
                  type:
                    "text",

                  text: {
                    content:
                      transcript.trim() ||
                      "No transcript available.",
                  },
                },
              ],
            },
          },
        ],
      });

    /*
      SUCCESS
    */

    return NextResponse.json({
      success: true,

      pageId:
        page.id,

      url:
        "url" in page
          ? page.url
          : null,

      workspace: {
        id:
          connection.workspace_id,

        name:
          connection.workspace_name,
      },

      dataSourceId:
        connection.selected_data_source_id,
    });
  } catch (error) {
    console.error(
      "NOTION SAVE ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown Notion error";

    return NextResponse.json(
      {
        error:
          "Failed to save note to Notion.",

        details:
          message,
      },
      {
        status: 500,
      }
    );
  }
}