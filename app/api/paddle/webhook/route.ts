import {
  Environment,
  Paddle,
} from "@paddle/paddle-node-sdk";

import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

/* =========================================================
   VOICE TO NOTION
   C9.5.7 — HARDENED PADDLE WEBHOOK
   ========================================================= */

type PaddleCustomData = {
  supabase_user_id?: string;
  plan?: string;
  billing_interval?: string;
};

type BillingInterval =
  | "month"
  | "year"
  | null;

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled";

type NormalizedTransaction = {
  id: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  customData: PaddleCustomData | null;
  priceId: string | null;
  billingInterval: BillingInterval;
  periodStart: string | null;
  periodEnd: string | null;
};

type NormalizedSubscription = {
  id: string | null;
  customerId: string | null;
  status: SubscriptionStatus | null;
  customData: PaddleCustomData | null;
  priceId: string | null;
  billingInterval: BillingInterval;
  periodStart: string | null;
  periodEnd: string | null;
  nextBilledAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
};

type PaddleEventLike = {
  eventId?: string;
  event_id?: string;
  eventType?: string;
  event_type?: string;
  occurredAt?: string;
  occurred_at?: string;
  data: unknown;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type SupabaseOperationResult<T> = {
  data: T;
  error: SupabaseErrorLike | null;
};

type ClaimWebhookEventRow = {
  claimed: boolean;
  current_status: string | null;
};

type ClaimEventOrderRow = {
  allowed: boolean;
};

/* =========================================================
   PADDLE
   ========================================================= */

function getPaddleClient() {
  const apiKey =
    process.env
      .PADDLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PADDLE_API_KEY is missing."
    );
  }

  const environment =
    process.env
      .NEXT_PUBLIC_PADDLE_ENVIRONMENT ===
    "production"
      ? Environment.production
      : Environment.sandbox;

  return new Paddle(
    apiKey,
    {
      environment,
    }
  );
}


function getAllowedProPriceIds() {
  const monthlyPriceId =
    process.env
      .NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;

  const annualPriceId =
    process.env
      .NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID;

  if (
    !monthlyPriceId ||
    !annualPriceId
  ) {
    throw new Error(
      "Paddle Pro price configuration is missing."
    );
  }

  return new Set([
    monthlyPriceId,
    annualPriceId,
  ]);
}

function assertAllowedProPriceId(
  priceId:
    string | null
) {
  if (
    !priceId
  ) {
    throw new Error(
      "Paddle event is missing a price ID."
    );
  }

  const allowedPriceIds =
    getAllowedProPriceIds();

  if (
    !allowedPriceIds.has(
      priceId
    )
  ) {
    throw new Error(
      "Paddle event contains an unrecognized price ID."
    );
  }
}


function assertPaddleId(
  value:
    string | null,
  prefix:
    string,
  label:
    string
) {
  if (
    !value ||
    !value.startsWith(
      prefix
    ) ||
    value.length <=
      prefix.length
  ) {
    throw new Error(
      `Paddle event contains an invalid ${label}.`
    );
  }
}

function assertTransactionPayload(
  transaction:
    NormalizedTransaction
) {
  assertPaddleId(
    transaction.id,
    "txn_",
    "transaction ID"
  );

  assertPaddleId(
    transaction.customerId,
    "ctm_",
    "customer ID"
  );

  assertPaddleId(
    transaction.subscriptionId,
    "sub_",
    "subscription ID"
  );

  assertTransactionPayload(
    transaction
  );
}

function assertSubscriptionPayload(
  subscription:
    NormalizedSubscription
) {
  assertPaddleId(
    subscription.id,
    "sub_",
    "subscription ID"
  );

  assertPaddleId(
    subscription.customerId,
    "ctm_",
    "customer ID"
  );

  assertSubscriptionPayload(
    subscription
  );

  if (
    !subscription.status
  ) {
    throw new Error(
      "Paddle event contains an unrecognized subscription status."
    );
  }
}

