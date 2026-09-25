
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

/* =========================================================
   VOICE TO NOTION
   C9.6.4 — PRIVATE ADMIN ANALYTICS DASHBOARD

   URL: /admin/analytics

   Authentication:
   - Uses the existing Supabase browser session.
   - The server independently verifies admin permissions.
   - Never stores or displays an access token.

   Reporting:
   - Last 30 UTC days.
   - Only aggregated analytics are returned.
   ========================================================= */

type EventType =
  | "transcription_completed"
  | "note_structured"
  | "notion_save_completed"
  | "onboarding_completed"
  | "pro_activated";

type DailyMetric = {
  date: string;
  eventType: EventType;
  totalEvents: number;
  uniqueUsers: number;
};

type AnalyticsReport = {
  success: true;
  period: {
    start: string;
    end: string;
    days: number;
    timezone: string;
  };
  summary: Record<EventType, number> & {
    activeUsers: number;
  };
  daily: DailyMetric[];
};

type DashboardState =
  | "loading"
  | "ready"
  | "signed-out"
  | "forbidden"
  | "error";

const EVENT_CONFIG: {
  key: EventType;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}[] = [
  {
    key: "transcription_completed",
    label: "Transcriptions",
    shortLabel: "Transcriptions",
    description: "Successfully transcribed recordings",
    color: "#8b5cf6",
  },
  {
    key: "note_structured",
    label: "AI structured notes",
    shortLabel: "AI notes",
    description: "Notes successfully structured by AI",
    color: "#6366f1",
  },
  {
    key: "notion_save_completed",
    label: "Notion saves",
    shortLabel: "Notion saves",
    description: "Notes successfully saved to Notion",
    color: "#06b6d4",
  },
  {
    key: "onboarding_completed",
    label: "Onboarding completions",
    shortLabel: "Onboarding",
    description: "Users who completed initial onboarding",
    color: "#10b981",
  },
  {
    key: "pro_activated",
    label: "Pro activations",
    shortLabel: "Pro",
    description: "Transitions into an active Pro plan",
    color: "#f59e0b",
  },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  );
}

