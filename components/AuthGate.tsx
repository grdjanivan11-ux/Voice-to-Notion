"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import type {
  Session,
} from "@supabase/supabase-js";

import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import OnboardingFlow from "@/components/OnboardingFlow";

import {
  supabaseBrowser,
} from "@/lib/supabase-browser";

type AuthGateProps = {
  children:
    ReactNode;
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

export default function AuthGate({
  children,
}: AuthGateProps) {
  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);

  const [
    checkingOnboarding,
    setCheckingOnboarding,
  ] =
    useState(true);

  const [
    onboardingCompleted,
    setOnboardingCompleted,
  ] =
    useState(false);

  const [
    onboardingStep,
    setOnboardingStep,
  ] =
    useState(1);

  const [
    onboardingError,
    setOnboardingError,
  ] =
    useState("");

  /* =======================================================
     ONBOARDING
     ======================================================= */

  async function loadOnboarding(
    activeSession:
      Session
  ) {
    setCheckingOnboarding(
      true
    );

    setOnboardingError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/onboarding",
          {
            headers: {
              Authorization:
                `Bearer ${activeSession.access_token}`,
            },

            cache:
              "no-store",
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
            "Could not load onboarding."
        );
      }

      setOnboardingCompleted(
        data.onboarding
          .completed
      );

      setOnboardingStep(
        data.onboarding
          .currentStep
      );
    } catch (
      error
    ) {
      console.error(
        "ONBOARDING LOAD ERROR:",
        error
      );

      setOnboardingError(
        error instanceof Error
          ? error.message
          : "Could not load onboarding."
      );
    } finally {
      setCheckingOnboarding(
        false
      );
    }
  }

  /* =======================================================
     SESSION
     ======================================================= */

  useEffect(() => {
    let mounted =
      true;

    async function loadSession() {
      const {
        data: {
          session:
            currentSession,
        },

        error,
      } =
        await supabaseBrowser.auth.getSession();

      if (
        !mounted
      ) {
        return;
      }

      if (
        error
      ) {
        console.error(
          "SESSION LOAD ERROR:",
          error
        );
      }

      if (
        !currentSession
      ) {
        window.location.replace(
          "/login"
        );

        return;
      }

      setSession(
        currentSession
      );

      setCheckingSession(
        false
      );

      await loadOnboarding(
        currentSession
      );
    }

    loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabaseBrowser.auth.onAuthStateChange(
        (
          _event,
          updatedSession
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          if (
            !updatedSession
          ) {
            window.location.replace(
              "/login"
            );

            return;
          }

          setSession(
            updatedSession
          );

          setCheckingSession(
            false
          );
        }
      );

    return () => {
      mounted =
        false;

      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOADING
     ======================================================= */

  if (
    checkingSession ||
    !session ||
    checkingOnboarding
  ) {
    return (
      <main className="vtn-shell flex min-h-screen items-center justify-center">

        <div className="vtn-orb vtn-orb-purple" />

        <div className="vtn-orb vtn-orb-cyan" />

        <div className="relative z-10 text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl font-black text-white shadow-[0_0_40px_rgba(139,92,246,0.3)]">
            V
          </div>

          <p className="text-sm font-semibold text-[var(--foreground)]">
            Initializing workspace
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Voice to Notion
          </p>

        </div>

      </main>
    );
  }

  /* =======================================================
     ONBOARDING LOAD ERROR
     ======================================================= */

  if (
    onboardingError
  ) {
    return (
      <main className="vtn-shell flex min-h-screen items-center justify-center px-5">

        <div className="vtn-orb vtn-orb-purple" />

        <div className="vtn-orb vtn-orb-cyan" />

        <div className="vtn-card relative z-10 w-full max-w-md p-7 text-center">

          <div className="relative z-10">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-lg font-bold text-red-300">
              !
            </div>

            <h1 className="mt-5 text-xl font-bold">
              Workspace setup unavailable
            </h1>

            <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
              Voice to Notion could not load your onboarding state.
            </p>

            <p className="mt-2 text-[11px] leading-5 text-red-300">
              {onboardingError}
            </p>

            <button
              type="button"
              onClick={() =>
                loadOnboarding(
                  session
                )
              }
              className="vtn-primary mt-6 min-h-11 w-full px-5 py-3 text-xs"
            >
              Try Again
            </button>

          </div>

        </div>

      </main>
    );
  }

  /* =======================================================
     FIRST-TIME USER
     ======================================================= */

  if (
    !onboardingCompleted
  ) {
    return (
      <OnboardingFlow
        email={
          session.user.email ??
          ""
        }
        accessToken={
          session.access_token
        }
        initialStep={
          onboardingStep
        }
        onComplete={() => {
          setOnboardingCompleted(
            true
          );
        }}
      />
    );
  }

  /* =======================================================
     WORKSPACE
     ======================================================= */

  return (
    <>
      {children}

      <GettingStartedChecklist
        accessToken={
          session.access_token
        }
      />
    </>
  );
}