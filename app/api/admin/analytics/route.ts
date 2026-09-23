
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/usage";

/* =========================================================
   VOICE TO NOTION
   C9.6.4 — ADMINISTRATOR ANALYTICS API

   GET /api/admin/analytics

   - Requires a valid Supabase access token
   - Requires membership in ADMIN_USER_IDS
   - Returns aggregated analytics only
   - Never returns individual user IDs
   - Disables response caching
   ========================================================= */

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const EVENT_TYPES = [
  "transcription_completed",
  "note_structured",
  "notion_save_completed",
  "onboarding_completed",
  "pro_activated",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

type AnalyticsRow = {
  user_id: string;
  event_type: string;
  amount: number;
  occurred_at: string;
};

type DailyMetric = {
  date: string;
  eventType: EventType;
  totalEvents: number;
  uniqueUsers: number;
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/* =========================================================
   ADMINISTRATOR AUTHORIZATION
   ========================================================= */

function isAdministrator(userId: string): boolean {
  const configuredIds = process.env.ADMIN_USER_IDS;

  // Fail closed if administrators have not been configured.
  if (!configuredIds) {
    return false;
  }

  const allowedIds = configuredIds
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);

  return allowedIds.includes(userId.toLowerCase());
}

/* =========================================================
   REPORTING PERIOD

   Include the current UTC day and the previous
   29 complete UTC calendar days.
   ========================================================= */

function getReportingPeriod() {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 29
    )
  );

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

/* =========================================================
   AGGREGATION
   ========================================================= */

function aggregateEvents(rows: AnalyticsRow[]) {
  const totals = Object.fromEntries(
    EVENT_TYPES.map((eventType) => [eventType, 0])
  ) as Record<EventType, number>;

  const overallUsers = new Set<string>();

  const dailyMap = new Map<
    string,
    {
      date: string;
      eventType: EventType;
      totalEvents: number;
      users: Set<string>;
    }
  >();

  for (const row of rows) {
    if (
      !EVENT_TYPES.includes(row.event_type as EventType) ||
      !Number.isInteger(row.amount) ||
      row.amount <= 0
    ) {
      continue;
    }

    const eventType = row.event_type as EventType;

    const date = row.occurred_at.slice(0, 10);

    totals[eventType] += row.amount;
    overallUsers.add(row.user_id);

    const key = `${date}:${eventType}`;

    let daily = dailyMap.get(key);

    if (!daily) {
      daily = {
        date,
        eventType,
        totalEvents: 0,
        users: new Set<string>(),
      };

      dailyMap.set(key, daily);
    }

    daily.totalEvents += row.amount;
    daily.users.add(row.user_id);
  }

  const daily: DailyMetric[] = Array.from(
    dailyMap.values()
  )
    .map((row) => ({
      date: row.date,
      eventType: row.eventType,
      totalEvents: row.totalEvents,
      uniqueUsers: row.users.size,
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.eventType.localeCompare(b.eventType)
    );

  return {
    totals,
    activeUsers: overallUsers.size,
    daily,
  };
}

/* =========================================================
   GET /api/admin/analytics
   ========================================================= */

export async function GET(request: Request) {
  try {
    /* -----------------------------------------------------
       1. Verify the Supabase session.
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       2. Verify administrator access.
       ----------------------------------------------------- */

    if (!isAdministrator(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied.",
        },
        {
          status: 403,
          headers: NO_STORE_HEADERS,
        }
      );
    }

    /* -----------------------------------------------------
       3. Retrieve recent analytics events.

       Pagination prevents Supabase's default
       row limit from silently truncating data.
       ----------------------------------------------------- */

    const period = getReportingPeriod();

    const rows: AnalyticsRow[] = [];

    for (
      let offset = 0;
      offset < MAX_ROWS;
      offset += PAGE_SIZE
    ) {
      const { data, error } = await supabaseAdmin
        .from("analytics_events")
        .select(
          "user_id,event_type,amount,occurred_at"
        )
        .gte("occurred_at", period.start)
        .lte("occurred_at", period.end)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error(
          "ADMIN ANALYTICS QUERY ERROR:",
          error
        );

        throw new Error("Analytics query failed.");
      }

      const page = (data ?? []) as AnalyticsRow[];

      rows.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      if (rows.length >= MAX_ROWS) {
        // Avoid returning misleading partial statistics.
        throw new Error(
          "Analytics report exceeds the current row limit."
        );
      }
    }

    /* -----------------------------------------------------
       4. Aggregate without exposing individual users.
       ----------------------------------------------------- */

    const report = aggregateEvents(rows);

    /* -----------------------------------------------------
       5. Return the private administrator report.
       ----------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        period: {
          start: period.start,
          end: period.end,
          days: 30,
          timezone: "UTC",
        },

        summary: {
          ...report.totals,
          activeUsers: report.activeUsers,
        },

        daily: report.daily,
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN ANALYTICS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Could not load analytics.",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}