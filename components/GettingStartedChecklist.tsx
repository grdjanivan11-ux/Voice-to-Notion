"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   VOICE TO NOTION
   C9.4.4 — GETTING STARTED FINAL POLISH
   ========================================================= */

type GettingStartedChecklistProps = {
  accessToken:
    string;
};

type OnboardingResponse = {
  success:
    boolean;

  onboarding?: {
    completed:
      boolean;

    currentStep:
      number;

    completedAt:
      string | null;

    firstCaptureCompleted:
      boolean;

    firstCaptureCompletedAt:
      string | null;

    checklistDismissed:
      boolean;
  };

  error?:
    string;
};

type NotionResponse = {
  success?:
    boolean;

  connected?:
    boolean;

  selectedDataSourceId?:
    string | null;

  workspace?: {
    id:
      string;

    name:
      string | null;
  } | null;

  error?:
    string;
};

type ChecklistState = {
  firstCaptureCompleted:
    boolean;

  checklistDismissed:
    boolean;

  notionConnected:
    boolean;

  destinationSelected:
    boolean;

  workspaceName:
    string | null;
};

type ChecklistItem = {
  id:
    string;

  label:
    string;

  description:
    string;

  complete:
    boolean;
};

const EMPTY_STATE:
  ChecklistState = {
    firstCaptureCompleted:
      false,

    checklistDismissed:
      false,

    notionConnected:
      false,

    destinationSelected:
      false,

    workspaceName:
      null,
  };

/* =========================================================
   COMPONENT
   ========================================================= */

