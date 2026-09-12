import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type Priority =
  | "Low"
  | "Medium"
  | "High";

type SaveNoteRequest = {
  title: string;
  summary: string;
  actionItems: string[];
  category: string;
  priority?: Priority;
  dueDate: string | null;
  transcript: string;
};

const NOTION_TEXT_LIMIT = 1900;

function splitText(
  text: string,
  maxLength = NOTION_TEXT_LIMIT
) {
  const cleaned = text.trim();

  if (!cleaned) {
    return [];
  }

  const chunks: string[] = [];

  let remaining = cleaned;

  while (
    remaining.length >
    maxLength
  ) {
    let splitIndex =
      remaining.lastIndexOf(
        " ",
        maxLength
      );

    if (splitIndex <= 0) {
      splitIndex = maxLength;
    }

    chunks.push(
      remaining
        .slice(0, splitIndex)
        .trim()
    );

    remaining =
      remaining
        .slice(splitIndex)
        .trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function getCategoryEmoji(
  category: string
) {
  const normalized =
    category
      .trim()
      .toLowerCase();

  const emojiMap: Record<
    string,
    string
  > = {
    work: "💼",
    personal: "✨",
    study: "📚",
    health: "💪",
    finance: "💰",
    meeting: "🤝",
    idea: "💡",
    task: "✅",
    shopping: "🛒",
    travel: "✈️",
    research: "🔎",
    reminder: "⏰",
    other: "🎙️",
  };

  return (
    emojiMap[normalized] ??
    "🎙️"
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
      AUTH
    */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice(
        "Bearer ".length
      );

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      REQUEST BODY
    */

    const body =
      (await request.json()) as SaveNoteRequest;

    const {
      title,
      summary,
      actionItems,
      category,
      priority,
      dueDate,
      transcript,
    } = body;

    if (
      !title ||
      typeof title !== "string"
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
    */

    const {
      data: connection,
      error: connectionError,
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
          "user_id",
          user.id
        )
        .maybeSingle();

    if (connectionError) {
      console.error(
        "NOTION CONNECTION LOOKUP ERROR:",
        connectionError
      );

      return NextResponse.json(
        {
          error:
            "Could not load your Notion connection.",
        },
        {
          status: 500,
        }
      );
    }

    if (!connection) {
      return NextResponse.json(
        {
          error:
            "No Notion connection was found for this account.",
        },
        {
          status: 404,
        }
      );
    }

    const dataSourceId =
      connection.selected_data_source_id;

    if (!dataSourceId) {
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

    const notion =
      new Client({
        auth:
          connection.access_token,
      });

    /*
      CLEAN INPUT
    */

    const cleanTitle =
      title.trim();

    const cleanSummary =
      summary?.trim() ||
      "No summary available.";

    const cleanCategory =
      category?.trim() ||
      "Other";

    const cleanPriority: Priority =
      priority === "High" ||
      priority === "Medium" ||
      priority === "Low"
        ? priority
        : "Low";

    const cleanTranscript =
      transcript?.trim() ||
      "No transcript available.";

    const cleanActionItems =
      actionItems
        .map((item) =>
          typeof item === "string"
            ? item.trim()
            : ""
        )
        .filter(Boolean);

    const summaryChunks =
      splitText(
        cleanSummary
      );

    const transcriptChunks =
      splitText(
        cleanTranscript
      );

    /*
      INSPECT NOTION SCHEMA
    */

    const dataSource =
      await notion.dataSources.retrieve({
        data_source_id:
          dataSourceId,
      });

    const schema =
      dataSource.properties;

    type PageProperties =
      Parameters<
        typeof notion.pages.create
      >[0]["properties"];

    const pageProperties: PageProperties =
      {};

    /*
      TITLE
      Locate title by TYPE,
      not by property name.
    */

    const titleProperty =
      Object.entries(
        schema
      ).find(
        ([, property]) =>
          property.type ===
          "title"
      );

    if (!titleProperty) {
      return NextResponse.json(
        {
          error:
            "The selected Notion database has no title property.",
        },
        {
          status: 400,
        }
      );
    }

    const [
      titlePropertyName,
    ] = titleProperty;

    pageProperties[
      titlePropertyName
    ] = {
      title: [
        {
          type: "text",
          text: {
            content:
              cleanTitle,
          },
        },
      ],
    };

    /*
      OPTIONAL CATEGORY
    */

    if (
      schema.Category?.type ===
      "select"
    ) {
      pageProperties.Category = {
        select: {
          name:
            cleanCategory,
        },
      };
    }

    /*
      OPTIONAL PRIORITY
    */

    if (
      schema.Priority?.type ===
      "select"
    ) {
      pageProperties.Priority = {
        select: {
          name:
            cleanPriority,
        },
      };
    }

    /*
      OPTIONAL SOURCE
    */

    if (
      schema.Source?.type ===
      "select"
    ) {
      pageProperties.Source = {
        select: {
          name: "Voice",
        },
      };
    }

    /*
      OPTIONAL ACTION COUNT
    */

    if (
      schema["Action Count"]
        ?.type === "number"
    ) {
      pageProperties[
        "Action Count"
      ] = {
        number:
          cleanActionItems.length,
      };
    }

    /*
      OPTIONAL DUE DATE
    */

    if (
      dueDate &&
      schema["Due Date"]?.type ===
        "date"
    ) {
      pageProperties[
        "Due Date"
      ] = {
        date: {
          start: dueDate,
        },
      };
    }

    /*
      OPTIONAL STATUS
    */

    if (
      schema.Status?.type ===
      "status"
    ) {
      const options =
        schema.Status.status
          .options;

      const preferred =
        options.find(
          (option) =>
            option.name ===
            "Inbox"
        ) ??
        options.find(
          (option) =>
            option.name ===
            "Not started"
        ) ??
        options[0];

      if (preferred) {
        pageProperties.Status = {
          status: {
            name:
              preferred.name,
          },
        };
      }
    }

    /*
      CREATE PAGE
    */

    const page =
      await notion.pages.create({
        parent: {
          type:
            "data_source_id",

          data_source_id:
            dataSourceId,
        },

        icon: {
          type: "emoji",

          emoji:
            getCategoryEmoji(
              cleanCategory
            ) as any,
        },

        properties:
          pageProperties,

        children: [
          {
            object: "block",
            type: "callout",

            callout: {
              icon: {
                type: "emoji",
                emoji: "✨",
              },

              color:
                "purple_background",

              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "Structured automatically by Voice to Notion",
                  },

                  annotations: {
                    bold: true,
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type: "divider",
            divider: {},
          },

          {
            object: "block",
            type: "heading_2",

            heading_2: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content:
                      "✦ Summary",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          ...summaryChunks.map(
            (chunk) => ({
              object:
                "block" as const,

              type:
                "paragraph" as const,

              paragraph: {
                rich_text: [
                  {
                    type:
                      "text" as const,

                    text: {
                      content:
                        chunk,
                    },
                  },
                ],
              },
            })
          ),

          {
            object: "block",
            type: "heading_2",

            heading_2: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "◈ Capture Details",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          {
            object: "block",
            type:
              "bulleted_list_item",

            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      `Category: ${cleanCategory}`,
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type:
              "bulleted_list_item",

            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      `Priority: ${cleanPriority}`,
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type:
              "bulleted_list_item",

            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      `Action items: ${cleanActionItems.length}`,
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type:
              "bulleted_list_item",

            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      dueDate
                        ? `Due date: ${dueDate}`
                        : "Due date: None",
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type:
              "bulleted_list_item",

            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "Source: Voice capture",
                  },
                },
              ],
            },
          },

          {
            object: "block",
            type: "divider",
            divider: {},
          },

          {
            object: "block",
            type: "heading_2",

            heading_2: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "✓ Action Items",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          ...(cleanActionItems.length
            ? cleanActionItems.map(
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
              )
            : [
                {
                  object:
                    "block" as const,

                  type:
                    "paragraph" as const,

                  paragraph: {
                    rich_text: [
                      {
                        type:
                          "text" as const,

                        text: {
                          content:
                            "No action items were detected.",
                        },

                        annotations: {
                          italic:
                            true,

                          color:
                            "gray" as const,
                        },
                      },
                    ],
                  },
                },
              ]),

          {
            object: "block",
            type: "divider",
            divider: {},
          },

          {
            object: "block",
            type: "heading_2",

            heading_2: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "🎙 Original Transcript",
                  },
                },
              ],

              is_toggleable:
                false,
            },
          },

          ...transcriptChunks.map(
            (chunk) => ({
              object:
                "block" as const,

              type:
                "quote" as const,

              quote: {
                rich_text: [
                  {
                    type:
                      "text" as const,

                    text: {
                      content:
                        chunk,
                    },
                  },
                ],
              },
            })
          ),

          {
            object: "block",
            type: "divider",
            divider: {},
          },

          {
            object: "block",
            type: "paragraph",

            paragraph: {
              rich_text: [
                {
                  type: "text",

                  text: {
                    content:
                      "✦ Captured, structured and organized with Voice to Notion",
                  },

                  annotations: {
                    italic: true,
                    color: "gray",
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

      url:
        "url" in page
          ? page.url
          : null,

      metadata: {
        category:
          cleanCategory,

        priority:
          cleanPriority,

        actionCount:
          cleanActionItems.length,
      },

      workspace: {
        id:
          connection.workspace_id,

        name:
          connection.workspace_name,
      },

      dataSourceId,
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