import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url);

    const workspaceId =
      url.searchParams.get(
        "workspaceId"
      );

    if (!workspaceId) {
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

    const {
      data: connection,
      error: connectionError,
    } =
      await supabaseAdmin
        .from(
          "notion_connections"
        )
        .select(
          "access_token, workspace_id, workspace_name, selected_data_source_id"
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
            "Notion connection was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const notion =
      new Client({
        auth:
          connection.access_token,
      });

    const response =
      await notion.search({
        filter: {
          property: "object",
          value: "data_source",
        },
        page_size: 100,
      });

    const dataSources =
      response.results.map(
        (item) => {
          const name =
            "title" in item &&
            Array.isArray(
              item.title
            )
              ? item.title
                  .map(
                    (part) =>
                      "plain_text" in
                      part
                        ? part.plain_text
                        : ""
                  )
                  .join("")
              : "Untitled";

          return {
            id: item.id,
            name:
              name ||
              "Untitled",
          };
        }
      );

    return NextResponse.json({
      success: true,

      workspace: {
        id:
          connection.workspace_id,

        name:
          connection.workspace_name,
      },

      selectedDataSourceId:
        connection.selected_data_source_id,

      dataSources,
    });
  } catch (error) {
    console.error(
      "NOTION DATABASE LIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not load Notion databases.",
      },
      {
        status: 500,
      }
    );
  }
}