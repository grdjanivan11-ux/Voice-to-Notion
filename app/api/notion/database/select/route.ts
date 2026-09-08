import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type SelectDatabaseRequest = {
  dataSourceId: string;
};

export async function POST(
  request: Request
) {
  try {
    /*
      VERIFY LOGGED-IN SUPABASE USER
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

    /*
      READ REQUEST BODY
    */

    const body =
      (await request.json()) as SelectDatabaseRequest;

    const {
      dataSourceId,
    } = body;

    if (
      !dataSourceId ||
      typeof dataSourceId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "dataSourceId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      UPDATE ONLY THIS USER'S
      NOTION CONNECTION
    */

    const {
      data: connection,
      error,
    } =
      await supabaseAdmin
        .from(
          "notion_connections"
        )
        .update({
          selected_data_source_id:
            dataSourceId,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          user.id
        )
        .select(
          `
            workspace_id,
            selected_data_source_id
          `
        )
        .maybeSingle();

    if (error) {
      console.error(
        "DATABASE SELECTION ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Could not save database selection.",
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

    return NextResponse.json({
      success: true,

      selectedDataSourceId:
        connection.selected_data_source_id,

      workspaceId:
        connection.workspace_id,
    });
  } catch (error) {
    console.error(
      "DATABASE SELECTION ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not save database selection.",
      },
      {
        status: 500,
      }
    );
  }
}