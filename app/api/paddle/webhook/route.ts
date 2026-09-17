import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

/* =========================================================
   VOICE TO NOTION
   PADDLE WEBHOOK
   ========================================================= */

type PaddleCustomData = {
  supabase_user_id?: string;
  plan?: string;
  billing_interval?: string;
};

type PaddleBillingPeriod = {
  starts_at?: string;
  ends_at?: string;
};

type PaddleScheduledChange = {
  action?:
    | "cancel"
    | "pause"
    | string;

  effective_at?: string;
};

type PaddlePrice = {
  id?: string;

  billing_cycle?: {
    interval?:
      | "month"
      | "year"
      | "week"
      | "day"
      | string;

    frequency?: number;
  };
};

type PaddleSubscriptionItem = {
  price?: PaddlePrice;
};

type PaddleSubscriptionData = {
  id?: string;

  status?:
    | "active"
    | "trialing"
    | "past_due"
    | "paused"
    | "canceled"
    | string;

  customer_id?: string | null;

  custom_data?:
    | PaddleCustomData
    | null;

  current_billing_period?:
    | PaddleBillingPeriod
    | null;

  billing_cycle?: {
    interval?:
      | "month"
      | "year"
      | "week"
      | "day"
      | string;

    frequency?: number;
  };

  scheduled_change?:
    | PaddleScheduledChange
    | null;

  canceled_at?:
    | string
    | null;

  next_billed_at?:
    | string
    | null;

  items?:
    PaddleSubscriptionItem[];
};

type PaddleTransactionData = {
  id?: string;

  customer_id?:
    | string
    | null;

  subscription_id?:
    | string
    | null;

  custom_data?:
    | PaddleCustomData
    | null;

  billing_period?:
    | PaddleBillingPeriod
    | null;

  items?: Array<{
    price?: PaddlePrice;
  }>;
};

type PaddleWebhookEvent = {
  event_id?: string;

  event_type: string;

  occurred_at?: string;

  notification_id?: string;

  data:
    | PaddleSubscriptionData
    | PaddleTransactionData;
};

/* =========================================================
   SIGNATURE
   ========================================================= */

function parsePaddleSignature(
  header:
    string
) {
  const values =
    header.split(";");

  let timestamp =
    "";

  const signatures:
    string[] =
      [];

  for (
    const value of
    values
  ) {
    const [
      key,
      rawValue,
    ] =
      value.split("=");

    if (
      key ===
        "ts" &&
      rawValue
    ) {
      timestamp =
        rawValue;
    }

    if (
      key ===
        "h1" &&
      rawValue
    ) {
      signatures.push(
        rawValue
      );
    }
  }

  return {
    timestamp,
    signatures,
  };
}

function safeCompareHex(
  first:
    string,

  second:
    string
) {
  try {
    const firstBuffer =
      Buffer.from(
        first,
        "hex"
      );

    const secondBuffer =
      Buffer.from(
        second,
        "hex"
      );

    if (
      firstBuffer.length !==
      secondBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      firstBuffer,
      secondBuffer
    );
  } catch {
    return false;
  }
}

