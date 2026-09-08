"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthMode =
  | "login"
  | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] =
    useState<AuthMode>("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { session },
      } =
        await supabaseBrowser.auth.getSession();

      if (session) {
        router.replace("/");
      }
    }

    checkExistingSession();
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!email.trim()) {
        throw new Error(
          "Enter your email address."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (mode === "signup") {
        const {
          data,
          error:
            signUpError,
        } =
          await supabaseBrowser.auth.signUp(
            {
              email:
                email.trim(),
              password,
            }
          );

        if (signUpError) {
          throw signUpError;
        }

        /*
          If email confirmation
          is enabled, Supabase can
          return a user but no session.
        */

        if (!data.session) {
          setMessage(
            "Account created. Check your email and confirm your address before logging in."
          );

          return;
        }

        router.replace("/");
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
              email.trim(),
            password,
          }
        );

      if (signInError) {
        throw signInError;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error(
        "AUTH ERROR:",
        err
      );

      if (err instanceof Error) {
        setError(
          err.message
        );
      } else {
        setError(
          "Authentication failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            AI Productivity
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Voice to Notion
          </h1>

          <p className="mt-3 text-zinc-400">
            {mode === "login"
              ? "Sign in to continue."
              : "Create your Voice to Notion account."}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => {
                setMode(
                  "login"
                );

                setError("");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(
                  "signup"
                );

                setError("");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
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
                className="mb-2 block text-sm font-medium text-zinc-400"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                placeholder="you@example.com"
                disabled={
                  loading
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-400"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
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
                    event.target
                      .value
                  )
                }
                placeholder="••••••••"
                disabled={
                  loading
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-60"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode ===
                    "login"
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Your Notion connection will
          later be linked securely to
          this account.
        </p>
      </div>
    </main>
  );
}