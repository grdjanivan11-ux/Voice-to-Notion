
import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  getUsageWithPlan,
} from "@/lib/usage";

/* =========================================================
   VOICE TO NOTION

   C9.5.10 — PRODUCTION SECURITY QA

   GET /api/usage

   Returns the authenticated user's plan,
   entitlements, and usage information.

   All responses explicitly disable caching.
   ========================================================= */

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(request: Request) {
  try {
    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        {
          status: 401,
          headers: NO_STORE_HEADERS,
        }
      );
    }

    /* =====================================================
       PLAN + USAGE
       ===================================================== */

    const result = await getUsageWithPlan(user.id);

    /* =====================================================
       SUCCESS RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        success: true,
        plan: result.plan.name,
        planStatus: result.plan.status,

        planDetails: {
          name: result.plan.name,
          displayName: result.plan.displayName,
          status: result.plan.status,
          currentPeriodEnd: result.plan.currentPeriodEnd,
        },

        entitlements: result.plan.entitlements,
        usage: result.usage,
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    console.error("USAGE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not load usage.",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}