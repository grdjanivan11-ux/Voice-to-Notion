import {
  Client,
} from "@notionhq/client";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  checkRateLimit,
} from "@/lib/rate-limit";

import {
  getAuthenticatedUser,
  incrementMonthlyUsage,
} from "@/lib/usage";

type Priority =
  | "Low"
  | "Medium"
  | "High";

const NOTION_TEXT_LIMIT =
  1900;

const MAX_JSON_REQUEST_BYTES =
  64 *
  1024;

const MAX_TITLE_CHARACTERS =
  200;

const MAX_SUMMARY_CHARACTERS =
  5_000;

const MAX_TRANSCRIPT_CHARACTERS =
  20_000;

const MAX_ACTION_ITEMS =
  50;

const MAX_ACTION_ITEM_CHARACTERS =
  1_000;

const NOTION_SAVE_RATE_LIMIT = {
  routeKey:
    "notion-save",

  limit:
    20,

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

function isValidIsoDate(
  value:
    string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}

function isValidNotionId(
  value:
    string
) {
  const normalized =
    value.replace(
      /-/g,
      ""
    );

  return /^[0-9a-fA-F]{32}$/.test(
    normalized
  );
}

const SaveNoteRequestSchema =
  z.object({
    title:
      z
        .string()
        .trim()
        .min(1)
        .max(
          MAX_TITLE_CHARACTERS
        ),

    summary:
      z
        .string()
        .max(
          MAX_SUMMARY_CHARACTERS
        ),

    actionItems:
      z
        .array(
          z
            .string()
            .max(
              MAX_ACTION_ITEM_CHARACTERS
            )
        )
        .max(
          MAX_ACTION_ITEMS
        ),

    category:
      z.enum(
        ALLOWED_CATEGORIES
      ),

    priority:
      z
        .enum([
          "Low",
          "Medium",
          "High",
        ])
        .optional()
        .default(
          "Low"
        ),

    dueDate:
      z
        .string()
        .refine(
          isValidIsoDate,
          {
            message:
              "Invalid due date.",
          }
        )
        .nullable(),

    transcript:
      z
        .string()
        .max(
          MAX_TRANSCRIPT_CHARACTERS
        ),
  });

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

function splitText(
  text:
    string,

  maxLength =
    NOTION_TEXT_LIMIT
) {
  const cleaned =
    text.trim();

  if (
    !cleaned
  ) {
    return [];
  }

  const chunks:
    string[] = [];

  let remaining =
    cleaned;

  while (
    remaining.length >
    maxLength
  ) {
    let splitIndex =
      remaining.lastIndexOf(
        " ",
        maxLength
      );

    if (
      splitIndex <=
      0
    ) {
      splitIndex =
        maxLength;
    }

    chunks.push(
      remaining
        .slice(
          0,
          splitIndex
        )
        .trim()
    );

    remaining =
      remaining
        .slice(
          splitIndex
        )
        .trim();
  }

  if (
    remaining
  ) {
    chunks.push(
      remaining
    );
  }

  return chunks;
}

function getCategoryEmoji(
  category:
    string
) {
  const normalized =
    category
      .trim()
      .toLowerCase();

  const emojiMap:
    Record<
      string,
      string
    > = {
      work:
        "💼",
      personal:
        "✨",
      study:
        "📚",
      health:
        "💪",
      finance:
        "💰",
      meeting:
        "🤝",
      idea:
        "💡",
      task:
        "✅",
      shopping:
        "🛒",
      travel:
        "✈️",
      research:
        "🔎",
      reminder:
        "⏰",
      other:
        "🎙️",
    };

  return (
    emojiMap[
      normalized
    ] ??
    "🎙️"
  );
}

export async function POST(
  request:
    Request
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
       ===================================================== */

    const rateLimit =
      await checkRateLimit(
        user.id,
        NOTION_SAVE_RATE_LIMIT
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
            "Too many Notion save requests. Please try again shortly.",

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
                NOTION_SAVE_RATE_LIMIT.limit
              ),

            "X-RateLimit-Remaining":
              "0",
          },
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
            "Note payload is too large.",

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
        "NOTION SAVE JSON PARSE ERROR:",
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
      SaveNoteRequestSchema.safeParse(
        body
      );

    if (
      !parsedBody.success
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid note data.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      title,
      summary,
      actionItems,
      category,
      priority,
      dueDate,
      transcript,
    } =
      parsedBody.data;

    /* =====================================================
       CONNECTION
       ===================================================== */

    const {
      data:
        connection,
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
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      connectionError
    ) {
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
          status:
            500,
        }
      );
    }

    if (
      !connection
    ) {
      return NextResponse.json(
        {
          error:
            "No Notion connection was found for this account.",
        },
        {
          status:
            404,
        }
      );
    }

    const dataSourceId =
      connection
        .selected_data_source_id;

    if (
      !dataSourceId
    ) {
      return NextResponse.json(
        {
          error:
            "No Notion destination has been selected.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isValidNotionId(
        dataSourceId
      )
    ) {
      console.error(
        "INVALID STORED NOTION DATA SOURCE ID:",
        {
          userId:
            user.id,
        }
      );

      return NextResponse.json(
        {
          error:
            "Your selected Notion destination is invalid. Please choose the destination again.",
        },
        {
          status:
            400,
        }
      );
    }

    const notion =
      new Client({
        auth:
          connection
            .access_token,
      });

    /* =====================================================
       CLEAN INPUT
       ===================================================== */

    const cleanTitle =
      title.trim();

    const cleanSummary =
      summary.trim() ||
      "No summary available.";

    const cleanCategory =
      category;

    const cleanPriority:
      Priority =
        priority;

    const cleanTranscript =
      transcript.trim() ||
      "No transcript available.";

    const cleanActionItems =
      actionItems
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        );

    const summaryChunks =
      splitText(
        cleanSummary
      );

    const transcriptChunks =
      splitText(
        cleanTranscript
      );

    /* =====================================================
       VERIFY DESTINATION + LOAD SCHEMA
       ===================================================== */

    let dataSource:
      Awaited<
        ReturnType<
          typeof notion
            .dataSources
            .retrieve
        >
      >;

    try {
      dataSource =
        await notion
          .dataSources
          .retrieve({
            data_source_id:
              dataSourceId,
          });
    } catch (
      error
    ) {
      console.error(
        "NOTION DATA SOURCE RETRIEVE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The selected Notion destination is no longer available. Please reconnect Notion or choose the destination again.",
        },
        {
          status:
            400,
        }
      );
    }

    const schema =
      dataSource.properties;

    type PageProperties =
      Parameters<
        typeof notion
          .pages
          .create
      >[0]["properties"];

    const pageProperties:
      PageProperties =
        {};

    const titleProperty =
      Object.entries(
        schema
      ).find(
        (
          [
            ,
            property,
          ]
        ) =>
          property.type ===
          "title"
      );

    if (
      !titleProperty
    ) {
      return NextResponse.json(
        {
          error:
            "The selected Notion database has no title property.",
        },
        {
          status:
            400,
        }
      );
    }

    const [
      titlePropertyName,
    ] =
      titleProperty;

    pageProperties[
      titlePropertyName
    ] = {
      title: [
        {
          type:
            "text",

          text: {
            content:
              cleanTitle,
          },
        },
      ],
    };

    if (
      schema.Category?.type ===
      "select"
    ) {
      pageProperties.Category =
        {
          select: {
            name:
              cleanCategory,
          },
        };
    }

    if (
      schema.Priority?.type ===
      "select"
    ) {
      pageProperties.Priority =
        {
          select: {
            name:
              cleanPriority,
          },
        };
    }

    if (
      schema.Source?.type ===
      "select"
    ) {
      pageProperties.Source =
        {
          select: {
            name:
              "Voice",
          },
        };
    }

    if (
      schema[
        "Action Count"
      ]?.type ===
      "number"
    ) {
      pageProperties[
        "Action Count"
      ] = {
        number:
          cleanActionItems.length,
      };
    }

    if (
      dueDate &&
      schema[
        "Due Date"
      ]?.type ===
        "date"
    ) {
      pageProperties[
        "Due Date"
      ] = {
        date: {
          start:
            dueDate,
        },
      };
    }

    if (
      schema.Status?.type ===
      "status"
    ) {
      const options =
        schema.Status.status
          .options;

      const preferred =
        options.find(
          (
            option
          ) =>
            option.name ===
            "Inbox"
        ) ??
        options.find(
          (
            option
          ) =>
            option.name ===
            "Not started"
        ) ??
        options[0];

      if (
        preferred
      ) {
        pageProperties.Status =
          {
            status: {
              name:
                preferred.name,
            },
          };
      }
    }

    /* =====================================================
       CREATE PREMIUM PAGE
       ===================================================== */

    const page =
      await notion.pages.create(
        {
          parent: {
            type:
              "data_source_id",

            data_source_id:
              dataSourceId,
          },

          icon: {
            type:
              "emoji",

            emoji:
              getCategoryEmoji(
                cleanCategory
              ) as any,
          },

          properties:
            pageProperties,

          children: [
            {
              object:
                "block",

              type:
                "callout",

              callout: {
                icon: {
                  type:
                    "emoji",

                  emoji:
                    "✨",
                },

                color:
                  "purple_background",

                rich_text: [
                  {
                    type:
                      "text",

                    text: {
                      content:
                        "Structured automatically by Voice to Notion",
                    },

                    annotations: {
                      bold:
                        true,
                    },
                  },
                ],
              },
            },

            {
              object:
                "block",

              type:
                "divider",

              divider:
                {},
            },

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
                        "✦ Summary",
                    },
                  },
                ],

                is_toggleable:
                  false,
              },
            },

            ...summaryChunks.map(
              (
                chunk
              ) => ({
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
                        "◈ Capture Details",
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
                "bulleted_list_item",

              bulleted_list_item:
                {
                  rich_text:
                    [
                      {
                        type:
                          "text",

                        text: {
                          content:
                            `Category: ${cleanCategory}`,
                        },
                      },
                    ],
                },
            },

            {
              object:
                "block",

              type:
                "bulleted_list_item",

              bulleted_list_item:
                {
                  rich_text:
                    [
                      {
                        type:
                          "text",

                        text: {
                          content:
                            `Priority: ${cleanPriority}`,
                        },
                      },
                    ],
                },
            },

            {
              object:
                "block",

              type:
                "bulleted_list_item",

              bulleted_list_item:
                {
                  rich_text:
                    [
                      {
                        type:
                          "text",

                        text: {
                          content:
                            `Action items: ${cleanActionItems.length}`,
                        },
                      },
                    ],
                },
            },

            {
              object:
                "block",

              type:
                "bulleted_list_item",

              bulleted_list_item:
                {
                  rich_text:
                    [
                      {
                        type:
                          "text",

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
              object:
                "block",

              type:
                "bulleted_list_item",

              bulleted_list_item:
                {
                  rich_text:
                    [
                      {
                        type:
                          "text",

                        text: {
                          content:
                            "Source: Voice capture",
                        },
                      },
                    ],
                },
            },

            {
              object:
                "block",

              type:
                "divider",

              divider:
                {},
            },

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
                  (
                    item
                  ) => ({
                    object:
                      "block" as const,

                    type:
                      "to_do" as const,

                    to_do: {
                      rich_text:
                        [
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

                    paragraph:
                      {
                        rich_text:
                          [
                            {
                              type:
                                "text" as const,

                              text: {
                                content:
                                  "No action items were detected.",
                              },

                              annotations:
                                {
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
              object:
                "block",

              type:
                "divider",

              divider:
                {},
            },

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
                        "🎙 Original Transcript",
                    },
                  },
                ],

                is_toggleable:
                  false,
              },
            },

            ...transcriptChunks.map(
              (
                chunk
              ) => ({
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
              object:
                "block",

              type:
                "divider",

              divider:
                {},
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
                        "✦ Captured, structured and organized with Voice to Notion",
                    },

                    annotations: {
                      italic:
                        true,

                      color:
                        "gray",
                    },
                  },
                ],
              },
            },
          ],
        }
      );

    /* =====================================================
       USAGE
       ===================================================== */

    try {
      await incrementMonthlyUsage(
        user.id,
        "notion_saves",
        1
      );
    } catch (
      usageError
    ) {
      console.error(
        "NOTION SAVE USAGE TRACKING ERROR:",
        usageError
      );
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        pageId:
          page.id,

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
            connection
              .workspace_id,

          name:
            connection
              .workspace_name,
        },

        dataSourceId,
      },
      {
        headers: {
          "X-RateLimit-Limit":
            String(
              NOTION_SAVE_RATE_LIMIT.limit
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
      "NOTION SAVE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save note to Notion.",
      },
      {
        status:
          500,
      }
    );
  }
}
