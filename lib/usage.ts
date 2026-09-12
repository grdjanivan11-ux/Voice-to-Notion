import type { User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   VOICE TO NOTION
   C9.1 — USAGE ENGINE
   ========================================================= */

export const FREE_AI_CAPTURE_LIMIT =
  30;

export type UsageMetric =
  | "ai_captures"
  | "transcriptions"
  | "notion_saves"
  | "transcription_seconds";

export type MonthlyUsage = {
  user_id: string;
  period_start: string;
  ai_captures: number;
  transcriptions: number;
  notion_saves: number;
  transcription_seconds: number;
  created_at: string;
  updated_at: string;
};

export type UsageSummary = {
  periodStart: string;
  periodEnd: string;

  aiCaptures: number;
  transcriptions: number;
  notionSaves: number;
  transcriptionSeconds: number;

  aiCaptureLimit: number;
  aiCapturesRemaining: number;

  percentageUsed: number;
};

/* =========================================================
   PERIOD HELPERS
   ========================================================= */

export function getCurrentUsagePeriodStart() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

export function getCurrentUsagePeriodEnd() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1
    )
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

export async function getAuthenticatedUser(
  request: Request
): Promise<User | null> {
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
    return null;
  }

  const accessToken =
    authorization
      .slice(
        "Bearer ".length
      )
      .trim();

  if (
    !accessToken
  ) {
    return null;
  }

  const {
    data: {
      user,
    },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

/* =========================================================
   READ CURRENT MONTH
   ========================================================= */

export async function getMonthlyUsage(
  userId: string
): Promise<MonthlyUsage | null> {
  const periodStart =
    getCurrentUsagePeriodStart();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "usage_monthly"
      )
      .select(
        `
          user_id,
          period_start,
          ai_captures,
          transcriptions,
          notion_saves,
          transcription_seconds,
          created_at,
          updated_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "period_start",
        periodStart
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "USAGE LOOKUP ERROR:",
      error
    );

    throw new Error(
      "Could not load usage."
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return data as MonthlyUsage;
}

/* =========================================================
   INCREMENT USAGE
   ========================================================= */

export async function incrementMonthlyUsage(
  userId: string,
  metric: UsageMetric,
  amount = 1
): Promise<MonthlyUsage> {
  if (
    !Number.isInteger(
      amount
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Usage amount must be a positive integer."
    );
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.rpc(
      "increment_monthly_usage",
      {
        p_user_id:
          userId,

        p_metric:
          metric,

        p_amount:
          amount,
      }
    );

  if (
    error
  ) {
    console.error(
      "USAGE INCREMENT ERROR:",
      {
        userId,
        metric,
        amount,
        error,
      }
    );

    throw new Error(
      "Could not update usage."
    );
  }

  /*
    Supabase may return either:
    - one object
    - an array containing one object

    depending on how the RPC result is represented.
  */

  const row =
    Array.isArray(
      data
    )
      ? data[0]
      : data;

  if (
    !row
  ) {
    throw new Error(
      "Usage increment returned no data."
    );
  }

  return row as MonthlyUsage;
}

/* =========================================================
   SUMMARY
   ========================================================= */

export async function getUsageSummary(
  userId: string
): Promise<UsageSummary> {
  const usage =
    await getMonthlyUsage(
      userId
    );

  const aiCaptures =
    usage?.ai_captures ??
    0;

  const transcriptions =
    usage?.transcriptions ??
    0;

  const notionSaves =
    usage?.notion_saves ??
    0;

  const transcriptionSeconds =
    usage?.transcription_seconds ??
    0;

  const remaining =
    Math.max(
      FREE_AI_CAPTURE_LIMIT -
        aiCaptures,
      0
    );

  const percentageUsed =
    Math.min(
      Math.round(
        (
          aiCaptures /
          FREE_AI_CAPTURE_LIMIT
        ) *
          100
      ),
      100
    );

  return {
    periodStart:
      getCurrentUsagePeriodStart(),

    periodEnd:
      getCurrentUsagePeriodEnd(),

    aiCaptures,

    transcriptions,

    notionSaves,

    transcriptionSeconds,

    aiCaptureLimit:
      FREE_AI_CAPTURE_LIMIT,

    aiCapturesRemaining:
      remaining,

    percentageUsed,
  };
}

/* =========================================================
   LIMIT HELPERS

   We are NOT enforcing the limit yet.

   C9.1 tracks usage first.
   C9.2 will connect this limit to plan enforcement.
   ========================================================= */

export async function hasReachedFreeCaptureLimit(
  userId: string
) {
  const usage =
    await getMonthlyUsage(
      userId
    );

  return (
    (
      usage?.ai_captures ??
      0
    ) >=
    FREE_AI_CAPTURE_LIMIT
  );
}