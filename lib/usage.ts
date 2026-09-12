import type {
  User,
} from "@supabase/supabase-js";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getPlanEntitlements,
  normalizePlanName,
  type PlanEntitlements,
  type PlanName,
} from "@/lib/entitlements";

/* =========================================================
   VOICE TO NOTION
   C9.2 — PLAN-AWARE USAGE ENGINE
   ========================================================= */

export type PlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export type UsageMetric =
  | "ai_captures"
  | "transcriptions"
  | "notion_saves"
  | "transcription_seconds";

export type UserPlan = {
  user_id: string;

  plan: PlanName;

  status: PlanStatus;

  stripe_customer_id:
    | string
    | null;

  stripe_subscription_id:
    | string
    | null;

  current_period_end:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

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

  limitReached: boolean;
};

export type PlanSummary = {
  name: PlanName;

  displayName: string;

  status: PlanStatus;

  currentPeriodEnd:
    | string
    | null;

  entitlements:
    PlanEntitlements;
};

export type UsageWithPlan = {
  plan: PlanSummary;

  usage: UsageSummary;
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
  request:
    Request
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
   USER PLAN
   ========================================================= */

export async function getUserPlan(
  userId:
    string
): Promise<UserPlan> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "user_plans"
      )
      .select(
        `
          user_id,
          plan,
          status,
          stripe_customer_id,
          stripe_subscription_id,
          current_period_end,
          created_at,
          updated_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "PLAN LOOKUP ERROR:",
      error
    );

    throw new Error(
      "Could not load plan."
    );
  }

  /*
    Missing plan rows always fall back to Free.

    We NEVER default users to Pro.
  */

  if (
    !data
  ) {
    const now =
      new Date()
        .toISOString();

    return {
      user_id:
        userId,

      plan:
        "free",

      status:
        "active",

      stripe_customer_id:
        null,

      stripe_subscription_id:
        null,

      current_period_end:
        null,

      created_at:
        now,

      updated_at:
        now,
    };
  }

  const status:
    PlanStatus =
      data.status ===
        "trialing" ||
      data.status ===
        "past_due" ||
      data.status ===
        "canceled"
        ? data.status
        : "active";

  return {
    user_id:
      data.user_id,

    plan:
      normalizePlanName(
        data.plan
      ),

    status,

    stripe_customer_id:
      data.stripe_customer_id ??
      null,

    stripe_subscription_id:
      data.stripe_subscription_id ??
      null,

    current_period_end:
      data.current_period_end ??
      null,

    created_at:
      data.created_at,

    updated_at:
      data.updated_at,
  };
}

/* =========================================================
   EFFECTIVE PLAN

   A stored Pro plan is only treated as Pro while its
   subscription state is active or trialing.

   Stripe will control these fields in C9.3.
   ========================================================= */

export function getEffectivePlan(
  plan:
    UserPlan
): PlanName {
  if (
    plan.plan ===
      "pro" &&
    (
      plan.status ===
        "active" ||
      plan.status ===
        "trialing"
    )
  ) {
    return "pro";
  }

  return "free";
}

/* =========================================================
   MONTHLY USAGE
   ========================================================= */

export async function getMonthlyUsage(
  userId:
    string
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
   INCREMENT
   ========================================================= */

export async function incrementMonthlyUsage(
  userId:
    string,

  metric:
    UsageMetric,

  amount =
    1
): Promise<MonthlyUsage> {
  if (
    !Number.isInteger(
      amount
    ) ||
    amount <=
      0
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
   PLAN + USAGE
   ========================================================= */

export async function getUsageWithPlan(
  userId:
    string
): Promise<UsageWithPlan> {
  const [
    storedPlan,
    monthlyUsage,
  ] =
    await Promise.all([
      getUserPlan(
        userId
      ),

      getMonthlyUsage(
        userId
      ),
    ]);

  const effectivePlan =
    getEffectivePlan(
      storedPlan
    );

  const entitlements =
    getPlanEntitlements(
      effectivePlan
    );

  const aiCaptures =
    monthlyUsage
      ?.ai_captures ??
    0;

  const transcriptions =
    monthlyUsage
      ?.transcriptions ??
    0;

  const notionSaves =
    monthlyUsage
      ?.notion_saves ??
    0;

  const transcriptionSeconds =
    monthlyUsage
      ?.transcription_seconds ??
    0;

  const aiCaptureLimit =
    entitlements
      .monthlyAiCaptures;

  const aiCapturesRemaining =
    Math.max(
      aiCaptureLimit -
        aiCaptures,
      0
    );

  const percentageUsed =
    aiCaptureLimit <=
    0
      ? 100
      : Math.min(
          Math.round(
            (
              aiCaptures /
              aiCaptureLimit
            ) *
              100
          ),
          100
        );

  const limitReached =
    aiCaptures >=
    aiCaptureLimit;

  return {
    plan: {
      name:
        effectivePlan,

      displayName:
        entitlements
          .displayName,

      status:
        storedPlan.status,

      currentPeriodEnd:
        storedPlan
          .current_period_end,

      entitlements,
    },

    usage: {
      periodStart:
        getCurrentUsagePeriodStart(),

      periodEnd:
        getCurrentUsagePeriodEnd(),

      aiCaptures,

      transcriptions,

      notionSaves,

      transcriptionSeconds,

      aiCaptureLimit,

      aiCapturesRemaining,

      percentageUsed,

      limitReached,
    },
  };
}

/* =========================================================
   BACKWARD-COMPATIBLE SUMMARY
   ========================================================= */

export async function getUsageSummary(
  userId:
    string
): Promise<UsageSummary> {
  const result =
    await getUsageWithPlan(
      userId
    );

  return result.usage;
}

/* =========================================================
   CAPTURE LIMIT
   ========================================================= */

export async function hasReachedCaptureLimit(
  userId:
    string
) {
  const result =
    await getUsageWithPlan(
      userId
    );

  return {
    reached:
      result.usage
        .limitReached,

    plan:
      result.plan,

    usage:
      result.usage,
  };
}

/* =========================================================
   RECORDING LIMIT
   ========================================================= */

export async function getRecordingLimit(
  userId:
    string
) {
  const result =
    await getUsageWithPlan(
      userId
    );

  return {
    plan:
      result.plan.name,

    maxRecordingSeconds:
      result.plan
        .entitlements
        .maxRecordingSeconds,
  };
}