function getUtcDays(start: string, end: string): string[] {
  const result: string[] = [];

  const date = new Date(start);
  const endDate = new Date(end);

  date.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(0, 0, 0, 0);

  while (date <= endDate && result.length < 31) {
    result.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return result;
}

export default function AdminAnalyticsPage() {
  const [status, setStatus] =
    useState<DashboardState>("loading");

  const [report, setReport] =
    useState<AnalyticsReport | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [selectedEvent, setSelectedEvent] =
    useState<EventType>("transcription_completed");

  const [refreshing, setRefreshing] =
    useState(false);

  /* =====================================================
     LOAD REPORT
     ===================================================== */

  const loadAnalytics = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) {
        throw new Error("Could not verify your login session.");
      }

      if (!session) {
        setReport(null);
        setStatus("signed-out");
        return;
      }

      const response = await fetch("/api/admin/analytics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        setReport(null);
        setStatus("signed-out");
        return;
      }

      if (response.status === 403) {
        setReport(null);
        setStatus("forbidden");
        return;
      }

      if (!response.ok) {
        throw new Error(
          "The analytics server could not load your report."
        );
      }

      const data = (await response.json()) as AnalyticsReport;

      if (
        !data.success ||
        !data.period ||
        !data.summary ||
        !Array.isArray(data.daily)
      ) {
        throw new Error("The analytics response was invalid.");
      }

      setReport(data);
      setStatus("ready");
      setErrorMessage("");
    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load analytics."
      );

      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const refresh = async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await loadAnalytics();
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     DAILY CHART DATA
     ===================================================== */

  const chartData = useMemo(() => {
    if (!report) return [];

    const dates = getUtcDays(
      report.period.start,
      report.period.end
    );

    return dates.map((date) => {
      const total = report.daily
        .filter(
          (item) =>
            item.date === date &&
            item.eventType === selectedEvent
        )
        .reduce(
          (sum, item) => sum + item.totalEvents,
          0
        );

      return { date, total };
    });
  }, [report, selectedEvent]);

  const maxChartValue = Math.max(
    1,
    ...chartData.map((item) => item.total)
  );

  const selectedConfig =
    EVENT_CONFIG.find(
      (item) => item.key === selectedEvent
    ) ?? EVENT_CONFIG[0];

  const totalActivity = report
    ? EVENT_CONFIG.reduce(
        (sum, item) => sum + (report.summary[item.key] ?? 0),
        0
      )
    : 0;

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <main className="min-h-screen bg-[#0c0c15] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* NAVIGATION */}

        <header className="mb-12 flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/app"
              className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Back to Voice to Notion
            </Link>

            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-lg font-bold">
                V
              </div>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold tracking-[0.18em] text-violet-300">
                PRIVATE ADMIN
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Analytics dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Voice to Notion · Product analytics
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing || status === "loading"}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </header>

        {/* LOADING */}

        {status === "loading" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <h2 className="text-xl font-semibold">
              Loading analytics
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Verifying your session and retrieving the report.
            </p>
          </div>
        )}

        {/* SIGNED OUT */}

        {status === "signed-out" && (
          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">
              Authentication required
            </h2>

            <p className="mt-3 leading-relaxed text-slate-400">
              Sign in with your administrator account to
              access this private dashboard.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* FORBIDDEN */}

        {status === "forbidden" && (
          <div className="max-w-xl rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
            <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-red-300">
              403 · Access denied
            </div>

            <h2 className="text-2xl font-semibold">
              Administrator access required
            </h2>

            <p className="mt-3 leading-relaxed text-slate-400">
              Your account is signed in but is not authorized
              to access this dashboard.
            </p>

            <Link
              href="/app"
              className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/10"
            >
              Return to app
            </Link>
          </div>
        )}

        {/* ERROR */}

        {status === "error" && (
          <div className="max-w-xl rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8">
            <h2 className="text-2xl font-semibold">
              Could not load analytics
            </h2>

            <p className="mt-3 text-slate-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
            >
              Try again
            </button>
          </div>
        )}

        {/* DASHBOARD */}

        {status === "ready" && report && (
          <div className="space-y-8">
            {/* REPORT PERIOD */}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Last {report.period.days} days
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {new Date(
                    report.period.start
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}{" "}
                  –{" "}
                  {new Date(
                    report.period.end
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
                Live data · UTC
              </span>
            </div>

            {/* SUMMARY CARDS */}

            <section
              aria-label="Analytics summary"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-transparent p-6">
                <p className="text-sm font-semibold text-violet-200">
                  Active users
                </p>

                <p className="mt-5 text-5xl font-bold tracking-tight">
                  {formatNumber(
                    report.summary.activeUsers
                  )}
                </p>

                <p className="mt-4 text-sm text-slate-400">
                  Distinct users with recorded analytics events
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-semibold text-slate-300">
                  Total recorded activity
                </p>

                <p className="mt-5 text-5xl font-bold tracking-tight">
                  {formatNumber(totalActivity)}
                </p>

                <p className="mt-4 text-sm text-slate-400">
                  All tracked events during this period
                </p>
              </div>

              {EVENT_CONFIG.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="mb-5 h-1.5 w-10 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />

                  <p className="text-sm font-semibold text-slate-300">
                    {metric.label}
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight">
                    {formatNumber(
                      report.summary[metric.key] ?? 0
                    )}
                  </p>

                  <p className="mt-4 text-sm text-slate-400">
                    {metric.description}
                  </p>
                </div>
              ))}
            </section>

            {/* DAILY ACTIVITY CHART */}

            <section className="rounded-3xl border border-white/10 bg-[#151522] p-5 sm:p-8">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
                <div>
                  <h2 className="text-xl font-bold">
                    Daily activity
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Explore the activity recorded over the
                    reporting period.
                  </p>
                </div>

                <select
                  aria-label="Select analytics event"
                  value={selectedEvent}
                  onChange={(event) =>
                    setSelectedEvent(
                      event.target.value as EventType
                    )
                  }
                  className="max-w-full rounded-xl border border-white/10 bg-[#202034] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-violet-400"
                >
                  {EVENT_CONFIG.map((metric) => (
                    <option
                      key={metric.key}
                      value={metric.key}
                    >
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-5 flex items-baseline gap-3">
                <span className="text-4xl font-bold">
                  {formatNumber(
                    report.summary[selectedEvent] ?? 0
                  )}
                </span>

                <span className="text-sm text-slate-400">
                  {selectedConfig.shortLabel.toLowerCase()}
                </span>
              </div>

              <div className="flex h-52 items-end gap-1.5 border-b border-white/10 pb-2 sm:gap-2">
                {chartData.map((day) => {
                  const height =
                    day.total > 0
                      ? Math.max(
                          (day.total / maxChartValue) * 100,
                          5
                        )
                      : 0;

                  return (
                    <div
                      key={day.date}
                      className="group relative flex h-full min-w-0 flex-1 items-end"
                      title={`${day.date}: ${day.total} events`}
                    >
                      <div
                        className="w-full rounded-t-md transition-all group-hover:opacity-75"
                        style={{
                          height: `${height}%`,
                          backgroundColor:
                            selectedConfig.color,
                          opacity:
                            day.total > 0 ? 1 : 0.12,
                        }}
                      />

                      <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-700 px-2 py-1 text-xs text-white group-hover:block">
                        {day.total}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-between gap-3 text-xs text-slate-500">
                <span>
                  {chartData.length
                    ? formatUtcDate(chartData[0].date)
                    : ""}
                </span>

                <span>
                  {chartData.length
                    ? formatUtcDate(
                        chartData[chartData.length - 1].date
                      )
                    : ""}
                </span>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-slate-500">
                The chart represents recorded analytics
                events, not historical usage before event
                tracking was installed.
              </p>
            </section>

            {/* DAILY REPORT TABLE */}

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#151522]">
              <div className="border-b border-white/10 p-6">
                <h2 className="text-xl font-bold">
                  Detailed daily report
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Aggregated activity only. No individual
                  account information is displayed.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">
                        Date (UTC)
                      </th>
                      <th className="px-6 py-4">
                        Event
                      </th>
                      <th className="px-6 py-4 text-right">
                        Total
                      </th>
                      <th className="px-6 py-4 text-right">
                        Unique users
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.daily.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-14 text-center text-slate-400"
                        >
                          No analytics events recorded
                          during this period.
                        </td>
                      </tr>
                    ) : (
                      [...report.daily]
                        .reverse()
                        .map((row, index) => {
                          const config =
                            EVENT_CONFIG.find(
                              (item) =>
                                item.key === row.eventType
                            );

                          return (
                            <tr
                              key={`${row.date}-${row.eventType}-${index}`}
                              className="border-t border-white/[0.06] transition hover:bg-white/[0.03]"
                            >
                              <td className="px-6 py-4 text-sm text-slate-300">
                                {row.date}
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        config?.color ??
                                        "#94a3b8",
                                    }}
                                  />

                                  <span className="text-sm font-medium">
                                    {config?.label ??
                                      row.eventType}
                                  </span>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-right text-sm font-semibold">
                                {formatNumber(row.totalEvents)}
                              </td>

                              <td className="px-6 py-4 text-right text-sm text-slate-300">
                                {formatNumber(row.uniqueUsers)}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="pb-6 text-center text-xs leading-relaxed text-slate-500">
              Voice to Notion · Private analytics
              <br />
              All reporting timestamps use UTC.
              Events are aggregated by the server.
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}