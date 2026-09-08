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
      authorization.slice(
        "Bearer ".length
      );

    /*
      Verify the Supabase user.
    */

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
      Find this user's Notion connection.
    */

    const {
      data: connection,
      error: connectionError,
    } =
      await supabaseAdmin
        .from("notion_connections")
        .select(
          `
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

    /*
      Logged in but Notion not connected yet.
    */

    if (!connection) {
      return NextResponse.json({
        success: true,

        connected: false,

        user: {
          id: user.id,
          email:
            user.email ??
            null,
        },

        connection: null,
      });
    }

    return NextResponse.json({
      success: true,

      connected: true,

      user: {
        id: user.id,
        email:
          user.email ??
          null,
      },

      connection: {
        workspaceId:
          connection.workspace_id,

        workspaceName:
          connection.workspace_name,

        selectedDataSourceId:
          connection.selected_data_source_id,
      },
    });
  } catch (error) {
    console.error(
      "NOTION CONNECTION ROUTE ERROR:",
      error
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
}