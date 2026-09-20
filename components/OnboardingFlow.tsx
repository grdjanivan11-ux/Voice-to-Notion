"use client";

import {
  useState,
} from "react";

import ThemeToggle from "@/components/ThemeToggle";

type OnboardingFlowProps = {
  email:
    string;

  accessToken:
    string;

  initialStep:
    number;

  onComplete:
    () => void;
};

type StepDefinition = {
  eyebrow:
    string;

  title:
    string;

  description:
    string;
};

const STEPS:
  StepDefinition[] = [
    {
      eyebrow:
        "Welcome aboard",

      title:
        "Your thoughts now have a destination.",

      description:
        "Voice to Notion turns spoken thoughts into structured, actionable knowledge without slowing you down.",
    },

    {
      eyebrow:
        "Your workflow",

      title:
        "Speak. Structure. Send.",

      description:
        "Capture naturally, let AI organize the thought, then send the finished note directly into your Notion workspace.",
    },

    {
      eyebrow:
        "System ready",

      title:
        "Your capture system is ready.",

      description:
        "You can start with a quick voice capture, connect your Notion workspace and build your knowledge system from there.",
    },
  ];

export default function OnboardingFlow({
  email,
  accessToken,
  initialStep,
  onComplete,
}: OnboardingFlowProps) {
  const [
    step,
    setStep,
  ] =
    useState(
      Math.min(
        Math.max(
          initialStep,
          1
        ),
        3
      )
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const current =
    STEPS[
      step -
        1
    ];

  /* =======================================================
     SAVE STEP
     ======================================================= */

  async function saveStep(
    nextStep:
      number
  ) {
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
                "set_step",

              step:
                nextStep,
            }),
        }
      );

    const data =
      await response.json();

    if (
      response.status ===
      401
    ) {
      window.location.replace(
        "/login"
      );

      return false;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.error ||
          "Could not save onboarding progress."
      );
    }

    return true;
  }

  /* =======================================================
     COMPLETE
     ======================================================= */

  async function completeOnboarding() {
    setSaving(
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
                  "complete",
              }),
          }
        );

      const data =
        await response.json();

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
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Could not complete onboarding."
        );
      }

      onComplete();
    } catch (
      err
    ) {
      console.error(
        "ONBOARDING COMPLETE CLIENT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not complete onboarding."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     NEXT
     ======================================================= */

  async function nextStep() {
    if (
      step >=
      3
    ) {
      await completeOnboarding();

      return;
    }

    const next =
      step +
      1;

    setSaving(
      true
    );

    setError(
      ""
    );

    try {
      const success =
        await saveStep(
          next
        );

      if (
        success
      ) {
        setStep(
          next
        );
      }
    } catch (
      err
    ) {
      console.error(
        "ONBOARDING STEP CLIENT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save onboarding progress."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     BACK
     ======================================================= */

  async function previousStep() {
    if (
      step <=
      1 ||
      saving
    ) {
      return;
    }

    const previous =
      step -
      1;

    setSaving(
      true
    );

    setError(
      ""
    );

    try {
      const success =
        await saveStep(
          previous
        );

      if (
        success
      ) {
        setStep(
          previous
        );
      }
    } catch (
      err
    ) {
      console.error(
        "ONBOARDING BACK CLIENT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save onboarding progress."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <main className="vtn-shell relative min-h-screen overflow-hidden">

      <div className="vtn-orb vtn-orb-purple" />

      <div className="vtn-orb vtn-orb-cyan" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">

        <div className="flex items-center gap-3">

          <div className="vtn-brand-mark">
            V
          </div>

          <div>

            <div className="flex items-center gap-2">

              <p className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                Voice to Notion
              </p>

              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-violet-300">
                Setup
              </span>

            </div>

            <div className="mt-1 flex items-center gap-2">

              <span className="vtn-status-dot" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                Initializing workspace
              </span>

            </div>

          </div>

        </div>

        <ThemeToggle />

      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1180px] items-center justify-center px-5 pb-12 sm:px-8">

        <section className="w-full max-w-[920px]">

          <div className="mb-6 flex items-center justify-between gap-4">

            <div>

              <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-[var(--muted)]">
                Account
              </p>

              <p className="mt-1 max-w-[280px] truncate text-xs font-medium text-[var(--foreground)]">
                {email ||
                  "Voice to Notion account"}
              </p>

            </div>

            <div className="flex items-center gap-2">

              {STEPS.map(
                (
                  _item,
                  index
                ) => {
                  const number =
                    index +
                    1;

                  return (
                    <div
                      key={
                        number
                      }
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        number <=
                        step
                          ? "w-9 bg-gradient-to-r from-violet-500 to-cyan-400"
                          : "w-5 bg-[var(--border)]"
                      }`}
                    />
                  );
                }
              )}

            </div>

          </div>

          <div className="vtn-card overflow-hidden">

            <div className="relative z-10 grid min-h-[540px] lg:grid-cols-[0.92fr_1.08fr]">

              <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface-soft)] p-7 sm:p-9 lg:border-b-0 lg:border-r">

                <div className="absolute -left-12 -top-12 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

                <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative flex h-full flex-col">

                  <div className="mb-auto">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-2xl font-black text-violet-300 shadow-[0_0_45px_rgba(139,92,246,0.12)]">
                      {step ===
                      1
                        ? "✦"
                        : step ===
                            2
                          ? "→"
                          : "✓"}
                    </div>

                    <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-violet-400">
                      Step {step} of 3
                    </p>

                    <h2 className="mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.045em] text-[var(--foreground)] sm:text-4xl">
                      {current.title}
                    </h2>

                    <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">
                      {current.description}
                    </p>

                  </div>

                  <div className="mt-10">

                    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">

                      <span>
                        Voice
                      </span>

                      <span className="vtn-footer-dot" />

                      <span>
                        AI
                      </span>

                      <span className="vtn-footer-dot" />

                      <span>
                        Notion
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              <div className="flex flex-col p-7 sm:p-9">

                <div>

                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--violet-soft)]">
                    {current.eyebrow}
                  </span>

                  {step ===
                    1 && (
                    <div className="mt-7 grid gap-3">

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

                        <div className="flex items-start gap-4">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                            🎙
                          </div>

                          <div>

                            <p className="text-sm font-semibold">
                              Capture naturally
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              Speak the thought instead of stopping to organize it manually.
                            </p>

                          </div>

                        </div>

                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

                        <div className="flex items-start gap-4">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
                            ✦
                          </div>

                          <div>

                            <p className="text-sm font-semibold">
                              AI does the structure
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              Titles, summaries, action items and organization are generated automatically.
                            </p>

                          </div>

                        </div>

                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

                        <div className="flex items-start gap-4">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-xs font-black text-emerald-300">
                            N
                          </div>

                          <div>

                            <p className="text-sm font-semibold">
                              Send it to Notion
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              Your finished capture can land directly in your chosen Notion destination.
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                  {step ===
                    2 && (
                    <div className="mt-8">

                      <div className="relative">

                        <div className="absolute left-5 top-10 h-[calc(100%-80px)] w-px bg-gradient-to-b from-violet-500/50 via-cyan-400/40 to-emerald-400/40" />

                        <div className="relative space-y-8">

                          <div className="flex gap-5">

                            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-[var(--surface)] text-xs font-black text-violet-300">
                              1
                            </div>

                            <div>

                              <p className="text-sm font-bold">
                                Speak
                              </p>

                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                Record directly in the web app or Chrome extension.
                              </p>

                            </div>

                          </div>

                          <div className="flex gap-5">

                            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-[var(--surface)] text-xs font-black text-cyan-300">
                              2
                            </div>

                            <div>

                              <p className="text-sm font-bold">
                                Structure
                              </p>

                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                AI turns the raw voice capture into a useful structured note.
                              </p>

                            </div>

                          </div>

                          <div className="flex gap-5">

                            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-[var(--surface)] text-xs font-black text-emerald-300">
                              3
                            </div>

                            <div>

                              <p className="text-sm font-bold">
                                Sync
                              </p>

                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                Review the result and send it into Notion when you're ready.
                              </p>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                  {step ===
                    3 && (
                    <div className="mt-8">

                      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl text-emerald-300">
                          ✓
                        </div>

                        <h3 className="mt-5 text-xl font-bold tracking-[-0.025em]">
                          Workspace initialized
                        </h3>

                        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                          Your account is ready. Next you'll enter the main Voice to Notion command center.
                        </p>

                      </div>

                      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

                        <div className="flex items-center justify-between gap-4">

                          <div>

                            <p className="text-xs font-semibold">
                              First mission
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                              Connect a Notion destination and create your first structured capture.
                            </p>

                          </div>

                          <div className="text-lg text-violet-300">
                            →
                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                </div>

                <div className="mt-auto pt-8">

                  {error && (
                    <div
                      className="vtn-error vtn-feedback-card mb-4"
                      role="alert"
                    >

                      <div className="vtn-feedback-icon">
                        !
                      </div>

                      <div>

                        <p className="text-xs font-semibold">
                          Setup could not continue
                        </p>

                        <p className="mt-1 text-xs leading-5 opacity-80">
                          {error}
                        </p>

                      </div>

                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">

                    <button
                      type="button"
                      onClick={
                        step >
                        1
                          ? previousStep
                          : completeOnboarding
                      }
                      disabled={
                        saving
                      }
                      className="min-h-11 rounded-xl px-3 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {step >
                      1
                        ? "← Back"
                        : "Skip setup"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        nextStep
                      }
                      disabled={
                        saving
                      }
                      className="vtn-primary flex min-h-11 min-w-[160px] items-center justify-center gap-2 px-5 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      {saving ? (
                        <>

                          <span className="vtn-spinner" />

                          <span>
                            Saving...
                          </span>

                        </>
                      ) : (
                        <>

                          <span>
                            {step ===
                            3
                              ? "Enter Workspace"
                              : "Continue"}
                          </span>

                          <span>
                            →
                          </span>

                        </>
                      )}

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

          <p className="mt-5 text-center text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
            Voice to Notion · Secure workspace setup
          </p>

        </section>

      </div>

    </main>
  );
}