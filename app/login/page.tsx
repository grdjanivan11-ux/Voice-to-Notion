"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import ThemeToggle from "@/components/ThemeToggle";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthMode =
  | "login"
  | "signup";

export default function LoginPage() {
  const router =
    useRouter();

  const [
    mode,
    setMode,
  ] =
    useState<AuthMode>(
      "login"
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: {
          session,
        },
      } =
        await supabaseBrowser.auth.getSession();

      if (
        session
      ) {
        router.replace(
          "/"
        );
      }
    }

    checkExistingSession();
  }, [router]);

  function switchMode(
    nextMode: AuthMode
  ) {
    setMode(
      nextMode
    );

    setError(
      ""
    );

    setMessage(
      ""
    );

    setPassword(
      ""
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(
      true
    );

    setError(
      ""
    );

    setMessage(
      ""
    );

    try {
      const cleanEmail =
        email.trim();

      if (
        !cleanEmail
      ) {
        throw new Error(
          "Enter your email address."
        );
      }

      if (
        password.length <
        6
      ) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (
        mode ===
        "signup"
      ) {
        const {
          data,
          error:
            signUpError,
        } =
          await supabaseBrowser.auth.signUp(
            {
              email:
                cleanEmail,

              password,
            }
          );

        if (
          signUpError
        ) {
          throw signUpError;
        }

        if (
          !data.session
        ) {
          setMessage(
            "Account created successfully. Check your email and confirm your address, then return here to log in."
          );

          setPassword(
            ""
          );

          return;
        }

        router.replace(
          "/"
        );

        router.refresh();

        return;
      }

      const {
        error:
          signInError,
      } =
        await supabaseBrowser.auth.signInWithPassword(
          {
            email:
              cleanEmail,

            password,
          }
        );

      if (
        signInError
      ) {
        throw signInError;
      }

      router.replace(
        "/"
      );

      router.refresh();
    } catch (err) {
      console.error(
        "AUTH ERROR:",
        err
      );

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Authentication failed. Please try again."
        );
      }
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <main className="vtn-shell min-h-screen overflow-hidden">

      <div className="vtn-orb vtn-orb-purple" />

      <div className="vtn-orb vtn-orb-cyan" />

      <div className="vtn-auth-grid" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">

        <div className="flex items-center gap-3">

          <div className="vtn-brand-mark">
            V
          </div>

          <div>

            <p className="text-sm font-bold tracking-tight text-[var(--foreground)]">
              Voice to Notion
            </p>

            <div className="mt-1 flex items-center gap-2">

              <span className="vtn-status-dot" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                System Ready
              </span>

            </div>

          </div>

        </div>

        <ThemeToggle />

      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[1440px] items-center gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 xl:gap-16">

        <section className="hidden lg:block">

          <div className="max-w-2xl">

            <div className="vtn-eyebrow mb-5">

              <span className="vtn-eyebrow-dot" />

              Voice → AI → Notion

            </div>

            <h1 className="vtn-gradient-text text-5xl font-bold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
              Capture thoughts.
              <br />
              Turn them into action.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">
              Speak naturally. Voice to Notion turns your voice into organized notes, action items, categories, priorities and due dates — then sends everything directly to your Notion workspace.
            </p>

            <div className="mt-10 grid gap-3">

              <div className="vtn-card vtn-auth-feature flex items-center gap-4 p-4">

                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-lg text-violet-400">
                  🎙
                </div>

                <div className="relative z-10">

                  <p className="text-sm font-semibold">
                    Speak naturally
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Capture a thought from the web app or Chrome extension.
                  </p>

                </div>

              </div>

              <div className="vtn-card vtn-auth-feature flex items-center gap-4 p-4">

                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-lg text-cyan-400">
                  ✦
                </div>

                <div className="relative z-10">

                  <p className="text-sm font-semibold">
                    AI structures it
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Title, summary, tasks, category, priority and due date are organized automatically.
                  </p>

                </div>

              </div>

              <div className="vtn-card vtn-auth-feature flex items-center gap-4 p-4">

                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-black text-emerald-400">
                  N
                </div>

                <div className="relative z-10">

                  <p className="text-sm font-semibold">
                    Sync to Notion
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Your structured capture lands directly in your chosen Notion destination.
                  </p>

                </div>

              </div>

            </div>

            <div className="mt-7 flex flex-wrap gap-2">

              <span className="vtn-badge">
                <span className="vtn-status-dot" />
                Secure account
              </span>

              <span className="vtn-badge">
                AI structured
              </span>

              <span className="vtn-badge">
                Notion connected
              </span>

              <span className="vtn-badge">
                Web + Extension
              </span>

            </div>

          </div>

        </section>

        <section className="mx-auto w-full max-w-[520px]">

          <div className="mb-7 lg:hidden">

            <div className="vtn-eyebrow mb-3">

              <span className="vtn-eyebrow-dot" />

              Voice → AI → Notion

            </div>

            <h1 className="vtn-gradient-text text-4xl font-bold leading-[1.06] tracking-[-0.045em]">
              Capture thoughts.
              <br />
              Turn them into action.
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              Speak naturally. AI structures it. Notion keeps it organized.
            </p>

          </div>

          <div className="vtn-card vtn-auth-card p-5 sm:p-7 lg:p-8">

            <div className="relative z-10">

              <div className="mb-7">

                <div className="flex items-start justify-between gap-5">

                  <div>

                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--violet-soft)]">
                      Account Access
                    </span>

                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
                      {mode ===
                      "login"
                        ? "Welcome back."
                        : "Create your account."}
                    </h2>

                    <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">
                      {mode ===
                      "login"
                        ? "Sign in to continue capturing and syncing your thoughts."
                        : "Create your Voice to Notion account and start building your knowledge system."}
                    </p>

                  </div>

                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-lg text-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.1)] sm:flex">
                    ✦
                  </div>

                </div>

              </div>

              <div className="mb-6 grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1">

                <button
                  type="button"
                  onClick={() =>
                    switchMode(
                      "login"
                    )
                  }
                  disabled={
                    loading
                  }
                  className={`vtn-auth-mode ${
                    mode ===
                    "login"
                      ? "is-active"
                      : ""
                  }`}
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={() =>
                    switchMode(
                      "signup"
                    )
                  }
                  disabled={
                    loading
                  }
                  className={`vtn-auth-mode ${
                    mode ===
                    "signup"
                      ? "is-active"
                      : ""
                  }`}
                >
                  Sign Up
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                  >
                    Email address
                  </label>

                  <div className="relative">

                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-[var(--muted)]">
                      @
                    </span>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={
                        email
                      }
                      onChange={(
                        event
                      ) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      disabled={
                        loading
                      }
                      className="vtn-input h-12 pl-10 pr-4 text-sm disabled:opacity-60"
                    />

                  </div>

                </div>

                <div>

                  <div className="mb-2 flex items-center justify-between gap-3">

                    <label
                      htmlFor="password"
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                    >
                      Password
                    </label>

                    <span className="text-[9px] text-[var(--muted)]">
                      Minimum 6 characters
                    </span>

                  </div>

                  <div className="relative">

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete={
                        mode ===
                        "login"
                          ? "current-password"
                          : "new-password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="••••••••"
                      disabled={
                        loading
                      }
                      className="vtn-input h-12 px-4 pr-20 text-sm disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      disabled={
                        loading
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-[10px] font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </div>

                {error && (
                  <div
                    className="vtn-error vtn-feedback-card"
                    role="alert"
                  >

                    <div className="vtn-feedback-icon">
                      !
                    </div>

                    <div>

                      <p className="text-xs font-semibold">
                        Authentication failed
                      </p>

                      <p className="mt-1 text-xs leading-5 opacity-80">
                        {error}
                      </p>

                    </div>

                  </div>
                )}

                {message && (
                  <div
                    className="vtn-success vtn-feedback-card"
                    role="status"
                  >

                    <div className="vtn-feedback-icon">
                      ✓
                    </div>

                    <div>

                      <p className="text-xs font-semibold">
                        Account created
                      </p>

                      <p className="mt-1 text-xs leading-5 opacity-80">
                        {message}
                      </p>

                    </div>

                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="vtn-primary flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading ? (
                    <>

                      <span className="vtn-spinner" />

                      <span>
                        {mode ===
                        "login"
                          ? "Entering workspace..."
                          : "Creating account..."}
                      </span>

                    </>
                  ) : (
                    <>

                      <span>
                        {mode ===
                        "login"
                          ? "Enter Workspace"
                          : "Create Account"}
                      </span>

                      <span>
                        →
                      </span>

                    </>
                  )}

                </button>

              </form>

              <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">

                <p className="text-xs text-[var(--muted)]">

                  {mode ===
                  "login"
                    ? "New to Voice to Notion?"
                    : "Already have an account?"}

                  {" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode(
                        mode ===
                        "login"
                          ? "signup"
                          : "login"
                      )
                    }
                    disabled={
                      loading
                    }
                    className="font-semibold text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                  >
                    {mode ===
                    "login"
                      ? "Create account"
                      : "Log in"}
                  </button>

                </p>

              </div>

            </div>

          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--muted)]">

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

        </section>

      </div>

    </main>
  );
}