export default function GettingStartedChecklist({
  accessToken,
}: GettingStartedChecklistProps) {
  const [
    state,
    setState,
  ] =
    useState<ChecklistState>(
      EMPTY_STATE
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    dismissing,
    setDismissing,
  ] =
    useState(false);

  /* =======================================================
     LOAD EVERYTHING
     ======================================================= */

  const loadChecklist =
    useCallback(
      async (
        silent =
          false
      ) => {
        if (
          silent
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError(
          ""
        );

        try {
          const [
            onboardingResponse,
            notionResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/onboarding",
                {
                  headers: {
                    Authorization:
                      `Bearer ${accessToken}`,
                  },

                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/notion/databases",
                {
                  headers: {
                    Authorization:
                      `Bearer ${accessToken}`,
                  },

                  cache:
                    "no-store",
                }
              ),
            ]);

          if (
            onboardingResponse.status ===
              401 ||
            notionResponse.status ===
              401
          ) {
            window.location.replace(
              "/login"
            );

            return;
          }

          const onboardingData =
            (await onboardingResponse.json()) as OnboardingResponse;

          const notionData =
            (await notionResponse.json()) as NotionResponse;

          if (
            !onboardingResponse.ok ||
            !onboardingData.success ||
            !onboardingData.onboarding
          ) {
            throw new Error(
              onboardingData.error ||
                "Could not load setup progress."
            );
          }

          const connected =
            notionResponse.ok &&
            notionData.success ===
              true &&
            notionData.connected ===
              true;

          setState({
            firstCaptureCompleted:
              onboardingData
                .onboarding
                .firstCaptureCompleted,

            checklistDismissed:
              onboardingData
                .onboarding
                .checklistDismissed,

            notionConnected:
              connected,

            destinationSelected:
              connected &&
              Boolean(
                notionData
                  .selectedDataSourceId
              ),

            workspaceName:
              connected
                ? notionData
                    .workspace
                    ?.name ??
                  null
                : null,
          });
        } catch (
          loadError
        ) {
          console.error(
            "GETTING STARTED LOAD ERROR:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Could not load setup progress."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        accessToken,
      ]
    );

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    loadChecklist();
  }, [
    loadChecklist,
  ]);

  /* =======================================================
     FIRST CAPTURE WATCH

     Once the checklist is visible and the first capture has
     not been completed, periodically check only onboarding.

     Notion is intentionally not polled repeatedly.
     ======================================================= */

  useEffect(() => {
    if (
      loading ||
      state
        .firstCaptureCompleted ||
      state
        .checklistDismissed
    ) {
      return;
    }

    let cancelled =
      false;

    const interval =
      window.setInterval(
        async () => {
          if (
            document.visibilityState !==
            "visible"
          ) {
            return;
          }

          try {
            const response =
              await fetch(
                "/api/onboarding",
                {
                  headers: {
                    Authorization:
                      `Bearer ${accessToken}`,
                  },

                  cache:
                    "no-store",
                }
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              response.status ===
              401
            ) {
              window.location.replace(
                "/login"
              );

              return;
            }

            const data =
              (await response.json()) as OnboardingResponse;

            if (
              !response.ok ||
              !data.success ||
              !data.onboarding
            ) {
              return;
            }

            if (
              data.onboarding
                .firstCaptureCompleted
            ) {
              setState(
                (
                  current
                ) => ({
                  ...current,

                  firstCaptureCompleted:
                    true,
                })
              );
            }
          } catch (
            watchError
          ) {
            console.error(
              "GETTING STARTED WATCH ERROR:",
              watchError
            );
          }
        },
        4000
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        interval
      );
    };
  }, [
    accessToken,
    loading,
    state
      .checklistDismissed,
    state
      .firstCaptureCompleted,
  ]);

  /* =======================================================
     REFRESH WHEN USER RETURNS

     Useful after Notion OAuth or destination changes.
     ======================================================= */

  useEffect(() => {
    function handleFocus() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadChecklist(
          true
        );
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadChecklist(
          true
        );
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    loadChecklist,
  ]);

  /* =======================================================
     CHECKLIST
     ======================================================= */

  const items =
    useMemo<
      ChecklistItem[]
    >(
      () => [
        {
          id:
            "account",

          label:
            "Account created",

          description:
            "Your secure Voice to Notion workspace is active.",

          complete:
            true,
        },

        {
          id:
            "notion",

          label:
            "Connect Notion",

          description:
            state
              .notionConnected
              ? state
                  .workspaceName
                ? `Connected to ${state.workspaceName}.`
                : "Your Notion workspace is connected."
              : "Authorize your Notion workspace.",

          complete:
            state
              .notionConnected,
        },

        {
          id:
            "destination",

          label:
            "Choose destination",

          description:
            state
              .destinationSelected
              ? "Your capture destination is synchronized."
              : "Choose the database where captures should land.",

          complete:
            state
              .destinationSelected,
        },

        {
          id:
            "capture",

          label:
            "Create first capture",

          description:
            state
              .firstCaptureCompleted
              ? "Your first note reached Notion successfully."
              : "Record, structure and send your first note to Notion.",

          complete:
            state
              .firstCaptureCompleted,
        },
      ],
      [
        state,
      ]
    );

  const completedCount =
    items.filter(
      (
        item
      ) =>
        item.complete
    ).length;

  const allComplete =
    completedCount ===
    items.length;

  const percentage =
    Math.round(
      (
        completedCount /
        items.length
      ) *
        100
    );

  const firstIncompleteId =
    items.find(
      (
        item
      ) =>
        !item.complete
    )?.id ??
    null;

  /* =======================================================
     DISMISS
     ======================================================= */

  async function dismissChecklist() {
    if (
      !allComplete ||
      dismissing
    ) {
      return;
    }

    setDismissing(
      true
    );

    setError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/onboarding",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                action:
                  "dismiss_checklist",
              }),
          }
        );

      const data =
        (await response.json()) as OnboardingResponse;

      if (
        response.status ===
        401
      ) {
        window.location.replace(
          "/login"
        );

        return;
      }

      if (
        !response.ok ||
        !data.success ||
        !data.onboarding
      ) {
        throw new Error(
          data.error ||
            "Could not dismiss checklist."
        );
      }

      setState(
        (
          current
        ) => ({
          ...current,

          checklistDismissed:
            true,
        })
      );
    } catch (
      dismissError
    ) {
      console.error(
        "GETTING STARTED DISMISS ERROR:",
        dismissError
      );

      setError(
        dismissError instanceof
          Error
          ? dismissError.message
          : "Could not dismiss checklist."
      );
    } finally {
      setDismissing(
        false
      );
    }
  }

  /* =======================================================
     HIDDEN
     ======================================================= */

  if (
    state
      .checklistDismissed
  ) {
    return null;
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <aside
      aria-label="Getting started checklist"
      className="
        fixed
        bottom-3
        left-3
        right-3
        z-[70]
        mx-auto
        w-auto
        max-w-[360px]
        sm:bottom-5
        sm:left-5
        sm:right-auto
        sm:mx-0
        md:bottom-6
        md:left-auto
        md:right-6
      "
    >

      <div
        className="
          max-h-[calc(100dvh-1.5rem)]
          overflow-hidden
          rounded-[24px]
          border
          border-[var(--border)]
          bg-[var(--surface)]
          shadow-[0_24px_80px_rgba(0,0,0,0.30)]
          backdrop-blur-xl
          sm:max-h-[calc(100dvh-2.5rem)]
        "
      >

        <div className="relative max-h-[inherit] overflow-y-auto p-4 sm:p-5">

          <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <div className="vtn-eyebrow">
                  <span className="vtn-eyebrow-dot" />

                  Getting Started
                </div>

                <h2 className="mt-2 text-base font-bold tracking-[-0.025em]">
                  {allComplete
                    ? "Setup complete"
                    : "Finish your workspace"}
                </h2>

                <p
                  aria-live="polite"
                  className="mt-1 text-[10px] leading-5 text-[var(--muted)]"
                >
                  {allComplete
                    ? "Your Voice to Notion capture system is fully initialized."
                    : `${completedCount} of ${items.length} steps complete`}
                </p>

              </div>

              <div
                aria-label={
                  allComplete
                    ? "Setup complete"
                    : `${completedCount} of ${items.length} setup steps complete`
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/10 text-sm font-black text-violet-300"
              >
                {allComplete
                  ? "✓"
                  : `${completedCount}/${items.length}`}
              </div>

            </div>

            <div
              aria-label={`${percentage}% complete`}
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"
            >

              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 transition-all duration-500"
                style={{
                  width:
                    `${percentage}%`,
                }}
              />

            </div>

            {loading ? (
              <div
                role="status"
                className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
              >

                <span className="vtn-spinner" />

                <span className="text-[10px] text-[var(--muted)]">
                  Checking workspace...
                </span>

              </div>
            ) : (
              <div className="mt-4 space-y-2">

                {items.map(
                  (
                    item
                  ) => {
                    const isNext =
                      !item.complete &&
                      item.id ===
                        firstIncompleteId;

                    return (
                      <div
                        key={
                          item.id
                        }
                        className={
                          isNext
                            ? "relative flex items-start gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-3"
                            : "relative flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                        }
                      >

                        <div
                          className={
                            item.complete
                              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-xs font-black text-emerald-300"
                              : isNext
                                ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-[10px] font-black text-violet-300"
                                : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[10px] text-[var(--muted)]"
                          }
                        >
                          {item.complete
                            ? "✓"
                            : isNext
                              ? "→"
                              : "○"}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-2">

                            <p className="text-[11px] font-semibold">
                              {item.label}
                            </p>

                            {isNext && (
                              <span className="rounded-full border border-violet-400/15 bg-violet-400/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-violet-300">
                                Next
                              </span>
                            )}

                          </div>

                          <p className="mt-0.5 text-[9px] leading-4 text-[var(--muted)]">
                            {item.description}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

            {refreshing && !loading && (
              <div
                role="status"
                className="mt-3 flex items-center gap-2 text-[9px] text-[var(--muted)]"
              >
                <span className="vtn-spinner" />

                Updating setup status...
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3"
              >

                <p className="text-[9px] leading-4 text-red-300">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadChecklist()
                  }
                  disabled={
                    loading
                  }
                  className="mt-2 text-[9px] font-bold text-red-200 underline decoration-red-300/30 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Try again
                </button>

              </div>
            )}

            {!allComplete &&
              !loading &&
              !error && (
                <button
                  type="button"
                  onClick={() =>
                    loadChecklist(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 text-[9px] font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh setup status"}
                </button>
              )}

            {allComplete && (
              <button
                type="button"
                onClick={
                  dismissChecklist
                }
                disabled={
                  dismissing
                }
                className="vtn-primary mt-4 min-h-11 w-full px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dismissing
                  ? "Finishing..."
                  : "Done — hide checklist ✓"}
              </button>
            )}

          </div>

        </div>

      </div>

    </aside>
  );
}