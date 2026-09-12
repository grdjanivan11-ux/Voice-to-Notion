/* =========================================================
   VOICE TO NOTION
   C9.2 — PRODUCT ENTITLEMENTS

   This file defines what every plan actually unlocks.

   Stripe does NOT decide product behavior directly.
   Stripe will only update the user's plan.

   The application reads this entitlement system.
   ========================================================= */

export type PlanName =
  | "free"
  | "pro";

export type CaptureMode =
  | "general"
  | "task"
  | "meeting"
  | "idea"
  | "study"
  | "research"
  | "journal";

export type PlanEntitlements = {
  plan: PlanName;

  displayName: string;

  description: string;

  badgeLabel: string;

  monthlyAiCaptures: number;

  maxRecordingSeconds: number;

  maxNotionDestinations: number;

  localHistoryLimit: number;

  cloudHistory: boolean;

  customCaptureModes: boolean;

  smartRouting: boolean;

  autoSync: boolean;

  customInstructions: boolean;

  advancedAi: boolean;

  captureModes: CaptureMode[];
};

/* =========================================================
   FREE
   ========================================================= */

const FREE_ENTITLEMENTS:
  PlanEntitlements = {
    plan:
      "free",

    displayName:
      "Free",

    description:
      "Everything you need to turn voice into structured Notion captures.",

    badgeLabel:
      "FREE",

    monthlyAiCaptures:
      30,

    /*
      2 minutes per individual voice capture.
    */
    maxRecordingSeconds:
      120,

    maxNotionDestinations:
      1,

    /*
      Existing browser-local Recent Captures.
    */
    localHistoryLimit:
      10,

    cloudHistory:
      false,

    customCaptureModes:
      false,

    smartRouting:
      false,

    autoSync:
      false,

    customInstructions:
      false,

    advancedAi:
      false,

    captureModes: [
      "general",
    ],
  };

/* =========================================================
   PRO
   ========================================================= */

const PRO_ENTITLEMENTS:
  PlanEntitlements = {
    plan:
      "pro",

    displayName:
      "Pro",

    description:
      "A more powerful capture system for people who live in Notion.",

    badgeLabel:
      "✦ PRO",

    monthlyAiCaptures:
      500,

    /*
      15 minutes per individual capture.

      This is intentionally finite rather than "unlimited"
      so cost and abuse remain predictable.
    */
    maxRecordingSeconds:
      15 * 60,

    maxNotionDestinations:
      5,

    localHistoryLimit:
      100,

    cloudHistory:
      true,

    customCaptureModes:
      true,

    smartRouting:
      true,

    autoSync:
      true,

    customInstructions:
      true,

    advancedAi:
      true,

    captureModes: [
      "general",
      "task",
      "meeting",
      "idea",
      "study",
      "research",
      "journal",
    ],
  };

/* =========================================================
   PLAN MAP
   ========================================================= */

export const PLAN_ENTITLEMENTS:
  Record<
    PlanName,
    PlanEntitlements
  > = {
    free:
      FREE_ENTITLEMENTS,

    pro:
      PRO_ENTITLEMENTS,
  };

/* =========================================================
   HELPERS
   ========================================================= */

export function normalizePlanName(
  value:
    string |
    null |
    undefined
): PlanName {
  return value ===
    "pro"
    ? "pro"
    : "free";
}

export function getPlanEntitlements(
  plan:
    PlanName
): PlanEntitlements {
  return PLAN_ENTITLEMENTS[
    plan
  ];
}

export function canUseCaptureMode(
  plan:
    PlanName,
  mode:
    CaptureMode
) {
  return getPlanEntitlements(
    plan
  ).captureModes.includes(
    mode
  );
}

export function isProPlan(
  plan:
    PlanName
) {
  return plan ===
    "pro";
}