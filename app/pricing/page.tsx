"use client";

import { useState } from "react";
import Link from "next/link";

type BillingPeriod = "month" | "year";

const freeFeatures = [
  "30 AI captures each month",
  "Recordings up to 2 minutes",
  "1 Notion destination",
  "10-item local capture history",
  "AI-organized notes and action items",
];

const proFeatures = [
  "500 AI captures each month",
  "Recordings up to 15 minutes",
  "Up to 5 Notion destinations",
  "Advanced AI entitlement",
  "Premium web and extension experience",
];

export default function PricingPage() {
  const [period, setPeriod] = useState<BillingPeriod>("year");
  const annual = period === "year";

  return (
    <main className="vtn-shell min-h-screen overflow-hidden">
      <div className="vtn-orb vtn-orb-purple" />
      <div className="vtn-orb vtn-orb-cyan" />

      <div className="vtn-container relative z-10 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Voice to Notion homepage">
            <div className="vtn-brand-mark">V</div>
            <span className="text-sm font-bold tracking-tight">Voice to Notion</span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link href="/" className="px-2 py-2 text-[var(--muted)] transition hover:text-[var(--foreground)]">Home</Link>
            <Link href="/login" className="vtn-secondary inline-flex min-h-10 items-center px-4">Log in</Link>
            <Link href="/app" className="vtn-primary inline-flex min-h-10 items-center px-4">Open app →</Link>
          </nav>
        </header>

        <section className="mx-auto max-w-3xl pt-14 text-center sm:pt-20">
          <div className="vtn-eyebrow mb-5 justify-center">
            <span className="vtn-eyebrow-dot" /> SIMPLE, CLEAR PRICING
          </div>
          <h1 className="vtn-gradient-text text-4xl font-bold tracking-[-0.05em] sm:text-6xl">
            Give every idea a place to go.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Start for free, then upgrade when you need longer recordings and more captures.
            One connected workflow, from your voice to organized Notion notes.
          </p>

          <div className="mx-auto mt-9 inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5" role="group" aria-label="Select billing period">
            <button
              type="button"
              aria-pressed={!annual}
              onClick={() => setPeriod("month")}
              className={`min-h-11 rounded-xl px-5 text-sm font-semibold transition ${!annual ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setPeriod("year")}
              className={`min-h-11 rounded-xl px-5 text-sm font-semibold transition ${annual ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Annual <span className="ml-1 text-violet-400">· Save 24%</span>
            </button>
          </div>
        </section>

        <section aria-label="Free and Pro subscription plans" className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
          <article className="vtn-card flex flex-col p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Start here</p>
            <h2 className="mt-3 text-2xl font-bold">Free</h2>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-[-0.05em]">€0</span>
              <span className="text-sm text-[var(--muted)]">/ month</span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--muted)]">
              Capture occasional thoughts without committing to a subscription.
            </p>
            <div className="mt-7 h-px bg-[var(--border)]" />
            <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.12em]">Included</h3>
            <ul className="mt-4 flex-1 space-y-4 text-sm">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 text-violet-400" aria-hidden="true">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/login" className="vtn-secondary mt-10 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm font-bold">
              Get started free
            </Link>
            <p className="mt-3 text-center text-xs text-[var(--muted)]">No payment details needed to start.</p>
          </article>

          <article className="vtn-card relative flex flex-col overflow-hidden border-violet-500/35 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">Make room for more</p>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">SANDBOX TESTING</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold">✦ Pro</h2>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-[-0.05em]">{annual ? "€80" : "€8.80"}</span>
              <span className="text-sm text-[var(--muted)]">{annual ? "/ year" : "/ month"}</span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--muted)]">
              {annual
                ? "About €6.67/month, billed €80 annually. Save €25.60 compared with 12 monthly payments."
                : "€8.80 billed each month. Change to annual billing to save about 24%."}
            </p>
            <div className="mt-7 h-px bg-[var(--border)]" />
            <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.12em]">Everything you need to capture more</h3>
            <ul className="mt-4 flex-1 space-y-4 text-sm">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 text-violet-400" aria-hidden="true">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/billing" className="vtn-primary mt-10 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm font-bold">
              Explore {annual ? "Annual" : "Monthly"} Pro →
            </Link>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
              Paddle Sandbox checkout only. On the billing page, select {annual ? "Annual" : "Monthly"} before continuing.
              No real charges during testing.
            </p>
          </article>
        </section>

        <section className="mx-auto mt-12 max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 sm:p-7">
          <h2 className="text-lg font-bold">A few things to know</h2>
          <div className="mt-5 grid gap-5 text-sm leading-7 text-[var(--muted)] md:grid-cols-2">
            <p>AI captures reset monthly under both plans. Your final checkout will display any applicable taxes and the total for your location.</p>
            <p>Pro checkout is currently in test mode. The displayed prices are our planned launch prices; live subscriptions are not available yet.</p>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-8 text-xs text-[var(--muted)]">
          <p>© {new Date().getUTCFullYear()} Voice to Notion. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/" className="transition hover:text-[var(--foreground)]">Home</Link>
            <Link href="/login" className="transition hover:text-[var(--foreground)]">Log in</Link>
            <Link href="/app" className="transition hover:text-[var(--foreground)]">Workspace</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