/* =========================================================
   SUPABASE RETRY SAFETY
   ========================================================= */

function sleep(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function isTransientSupabaseError(
  error: SupabaseErrorLike | null
) {
  if (!error) {
    return false;
  }

  if (
    error.code ===
    "PGRST303"
  ) {
    return true;
  }

  const message =
    error.message
      ?.toLowerCase() ??
    "";

  return (
    message.includes(
      "jwt issued at future"
    ) ||
    message.includes(
      "jwt issued in the future"
    )
  );
}

async function runSupabaseOperationWithRetry<T>(
  label: string,
  operation: () =>
    Promise<
      SupabaseOperationResult<T>
    >
): Promise<
  SupabaseOperationResult<T>
> {
  const retryDelays =
    [
      250,
      500,
      1000,
    ];

  let result =
    await operation();

  for (
    let attempt = 0;
    attempt <
    retryDelays.length;
    attempt += 1
  ) {
    if (
      !isTransientSupabaseError(
        result.error
      )
    ) {
      return result;
    }

    const delay =
      retryDelays[
        attempt
      ];

    console.warn(
      "TRANSIENT SUPABASE ERROR — RETRYING:",
      {
        label,
        attempt:
          attempt + 1,
        delay,
        code:
          result.error
            ?.code,
        message:
          result.error
            ?.message,
      }
    );

    await sleep(
      delay
    );

    result =
      await operation();
  }

  return result;
}

/* =========================================================
   GENERIC OBJECT HELPERS
   ========================================================= */

function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function asString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function getEither(
  record: Record<
    string,
    unknown
  >,
  camelKey: string,
  snakeKey: string
) {
  if (
    camelKey in
    record
  ) {
    return record[
      camelKey
    ];
  }

  return record[
    snakeKey
  ];
}

function getStringEither(
  record: Record<
    string,
    unknown
  >,
  camelKey: string,
  snakeKey: string
) {
  return asString(
    getEither(
      record,
      camelKey,
      snakeKey
    )
  );
}

/* =========================================================
   EVENT HELPERS
   ========================================================= */

function getEventId(
  event: PaddleEventLike
) {
  return (
    event.eventId ??
    event.event_id ??
    null
  );
}

function getEventType(
  event: PaddleEventLike
) {
  return (
    event.eventType ??
    event.event_type ??
    ""
  );
}

function getOccurredAt(
  event: PaddleEventLike
) {
  return (
    event.occurredAt ??
    event.occurred_at ??
    new Date()
      .toISOString()
  );
}

/* =========================================================
   CUSTOM DATA
   ========================================================= */

function getCustomData(
  value: unknown
): PaddleCustomData | null {
  const record =
    asRecord(
      value
    );

  const raw =
    getEither(
      record,
      "customData",
      "custom_data"
    );

  if (
    !raw ||
    typeof raw !==
      "object" ||
    Array.isArray(
      raw
    )
  ) {
    return null;
  }

  const custom =
    raw as Record<
      string,
      unknown
    >;

  return {
    supabase_user_id:
      asString(
        custom
          .supabase_user_id
      ) ??
      undefined,

    plan:
      asString(
        custom.plan
      ) ??
      undefined,

    billing_interval:
      asString(
        custom
          .billing_interval
      ) ??
      undefined,
  };
}

function getSupabaseUserId(
  customData:
    PaddleCustomData |
    null
) {
  const userId =
    customData
      ?.supabase_user_id;

  if (
    !userId ||
    typeof userId !==
      "string"
  ) {
    return null;
  }

  return userId;
}

/* =========================================================
   BILLING HELPERS
   ========================================================= */

function normalizeInterval(
  value: unknown
): BillingInterval {
  if (
    value ===
    "year"
  ) {
    return "year";
  }

  if (
    value ===
    "month"
  ) {
    return "month";
  }

  return null;
}

function normalizeStatus(
  value: unknown
): SubscriptionStatus | null {
  if (
    value ===
      "active" ||
    value ===
      "trialing" ||
    value ===
      "past_due" ||
    value ===
      "paused" ||
    value ===
      "canceled"
  ) {
    return value;
  }

  return null;
}

function getFirstItem(
  data: Record<
    string,
    unknown
  >
) {
  const items =
    data.items;

  if (
    !Array.isArray(
      items
    ) ||
    items.length === 0
  ) {
    return {};
  }

  return asRecord(
    items[0]
  );
}

function getPriceRecord(
  data: Record<
    string,
    unknown
  >
) {
  const item =
    getFirstItem(
      data
    );

  return asRecord(
    item.price
  );
}

function getPriceId(
  data: Record<
    string,
    unknown
  >
) {
  const price =
    getPriceRecord(
      data
    );

  return asString(
    price.id
  );
}

function getIntervalFromPrice(
  data: Record<
    string,
    unknown
  >
) {
  const price =
    getPriceRecord(
      data
    );

  const billingCycle =
    asRecord(
      getEither(
        price,
        "billingCycle",
        "billing_cycle"
      )
    );

  return normalizeInterval(
    billingCycle
      .interval
  );
}

function getBillingCycleInterval(
  data: Record<
    string,
    unknown
  >
) {
  const billingCycle =
    asRecord(
      getEither(
        data,
        "billingCycle",
        "billing_cycle"
      )
    );

  return normalizeInterval(
    billingCycle
      .interval
  );
}

function getPeriod(
  data: Record<
    string,
    unknown
  >,
  camelKey: string,
  snakeKey: string
) {
  const period =
    asRecord(
      getEither(
        data,
        camelKey,
        snakeKey
      )
    );

  return {
    start:
      getStringEither(
        period,
        "startsAt",
        "starts_at"
      ),

    end:
      getStringEither(
        period,
        "endsAt",
        "ends_at"
      ),
  };
}

/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeTransaction(
  rawData: unknown
): NormalizedTransaction {
  const data =
    asRecord(
      rawData
    );

  const period =
    getPeriod(
      data,
      "billingPeriod",
      "billing_period"
    );

  return {
    id:
      asString(
        data.id
      ),

    customerId:
      getStringEither(
        data,
        "customerId",
        "customer_id"
      ),

    subscriptionId:
      getStringEither(
        data,
        "subscriptionId",
        "subscription_id"
      ),

    customData:
      getCustomData(
        data
      ),

    priceId:
      getPriceId(
        data
      ),

    billingInterval:
      getIntervalFromPrice(
        data
      ),

    periodStart:
      period.start,

    periodEnd:
      period.end,
  };
}

function normalizeSubscription(
  rawData: unknown
): NormalizedSubscription {
  const data =
    asRecord(
      rawData
    );

  const period =
    getPeriod(
      data,
      "currentBillingPeriod",
      "current_billing_period"
    );

  const scheduledChange =
    asRecord(
      getEither(
        data,
        "scheduledChange",
        "scheduled_change"
      )
    );

  const scheduledAction =
    asString(
      scheduledChange
        .action
    );

  return {
    id:
      asString(
        data.id
      ),

    customerId:
      getStringEither(
        data,
        "customerId",
        "customer_id"
      ),

    status:
      normalizeStatus(
        data.status
      ),

    customData:
      getCustomData(
        data
      ),

    priceId:
      getPriceId(
        data
      ),

    billingInterval:
      getBillingCycleInterval(
        data
      ) ??
      getIntervalFromPrice(
        data
      ),

    periodStart:
      period.start,

    periodEnd:
      period.end,

    nextBilledAt:
      getStringEither(
        data,
        "nextBilledAt",
        "next_billed_at"
      ),

    cancelAtPeriodEnd:
      scheduledAction ===
      "cancel",

    canceledAt:
      getStringEither(
        data,
        "canceledAt",
        "canceled_at"
      ),
  };
}

/* =========================================================
   DURABLE WEBHOOK EVENT LEDGER
   ========================================================= */

async function claimWebhookEvent(
  eventId: string,
  eventType: string,
  occurredAt: string
) {
  const {
    data,
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-webhook-claim",

      async () =>
        await supabaseAdmin
          .rpc(
            "claim_paddle_webhook_event",
            {
              p_event_id:
                eventId,

              p_event_type:
                eventType,

              p_occurred_at:
                occurredAt,
            }
          )
    );

  if (
    error
  ) {
    console.error(
      "PADDLE WEBHOOK CLAIM ERROR:",
      error
    );

    throw new Error(
      "Could not claim Paddle webhook event."
    );
  }

  const row =
    Array.isArray(
      data
    )
      ? (
          data[0] as
            | ClaimWebhookEventRow
            | undefined
        )
      : (
          data as
            | ClaimWebhookEventRow
            | null
        );

  return {
    claimed:
      row?.claimed ===
      true,

    currentStatus:
      row
        ?.current_status ??
      null,
  };
}

async function finishWebhookEvent(
  eventId: string,
  status:
    "processed" |
    "failed",
  userId:
    string | null,
  errorMessage:
    string | null
) {
  const {
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-webhook-finish",

      async () =>
        await supabaseAdmin
          .rpc(
            "finish_paddle_webhook_event",
            {
              p_event_id:
                eventId,

              p_status:
                status,

              p_user_id:
                userId,

              p_error_message:
                errorMessage,
            }
          )
    );

  if (
    error
  ) {
    console.error(
      "PADDLE WEBHOOK FINISH ERROR:",
      error
    );

    throw new Error(
      "Could not finalize Paddle webhook event."
    );
  }
}


async function claimPaddleEventOrder(
  userId: string,
  eventId: string,
  occurredAt: string
) {
  const {
    data,
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-event-order-claim",

      async () =>
        await supabaseAdmin
          .rpc(
            "claim_paddle_event_order",
            {
              p_user_id:
                userId,

              p_event_id:
                eventId,

              p_occurred_at:
                occurredAt,
            }
          )
    );

  if (
    error
  ) {
    console.error(
      "PADDLE EVENT ORDER CLAIM ERROR:",
      error
    );

    throw new Error(
      "Could not verify Paddle event order."
    );
  }

  const row =
    Array.isArray(
      data
    )
      ? (
          data[0] as
            | ClaimEventOrderRow
            | undefined
        )
      : (
          data as
            | ClaimEventOrderRow
            | null
        );

  return (
    row?.allowed ===
    true
  );
}

/* =========================================================
   TRANSACTION COMPLETED
   ========================================================= */

async function handleTransactionCompleted(
  event: PaddleEventLike
) {
  const transaction =
    normalizeTransaction(
      event.data
    );

  assertAllowedProPriceId(
    transaction.priceId
  );

  const userId =
    getSupabaseUserId(
      transaction.customData
    );

  if (
    !userId
  ) {
    console.warn(
      "PADDLE TRANSACTION WITHOUT SUPABASE USER:",
      {
        eventId:
          getEventId(
            event
          ),

        transactionId:
          transaction.id,
      }
    );

    return null;
  }

  const {
    data,
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-transaction-update",

      async () =>
        await supabaseAdmin
          .from(
            "user_plans"
          )
          .update({
            plan:
              "pro",

            status:
              "active",

            paddle_customer_id:
              transaction.customerId,

            paddle_subscription_id:
              transaction.subscriptionId,

            paddle_transaction_id:
              transaction.id,

            paddle_price_id:
              transaction.priceId,

            billing_interval:
              transaction.billingInterval,

            current_period_start:
              transaction.periodStart,

            current_period_end:
              transaction.periodEnd,

            cancel_at_period_end:
              false,

            canceled_at:
              null,

            paddle_last_event_id:
              getEventId(
                event
              ),

            paddle_last_event_at:
              getOccurredAt(
                event
              ),
          })
          .eq(
            "user_id",
            userId
          )
          .select(
            "user_id"
          )
    );

  if (
    error
  ) {
    console.error(
      "PADDLE TRANSACTION UPDATE ERROR:",
      error
    );

    throw new Error(
      "Could not activate Pro."
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    throw new Error(
      "No user_plans row exists for this Paddle customer."
    );
  }

  console.log(
    "PADDLE PRO ACTIVATED:",
    {
      userId,

      transactionId:
        transaction.id,

      subscriptionId:
        transaction.subscriptionId,
    }
  );

  return userId;
}

/* =========================================================
   SUBSCRIPTION USER LOOKUP
   ========================================================= */

async function resolveSubscriptionUserId(
  subscription:
    NormalizedSubscription
) {
  const customUserId =
    getSupabaseUserId(
      subscription.customData
    );

  if (
    customUserId
  ) {
    return customUserId;
  }

  if (
    !subscription.id
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-subscription-user-lookup",

      async () =>
        await supabaseAdmin
          .from(
            "user_plans"
          )
          .select(
            "user_id"
          )
          .eq(
            "paddle_subscription_id",
            subscription.id
          )
          .maybeSingle()
    );

  if (
    error
  ) {
    console.error(
      "PADDLE SUBSCRIPTION USER LOOKUP ERROR:",
      error
    );

    throw new Error(
      "Could not resolve subscription owner."
    );
  }

  return (
    data?.user_id ??
    null
  );
}

/* =========================================================
   SUBSCRIPTION SYNC
   ========================================================= */

async function handleSubscriptionEvent(
  event: PaddleEventLike
) {
  const subscription =
    normalizeSubscription(
      event.data
    );

  assertAllowedProPriceId(
    subscription.priceId
  );

  const userId =
    await resolveSubscriptionUserId(
      subscription
    );

  if (
    !userId
  ) {
    console.warn(
      "PADDLE SUBSCRIPTION WITHOUT USER:",
      {
        eventId:
          getEventId(
            event
          ),

        eventType:
          getEventType(
            event
          ),

        subscriptionId:
          subscription.id,
      }
    );

    return null;
  }

  const eventId =
    getEventId(
      event
    );

  if (
    !eventId
  ) {
    throw new Error(
      "Paddle event ID is missing."
    );
  }

  const eventAllowed =
    await claimPaddleEventOrder(
      userId,
      eventId,
      getOccurredAt(
        event
      )
    );

  if (
    !eventAllowed
  ) {
    console.log(
      "IGNORED STALE PADDLE SUBSCRIPTION EVENT:",
      {
        userId,
        eventId,
        eventType:
          getEventType(
            event
          ),
        subscriptionId:
          subscription.id,
      }
    );

    return userId;
  }

  const subscriptionStatus =
    subscription.status;

  if (
    !subscriptionStatus
  ) {
    throw new Error(
      "Paddle event contains an unrecognized subscription status."
    );
  }

  const effectivePlan =
    subscriptionStatus ===
      "active" ||
    subscriptionStatus ===
      "trialing"
      ? "pro"
      : "free";

  const {
    data,
    error,
  } =
    await runSupabaseOperationWithRetry(
      "paddle-subscription-update",

      async () =>
        await supabaseAdmin
          .from(
            "user_plans"
          )
          .update({
            plan:
              effectivePlan,

            status:
              subscriptionStatus,

            paddle_customer_id:
              subscription.customerId,

            paddle_subscription_id:
              subscription.id,

            paddle_price_id:
              subscription.priceId,

            billing_interval:
              subscription.billingInterval,

            current_period_start:
              subscription.periodStart,

            current_period_end:
              subscription.periodEnd,

            next_billed_at:
              subscription.nextBilledAt,

            cancel_at_period_end:
              subscription.cancelAtPeriodEnd,

            canceled_at:
              subscription.canceledAt,

            paddle_last_event_id:
              eventId,

            paddle_last_event_at:
              getOccurredAt(
                event
              ),
          })
          .eq(
            "user_id",
            userId
          )
          .select(
            "user_id"
          )
    );

  if (
    error
  ) {
    console.error(
      "PADDLE SUBSCRIPTION UPDATE ERROR:",
      error
    );

    throw new Error(
      "Could not synchronize Paddle subscription."
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    throw new Error(
      "No user_plans row exists for this subscription."
    );
  }

  console.log(
    "PADDLE SUBSCRIPTION SYNCED:",
    {
      userId,

      status:
        subscriptionStatus,

      subscriptionId:
        subscription.id,

      cancelAtPeriodEnd:
        subscription.cancelAtPeriodEnd,
    }
  );

  return userId;
}

/* =========================================================
   WEBHOOK
   ========================================================= */

export async function POST(
  request: Request
) {
  let claimedEventId:
    string | null =
      null;

  let relatedUserId:
    string | null =
      null;

  try {
    const webhookSecret =
      process.env
        .PADDLE_WEBHOOK_SECRET;

    if (
      !webhookSecret
    ) {
      console.error(
        "PADDLE_WEBHOOK_SECRET is missing."
      );

      return NextResponse.json(
        {
          success:
            false,

          error:
            "Webhook service is unavailable.",
        },
        {
          status:
            500,
        }
      );
    }

    const signature =
      request.headers.get(
        "paddle-signature"
      );

    if (
      !signature
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Missing Paddle signature.",
        },
        {
          status:
            400,
        }
      );
    }

    const rawBody =
      await request.text();

    const paddle =
      getPaddleClient();

    let verifiedEvent:
      unknown;

    try {
      verifiedEvent =
        await paddle
          .webhooks
          .unmarshal(
            rawBody,
            webhookSecret,
            signature
          );
    } catch (
      verificationError
    ) {
      console.error(
        "PADDLE SIGNATURE VERIFICATION ERROR:",
        verificationError
      );

      return NextResponse.json(
        {
          success:
            false,

          error:
            "Invalid Paddle signature.",
        },
        {
          status:
            401,
        }
      );
    }

    const event =
      verifiedEvent as
        PaddleEventLike;

    const eventId =
      getEventId(
        event
      );

    const eventType =
      getEventType(
        event
      );

    const occurredAt =
      getOccurredAt(
        event
      );

    if (
      !eventId
    ) {
      throw new Error(
        "Paddle event ID is missing."
      );
    }

    if (
      !eventType
    ) {
      throw new Error(
        "Paddle event type is missing."
      );
    }

    const claim =
      await claimWebhookEvent(
        eventId,
        eventType,
        occurredAt
      );

    if (
      !claim.claimed
    ) {
      return NextResponse.json(
        {
          success:
            true,

          duplicate:
            true,

          status:
            claim.currentStatus,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    claimedEventId =
      eventId;

    switch (
      eventType
    ) {
      case "transaction.completed": {
        relatedUserId =
          await handleTransactionCompleted(
            event
          );

        break;
      }

      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.past_due":
      case "subscription.paused":
      case "subscription.resumed":
      case "subscription.canceled": {
        relatedUserId =
          await handleSubscriptionEvent(
            event
          );

        break;
      }

      default: {
        console.log(
          "IGNORED PADDLE EVENT:",
          eventType
        );
      }
    }

    await finishWebhookEvent(
      eventId,
      "processed",
      relatedUserId,
      null
    );

    return NextResponse.json(
      {
        success:
          true,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "PADDLE WEBHOOK ERROR:",
      error
    );

    if (
      claimedEventId
    ) {
      try {
        await finishWebhookEvent(
          claimedEventId,
          "failed",
          relatedUserId,
          error instanceof Error
            ? error.message
            : "Webhook processing failed."
        );
      } catch (
        finishError
      ) {
        console.error(
          "PADDLE WEBHOOK FAILURE MARK ERROR:",
          finishError
        );
      }
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Webhook processing failed.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
