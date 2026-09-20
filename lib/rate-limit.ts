import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

type RateLimitConfig = {
  routeKey: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  requestCount: number;
  remaining: number;
  resetAt: string | null;
};

type SupabaseRateLimitRow = {
  allowed: boolean;
  request_count: number;
  remaining: number;
  reset_at: string;
};

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    routeKey,
    limit,
    windowSeconds,
  } = config;

  if (
    !userId
  ) {
    throw new Error(
      "Rate limit user ID is required."
    );
  }

  if (
    !routeKey.trim()
  ) {
    throw new Error(
      "Rate limit route key is required."
    );
  }

  if (
    !Number.isSafeInteger(
      limit
    ) ||
    limit <=
      0
  ) {
    throw new Error(
      "Rate limit must be a positive integer."
    );
  }

  if (
    !Number.isSafeInteger(
      windowSeconds
    ) ||
    windowSeconds <=
      0
  ) {
    throw new Error(
      "Rate limit window must be a positive integer."
    );
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        p_user_id:
          userId,

        p_route_key:
          routeKey,

        p_limit:
          limit,

        p_window_seconds:
          windowSeconds,
      }
    );

  if (
    error
  ) {
    console.error(
      "RATE LIMIT CHECK ERROR:",
      {
        routeKey,
        userId,
        code:
          error.code,
        message:
          error.message,
      }
    );

    /*
      Fail open for availability.

      Monthly plan limits and authentication still protect
      the expensive APIs if the short-term limiter becomes
      temporarily unavailable.
    */
    return {
      allowed:
        true,

      requestCount:
        0,

      remaining:
        limit,

      resetAt:
        null,
    };
  }

  const rows =
    data as
      | SupabaseRateLimitRow[]
      | null;

  const row =
    rows?.[0];

  if (
    !row
  ) {
    console.error(
      "RATE LIMIT CHECK RETURNED NO ROW:",
      {
        routeKey,
        userId,
      }
    );

    return {
      allowed:
        true,

      requestCount:
        0,

      remaining:
        limit,

      resetAt:
        null,
    };
  }

  return {
    allowed:
      row.allowed,

    requestCount:
      row.request_count,

    remaining:
      row.remaining,

    resetAt:
      row.reset_at ??
      null,
  };
}