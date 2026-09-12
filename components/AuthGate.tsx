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
  ] =
    useState<Session | null>(
      null
    );

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

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

      setCheckingSession(
        false
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

  if (
    checkingSession ||
    !session
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

  return <>{children}</>;
}