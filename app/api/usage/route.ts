import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  getUsageSummary,
} from "@/lib/usage";

/* =========================================================
   VOICE TO NOTION
   C9.1 — CURRENT USER USAGE API

   GET /api/usage
   ========================================================= */

export async function GET(
  request: Request
) {
  try {
    /* =====================================================
       AUTHENTICATE USER
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
          success:
            false,

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
       LOAD MONTHLY USAGE
       ===================================================== */

    const usage =
      await getUsageSummary(
        user.id
      );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      success:
        true,

      plan:
        "free",

      usage,
    });
  } catch (error) {
    console.error(
      "USAGE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not load usage.",
      },
      {
        status:
          500,
      }
    );
  }
}