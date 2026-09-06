import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } =
      await supabaseAdmin
        .from("notion_connections")
        .select("id")
        .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      connectionCount:
        data?.length ?? 0,
    });
  } catch (error) {
    console.error(
      "SUPABASE TEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not connect to Supabase.",
      },
      {
        status: 500,
      }
    );
  }
}