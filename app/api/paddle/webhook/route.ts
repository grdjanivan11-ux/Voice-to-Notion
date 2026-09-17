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
   C9.3 — VERIFIED PADDLE WEBHOOK
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
  id:
    string | null;

  customerId:
    string | null;

  subscriptionId:
    string | null;

  customData:
    PaddleCustomData | null;

  priceId:
    string | null;

  billingInterval:
    BillingInterval;

  periodStart:
    string | null;

  periodEnd:
    string | null;
};

type NormalizedSubscription = {
  id:
    string | null;

  customerId:
    string | null;

  status:
    SubscriptionStatus;

  customData:
    PaddleCustomData | null;

  priceId:
    string | null;

  billingInterval:
    BillingInterval;

  periodStart:
    string | null;

  periodEnd:
    string | null;

  nextBilledAt:
    string | null;

  cancelAtPeriodEnd:
    boolean;

  canceledAt:
    string | null;
};

type PaddleEventLike = {
  eventId?:
    string;

  event_id?:
    string;

  eventType?:
    string;

  event_type?:
    string;

  occurredAt?:
    string;

  occurred_at?:
    string;

  data:
    unknown;
};

/* =========================================================
   PADDLE
   ========================================================= */

function getPaddleClient() {
  const apiKey =
    process.env
      .PADDLE_API_KEY;

  if (
    !apiKey
  ) {
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

/* =========================================================
   GENERIC OBJECT HELPERS
   ========================================================= */

function asRecord(
  value:
    unknown
):
  Record<
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
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function getEither(
  record:
    Record<
      string,
      unknown
    >,

  camelKey:
    string,

  snakeKey:
    string
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
  record:
    Record<
      string,
      unknown
    >,

  camelKey:
    string,

  snakeKey:
    string
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
  event:
    PaddleEventLike
) {
  return (
    event.eventId ??
    event.event_id ??
    null
  );
}

function getEventType(
  event:
    PaddleEventLike
) {
  return (
    event.eventType ??
    event.event_type ??
    ""
  );
}

function getOccurredAt(
  event:
    PaddleEventLike
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
  value:
    unknown
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
  value:
    unknown
):
  BillingInterval {
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
  value:
    unknown
):
  SubscriptionStatus {
  if (
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

  return "active";
}

function getFirstItem(
  data:
    Record<
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
    items.length ===
      0
  ) {
    return {};
  }

  return asRecord(
    items[0]
  );
}

function getPriceRecord(
  data:
    Record<
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
  data:
    Record<
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
  data:
    Record<
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
  data:
    Record<
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
  data:
    Record<
      string,
      unknown
    >,

  camelKey:
    string,

  snakeKey:
    string
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
   NORMALIZE TRANSACTION
   ========================================================= */

function normalizeTransaction(
  rawData:
    unknown
):
  NormalizedTransaction {
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

/* =========================================================
   NORMALIZE SUBSCRIPTION
   ========================================================= */

function normalizeSubscription(
  rawData:
    unknown
):
  NormalizedSubscription {
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
   IDEMPOTENCY
   ========================================================= */

async function eventAlreadyProcessed(
  eventId:
    string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "user_plans"
      )
      .select(
        "user_id"
      )
      .eq(
        "paddle_last_event_id",
        eventId
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "PADDLE IDEMPOTENCY LOOKUP ERROR:",
      error
    );

    throw new Error(
      "Could not check Paddle event."
    );
  }

  return Boolean(
    data
  );
}

/* =========================================================
   TRANSACTION COMPLETED
   ========================================================= */

async function handleTransactionCompleted(
  event:
    PaddleEventLike
) {
  const eventId =
    getEventId(
      event
    );

  const transaction =
    normalizeTransaction(
      event.data
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
        eventId,
        transactionId:
          transaction.id,
      }
    );

    return;
  }

  const {
    data,
    error,
  } =
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
    data.length ===
      0
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
      .maybeSingle();

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
  event:
    PaddleEventLike
) {
  const eventId =
    getEventId(
      event
    );

  const subscription =
    normalizeSubscription(
      event.data
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
        eventId,
        eventType:
          getEventType(
            event
          ),
        subscriptionId:
          subscription.id,
      }
    );

    return;
  }

  const effectivePlan =
    subscription.status ===
      "active" ||
    subscription.status ===
      "trialing"
      ? "pro"
      : "free";

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "user_plans"
      )
      .update({
        plan:
          effectivePlan,

        status:
          subscription.status,

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
    data.length ===
      0
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
        subscription.status,
      subscriptionId:
        subscription.id,
    }
  );
}

/* =========================================================
   WEBHOOK
   ========================================================= */

export async function POST(
  request:
    Request
) {
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
            "Webhook secret is not configured.",
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

    /*
      IMPORTANT:
      Paddle requires the exact raw request body.

      Do not call request.json() before unmarshal().
    */

    const rawBody =
      await request.text();

    const paddle =
      getPaddleClient();

    let verifiedEvent:
      unknown;

    try {
      verifiedEvent =
        await paddle.webhooks.unmarshal(
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
      verifiedEvent as PaddleEventLike;

    const eventId =
      getEventId(
        event
      );

    const eventType =
      getEventType(
        event
      );

    if (
      !eventType
    ) {
      throw new Error(
        "Paddle event type is missing."
      );
    }

    if (
      eventId &&
      await eventAlreadyProcessed(
        eventId
      )
    ) {
      return NextResponse.json({
        success:
          true,

        duplicate:
          true,
      });
    }

    switch (
      eventType
    ) {
      case "transaction.completed": {
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

    return NextResponse.json({
      success:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "PADDLE WEBHOOK ERROR:",
      error
    );

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
      }
    );
  }
}