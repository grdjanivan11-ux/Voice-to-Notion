"use client";

import {
  useState,
} from "react";

import AuthGate from "@/components/AuthGate";
import ThemeToggle from "@/components/ThemeToggle";

import {
  getPaddle,
  getPaddlePriceId,
  type PaddleBillingInterval,
} from "@/lib/paddle-browser";

import {
  supabaseBrowser,
} from "@/lib/supabase-browser";

/* =========================================================
   VOICE TO NOTION
   PADDLE SANDBOX BILLING PAGE
   ========================================================= */

export default function BillingPage() {
  const [
    selectedInterval,
    setSelectedInterval,
  ] =
    useState<PaddleBillingInterval>(
      "month"
    );

  const [
    openingCheckout,
    setOpeningCheckout,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     CHECKOUT
     ======================================================= */

  async function openCheckout(
    interval:
      PaddleBillingInterval
  ) {
    try {
      setError(
        ""
      );

      setOpeningCheckout(
        true
      );

      const {
        data: {
          session,
        },
      } =
        await supabaseBrowser.auth.getSession();

      if (
        !session
      ) {
        window.location.href =
          "/login";

        return;
      }

      const paddle =
        await getPaddle();

      const priceId =
        getPaddlePriceId(
          interval
        );

      const successUrl =
        `${window.location.origin}/billing/success?interval=${interval}`;

      paddle.Checkout.open({
        items: [
          {
            priceId,
            quantity:
              1,
          },
        ],

        ...(session.user.email
          ? {
              customer: {
                email:
                  session.user.email,
              },
            }
          : {}),

        customData: {
          supabase_user_id:
            session.user.id,

          plan:
            "pro",

          billing_interval:
            interval,
        },

        settings: {
          displayMode:
            "overlay",

          variant:
            "one-page",

          theme:
            "dark",

          locale:
            "en",

          allowLogout:
            false,

          successUrl,
        },
      });
    } catch (
      checkoutError
    ) {
      console.error(
        "PADDLE CHECKOUT ERROR:",
        checkoutError
      );

      setError(
        checkoutError instanceof
          Error
          ? checkoutError.message
          : "Could not open Paddle Checkout."
      );
    } finally {
      setOpeningCheckout(
        false
      );
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <AuthGate>

      <main className="vtn-shell min-h-screen">

        <div className="vtn-orb vtn-orb-purple" />
        <div className="vtn-orb vtn-orb-cyan" />

        <div className="vtn-container py-5 sm:py-8">

          {/* ===============================================
              HEADER
          ================================================ */}

          <header className="vtn-glass flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 sm:px-5">

            <a
              href="/app"
              className="flex min-w-0 items-center gap-3"
            >

              <div className="vtn-brand-mark">
                V
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-bold">
                  Voice to Notion
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span className="vtn-status-dot" />

                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Secure Billing
                  </span>

                </div>

              </div>

            </a>

            <ThemeToggle />

          </header>

          {/* ===============================================
              HERO
          ================================================ */}

          <section className="mx-auto mt-10 max-w-2xl text-center sm:mt-14">

            <div className="vtn-eyebrow justify-center">

              <span className="vtn-eyebrow-dot" />

              Voice to Notion Pro

            </div>

            <h1 className="vtn-gradient-text mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
              Upgrade your capture system.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Capture longer thoughts, unlock a much larger monthly allowance,
              and prepare your workspace for the premium Voice to Notion
              features we are building.
            </p>

          </section>

          {/* ===============================================
              BILLING TOGGLE
          ================================================ */}

          <div className="mx-auto mt-8 flex max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5">

            <button
              type="button"
              onClick={() =>
                setSelectedInterval(
                  "month"
                )
              }
              className={`flex-1 rounded-xl px-4 py-3 text-xs font-semibold transition ${
                selectedInterval ===
                "month"
                  ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedInterval(
                  "year"
                )
              }
              className={`flex-1 rounded-xl px-4 py-3 text-xs font-semibold transition ${
                selectedInterval ===
                "year"
                  ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              Annual
            </button>

          </div>

          {/* ===============================================
              PLAN CARD
          ================================================ */}

          <section className="vtn-card relative mx-auto mt-5 max-w-2xl overflow-hidden border-violet-500/30 p-5 sm:p-7">

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-cyan-400" />

            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />

            <div className="relative z-10">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Premium
                  </span>

                  <h2 className="mt-2 text-2xl font-black">
                    ✦ Voice to Notion Pro
                  </h2>

                </div>

                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black tracking-[0.1em] text-violet-300">
                  SANDBOX
                </span>

              </div>

              {/* PRICE */}

              <div className="mt-7">

                {selectedInterval ===
                "month" ? (
                  <>

                    <div className="flex items-end gap-2">

                      <span className="text-5xl font-black tracking-[-0.05em]">
                        €8.80
                      </span>

                      <span className="pb-1 text-sm text-[var(--muted)]">
                        / month
                      </span>

                    </div>

                    <p className="mt-2 text-[10px] text-[var(--muted)]">
                      Billed monthly. Cancel according to your subscription terms.
                    </p>

                  </>
                ) : (
                  <>

                    <div className="flex items-end gap-2">

                      <span className="text-5xl font-black tracking-[-0.05em]">
                        €80
                      </span>

                      <span className="pb-1 text-sm text-[var(--muted)]">
                        / year
                      </span>

                    </div>

                    <p className="mt-2 text-[10px] text-[var(--muted)]">
                      About €6.67/month when billed annually.
                    </p>

                  </>
                )}

              </div>

              {/* FEATURES */}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">

                {[
                  "500 AI captures every month",
                  "Up to 15-minute recordings",
                  "Advanced AI entitlement",
                  "Up to 5 Notion destinations",
                  "Premium web experience",
                  "Premium extension experience",
                ].map(
                  (
                    feature
                  ) => (
                    <div
                      key={
                        feature
                      }
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3"
                    >

                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] font-black text-violet-300">
                        ✓
                      </span>

                      <span className="text-[11px] text-[var(--muted-strong)]">
                        {feature}
                      </span>

                    </div>
                  )
                )}

              </div>

              {/* CHECKOUT */}

              <button
                type="button"
                onClick={() =>
                  openCheckout(
                    selectedInterval
                  )
                }
                disabled={
                  openingCheckout
                }
                className="vtn-primary mt-7 min-h-14 w-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {openingCheckout
                  ? "Opening secure checkout..."
                  : selectedInterval ===
                      "month"
                    ? "Continue with Monthly Pro →"
                    : "Continue with Annual Pro →"}
              </button>

              <p className="mt-3 text-center text-[9px] leading-5 text-[var(--muted)]">
                Sandbox checkout only. No real money is charged during development.
              </p>

              {error && (
                <div
                  className="vtn-error mt-4 rounded-xl p-3 text-xs leading-5"
                  role="alert"
                >
                  {error}
                </div>
              )}

            </div>

          </section>

          {/* ===============================================
              CURRENT DEVELOPMENT NOTICE
          ================================================ */}

          <section className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

            <div className="flex gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
                i
              </div>

              <div>

                <p className="text-xs font-semibold">
                  Paddle Sandbox integration
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
  This checkout uses Paddle Sandbox for testing.
  No real payments are collected. Pro access is
  updated automatically after our secure Paddle
  webhook verifies the subscription.
</p>

              </div>

            </div>

          </section>

          <a
            href="/app"
            className="mx-auto mt-6 block w-fit text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            ← Back to Voice to Notion
          </a>

        </div>

      </main>

    </AuthGate>
  );
}
