"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import type {
  Session,
} from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({
  children,
}: AuthGateProps) {
  const [
    session,
    setSession,
  ] = useState<Session | null>(
    null
  );

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: {
          session:
            currentSession,
        },
        error,
      } =
        await supabaseBrowser.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "SESSION LOAD ERROR:",
          error
        );
      }

      if (!currentSession) {
        window.location.replace(
          "/login"
        );

        return;
      }

      setSession(
        currentSession
      );

      setCheckingSession(false);
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
          if (!mounted) {
            return;
          }

          if (!updatedSession) {
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
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    try {
      setSigningOut(true);

      const {
        error,
      } =
        await supabaseBrowser.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.replace(
        "/login"
      );
    } catch (error) {
      console.error(
        "SIGN OUT ERROR:",
        error
      );

      setSigningOut(false);
    }
  }

  if (
    checkingSession ||
    !session
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">
            Loading Voice to
            Notion...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-zinc-900 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600">
              Signed in
            </p>

            <p className="truncate text-sm text-zinc-300">
              {session.user.email ??
                "Voice to Notion user"}
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={
              signingOut
            }
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut
              ? "Signing out..."
              : "Log Out"}
          </button>
        </div>
      </div>

      {children}
    </>
  );
}