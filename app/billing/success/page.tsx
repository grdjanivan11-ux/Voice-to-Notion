"use client";

import AuthGate from "@/components/AuthGate";
import ThemeToggle from "@/components/ThemeToggle";

/* =========================================================
   VOICE TO NOTION
   PADDLE CHECKOUT SUCCESS
   ========================================================= */

export default function BillingSuccessPage() {
  return (
    <AuthGate>

      <main className="vtn-shell min-h-screen">

        <div className="vtn-orb vtn-orb-purple" />
        <div className="vtn-orb vtn-orb-cyan" />

        <div className="vtn-container py-5 sm:py-8">

          <header className="vtn-glass flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 sm:px-5">

            <a
              href="/"
              className="flex items-center gap-3"
            >

              <div className="vtn-brand-mark">
                V
              </div>

              <div>

                <p className="text-sm font-bold">
                  Voice to Notion
                </p>

                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Paddle Sandbox
                </p>

              </div>

            </a>

            <ThemeToggle />

          </header>

          <section className="vtn-card relative mx-auto mt-16 max-w-xl overflow-hidden border-emerald-400/25 p-7 text-center sm:p-9">

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-cyan-400" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-2xl font-black text-emerald-300">
              ✓
            </div>

            <span className="mt-6 inline-block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
              Sandbox payment complete
            </span>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Paddle Checkout works.
            </h1>

            <p className="mx-auto mt-4 max-w-md text-xs leading-6 text-[var(--muted)]">
              The test transaction completed successfully. Automatic Pro
              activation is not enabled yet because the secure Paddle webhook
              is the next stage of the integration.
            </p>

            <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-left">

              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">
                Next
              </p>

              <p className="mt-2 text-xs leading-6 text-[var(--muted-strong)]">
                C9.3.6 will verify Paddle webhook signatures, identify your
                Supabase user from checkout metadata, save Paddle customer and
                subscription IDs, and automatically switch the account from
                Free to Pro.
              </p>

            </div>

            <a
              href="/"
              className="vtn-primary mt-6 inline-flex min-h-12 items-center justify-center px-6 text-xs"
            >
              Return to Voice to Notion
            </a>

          </section>

        </div>

      </main>

    </AuthGate>
  );
}