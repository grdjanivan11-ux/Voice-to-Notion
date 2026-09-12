import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
  getUsageWithPlan,
} from "@/lib/usage";

/* =========================================================
   VOICE TO NOTION
   C9.2 — PLAN + ENTITLEMENTS + USAGE

   GET /api/usage
   ========================================================= */

export async function GET(
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
       PLAN + USAGE
       ===================================================== */

    const result =
      await getUsageWithPlan(
        user.id
      );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      success:
        true,

      plan:
        result.plan.name,

      planStatus:
        result.plan.status,

      planDetails: {
        name:
          result.plan.name,

        displayName:
          result.plan
            .displayName,

        status:
          result.plan.status,

        currentPeriodEnd:
          result.plan
            .currentPeriodEnd,
      },

      entitlements:
        result.plan
          .entitlements,

      usage:
        result.usage,
    });
  } catch (
    error
  ) {
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