function verifyPaddleWebhook(
  rawBody:
    string,

  signatureHeader:
    string,

  secret:
    string
) {
  const {
    timestamp,
    signatures,
  } =
    parsePaddleSignature(
      signatureHeader
    );

  if (
    !timestamp ||
    signatures.length ===
      0
  ) {
    return false;
  }

  const timestampNumber =
    Number.parseInt(
      timestamp,
      10
    );

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return false;
  }

  /*
    Paddle's SDK uses a short timestamp tolerance
    to reduce replay-attack risk.

    We allow 60 seconds here because serverless
    delivery can occasionally be a little slower.
  */
  const currentUnixSeconds =
    Math.floor(
      Date.now() /
        1000
    );

  if (
    Math.abs(
      currentUnixSeconds -
        timestampNumber
    ) >
    60
  ) {
    return false;
  }

  const signedPayload =
    `${timestamp}:${rawBody}`;

  const expectedSignature =
    createHmac(
      "sha256",
      secret
    )
      .update(
        signedPayload
      )
      .digest(
        "hex"
      );

  return signatures.some(
    (
      signature
    ) =>
      safeCompareHex(
        expectedSignature,
        signature
      )
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getCustomData(
  data:
    PaddleSubscriptionData |
    PaddleTransactionData
): PaddleCustomData | null {
  const customData =
    data.custom_data;

  if (
    !customData ||
    typeof customData !==
      "object"
  ) {
    return null;
  }

  return customData;
}

function getUserIdFromData(
  data:
    PaddleSubscriptionData |
    PaddleTransactionData
) {
  const customData =
    getCustomData(
      data
    );

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

function normalizeBillingInterval(
  value:
    string |
    null |
    undefined
) {
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

function getPriceIdFromItems(
  items:
    PaddleSubscriptionItem[] |
    PaddleTransactionData["items"] |
    undefined
) {
  if (
    !items ||
    items.length ===
      0
  ) {
    return null;
  }

  return (
    items[0]
      ?.price
      ?.id ??
    null
  );
}

function isScheduledToCancel(
  subscription:
    PaddleSubscriptionData
) {
  return (
    subscription
      .scheduled_change
      ?.action ===
    "cancel"
  );
}

function isKnownSubscriptionStatus(
  value:
    string |
    undefined
):
  value is
    | "active"
    | "trialing"
    | "past_due"
    | "paused"
    | "canceled" {
  return (
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
  );
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
    PaddleWebhookEvent
) {
  const transaction =
    event.data as PaddleTransactionData;

  const userId =
    getUserIdFromData(
      transaction
    );

  if (
    !userId
  ) {
    console.warn(
      "PADDLE TRANSACTION WITHOUT SUPABASE USER:",
      {
        eventId:
          event.event_id,

        transactionId:
          transaction.id,
      }
    );

    return;
  }

  const priceId =
    getPriceIdFromItems(
      transaction.items
    );

  const interval =
    normalizeBillingInterval(
      transaction.items?.[
        0
      ]?.price
        ?.billing_cycle
        ?.interval
    );

  const periodStart =
    transaction
      .billing_period
      ?.starts_at ??
    null;

  const periodEnd =
    transaction
      .billing_period
      ?.ends_at ??
    null;

  const {
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
          transaction.customer_id ??
          null,

        paddle_subscription_id:
          transaction.subscription_id ??
          null,

        paddle_transaction_id:
          transaction.id ??
          null,

        paddle_price_id:
          priceId,

        billing_interval:
          interval,

        current_period_start:
          periodStart,

        current_period_end:
          periodEnd,

        cancel_at_period_end:
          false,

        canceled_at:
          null,

        paddle_last_event_id:
          event.event_id ??
          null,

        paddle_last_event_at:
          event.occurred_at ??
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        userId
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
}

/* =========================================================
   SUBSCRIPTION SYNC
   ========================================================= */

async function handleSubscriptionEvent(
  event:
    PaddleWebhookEvent
) {
  const subscription =
    event.data as PaddleSubscriptionData;

  const userId =
    getUserIdFromData(
      subscription
    );

  /*
    Most subscriptions created from our checkout should
    contain custom_data.

    If a later Paddle event somehow doesn't, we fall back
    to the stored subscription ID.
  */

  let targetUserId =
    userId;

  if (
    !targetUserId &&
    subscription.id
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
        "Could not resolve Paddle subscription owner."
      );
    }

    targetUserId =
      data
        ?.user_id ??
      null;
  }

  if (
    !targetUserId
  ) {
    console.warn(
      "PADDLE SUBSCRIPTION WITHOUT USER:",
      {
        eventId:
          event.event_id,

        subscriptionId:
          subscription.id,

        eventType:
          event.event_type,
      }
    );

    return;
  }

  const status =
    isKnownSubscriptionStatus(
      subscription.status
    )
      ? subscription.status
      : "active";

  const effectivePlan =
    status ===
      "active" ||
    status ===
      "trialing"
      ? "pro"
      : "free";

  const priceId =
    getPriceIdFromItems(
      subscription.items
    );

  const interval =
    normalizeBillingInterval(
      subscription
        .billing_cycle
        ?.interval
    );

  const periodStart =
    subscription
      .current_billing_period
      ?.starts_at ??
    null;

  const periodEnd =
    subscription
      .current_billing_period
      ?.ends_at ??
    null;

  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "user_plans"
      )
      .update({
        plan:
          effectivePlan,

        status,

        paddle_customer_id:
          subscription.customer_id ??
          null,

        paddle_subscription_id:
          subscription.id ??
          null,

        paddle_price_id:
          priceId,

        billing_interval:
          interval,

        current_period_start:
          periodStart,

        current_period_end:
          periodEnd,

        next_billed_at:
          subscription.next_billed_at ??
          null,

        cancel_at_period_end:
          isScheduledToCancel(
            subscription
          ),

        canceled_at:
          subscription.canceled_at ??
          null,

        paddle_last_event_id:
          event.event_id ??
          null,

        paddle_last_event_at:
          event.occurred_at ??
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        targetUserId
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
}

/* =========================================================
   POST
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
            "Webhook is not configured.",
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
      Paddle signature verification requires the exact
      raw body string.

      Do not call request.json() before verification.
    */

    const rawBody =
      await request.text();

    const valid =
      verifyPaddleWebhook(
        rawBody,
        signature,
        webhookSecret
      );

    if (
      !valid
    ) {
      console.warn(
        "INVALID PADDLE WEBHOOK SIGNATURE"
      );

      return NextResponse.json(
        {
          success:
            false,

          error:
            "Invalid signature.",
        },
        {
          status:
            401,
        }
      );
    }

    const event =
      JSON.parse(
        rawBody
      ) as PaddleWebhookEvent;

    if (
      event.event_id &&
      await eventAlreadyProcessed(
        event.event_id
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
      event.event_type
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
          event.event_type
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