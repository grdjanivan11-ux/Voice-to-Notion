import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length);

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
      console.error(
        "SUPABASE USER VERIFY ERROR:",
        userError
      );

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

    const {
      data: connection,
      error: connectionError,
    } =
      await supabaseAdmin
        .from("notion_connections")
        .select(
          `
            access_token,
            workspace_id,
            workspace_name,
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
      return NextResponse.json({
        success: true,
        connected: false,
        workspace: null,
        selectedDataSourceId: null,
        dataSources: [],
      });
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
            Array.isArray(item.title)
              ? item.title
                  .map((part) =>
                    "plain_text" in part
                      ? part.plain_text
                      : ""
                  )
                  .join("")
              : "Untitled";

          return {
            id: item.id,
            name:
              name || "Untitled",
          };
        }
      );

    return NextResponse.json({
      success: true,
      connected: true,

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