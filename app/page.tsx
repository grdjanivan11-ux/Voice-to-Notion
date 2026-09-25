import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Capture your thought",
    description:
      "Record a voice note in your browser, or start with a transcript you've already written.",
  },
  {
    number: "02",
    title: "Let AI organize it",
    description:
      "Turn your words into a clear title, summary, action items, category, priority and due date.",
  },
  {
    number: "03",
    title: "Save it to Notion",
    description:
      "Choose your connected Notion destination and save your structured note.",
  },
];

const features = [
  {
    icon: "✦",
    title: "Less sorting, more thinking",
    description:
      "Go from an unstructured thought to an organized note without starting from a blank page.",
  },
  {
    icon: "↗",
    title: "Built around Notion",
    description:
      "Connect your workspace and select where your captured notes should go.",
  },
  {
    icon: "◉",
    title: "Record or type",
    description:
      "Speak when an idea strikes or paste text when recording isn't convenient.",
  },
];

export default function LandingPage() {
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
            <a href="#how-it-works" className="px-2 py-2 text-[var(--muted)] transition hover:text-[var(--foreground)]">How it works</a>
            <a href="#plans" className="px-2 py-2 text-[var(--muted)] transition hover:text-[var(--foreground)]">Plans</a>
            <Link href="/login" className="vtn-secondary inline-flex min-h-10 items-center px-4">Log in</Link>
            <Link href="/app" className="vtn-primary inline-flex min-h-10 items-center px-4">Open app →</Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="vtn-eyebrow mb-6"><span className="vtn-eyebrow-dot" /> VOICE → AI → NOTION</div>
            <h1 className="vtn-gradient-text text-5xl font-bold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Capture thoughts.<br />Turn them into action.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[var(--muted)]">
              Your best ideas don't always arrive at your desk. Record a thought, let AI organize it, and save the result to your Notion workspace.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/login" className="vtn-primary inline-flex min-h-12 items-center justify-center px-7 text-sm font-bold">Start for free →</Link>
              <a href="#how-it-works" className="vtn-secondary inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold">See how it works</a>
            </div>
            <p className="mt-5 text-xs text-[var(--muted)]">Free plan: 30 AI captures per month. No payment needed to get started.</p>
          </div>

          <div className="vtn-card relative overflow-hidden border-violet-500/30 p-5 sm:p-7" aria-label="Example of a structured voice note">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400" />
            <div className="mb-6 flex items-center justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">Example capture</p><h2 className="mt-2 text-xl font-bold">From voice to organized</h2></div>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">✦ AI</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">You say</p>
              <p className="mt-3 text-sm leading-7">“Remember to plan the product demo, update the landing page and send the team our notes.”</p>
            </div>
            <div className="my-4 flex items-center justify-center text-xl text-violet-400">↓</div>
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-400">Structured note</p>
              <h3 className="mt-3 text-lg font-bold">Prepare product demo</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Plan the demo, refresh the landing page and share notes with the team.</p>
              <div className="mt-4 space-y-2 text-xs">
                <p>✓ Plan the product demo</p><p>✓ Update the landing page</p><p>✓ Send the team our notes</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px]"><span className="vtn-badge">Category: Work</span><span className="vtn-badge">Action items: 3</span></div>
            </div>
            <p className="mt-4 text-center text-[10px] text-[var(--muted)]">Illustrative example; AI results vary by input.</p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-10 py-14 md:py-20">
          <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Simple by design</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Three steps from idea to Notion</h2><p className="mt-4 text-sm leading-7 text-[var(--muted)]">Capture your train of thought without manually formatting every note.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {steps.map((step) => <article key={step.number} className="vtn-card p-6"><span className="text-2xl font-black text-violet-400">{step.number}</span><h3 className="mt-6 text-lg font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{step.description}</p></article>)}
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Made for the moment</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ideas in. Structure out.</h2></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map((feature) => <article key={feature.title} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-xl text-violet-400">{feature.icon}</div><h3 className="mt-5 text-base font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{feature.description}</p></article>)}
          </div>
        </section>

        <section id="plans" className="scroll-mt-10 py-14 md:py-20">
          <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Plans</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Start free. Capture more with Pro.</h2><p className="mt-4 text-sm leading-7 text-[var(--muted)]">Choose the monthly capture allowance that fits your workflow.</p></div>
          <div className="mt-9 grid max-w-4xl gap-5 md:grid-cols-2">
            <div className="vtn-card p-6 sm:p-8"><p className="text-sm font-bold">Free</p><p className="mt-5 text-4xl font-black">€0 <span className="text-sm font-medium text-[var(--muted)]">/ month</span></p><p className="mt-4 text-sm text-[var(--muted)]">For capturing ideas as you go.</p><div className="mt-7 space-y-3 text-sm"><p>✓ 30 AI captures per month</p><p>✓ Recordings up to 2 minutes</p><p>✓ 1 Notion destination</p><p>✓ 10-item local capture history</p></div><Link href="/login" className="vtn-secondary mt-8 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm font-bold">Get started free</Link></div>
            <div className="vtn-card relative overflow-hidden border-violet-500/35 p-6 sm:p-8"><div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-400 to-cyan-400" /><div className="flex items-center justify-between"><p className="text-sm font-bold">✦ Pro</p><span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">SANDBOX TESTING</span></div><p className="mt-5 text-4xl font-black">€9.99 <span className="text-sm font-medium text-[var(--muted)]">/ month</span></p><p className="mt-2 text-xs text-[var(--muted)]">Or €99/year in the current Sandbox pricing configuration.</p><p className="mt-4 text-sm text-[var(--muted)]">For longer recordings and more monthly captures.</p><div className="mt-7 space-y-3 text-sm"><p>✓ 500 AI captures per month</p><p>✓ Recordings up to 15 minutes</p><p>✓ Up to 5 Notion destinations</p><p>✓ Pro entitlements for planned premium features</p></div><Link href="/billing" className="vtn-primary mt-8 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm font-bold">Explore Pro →</Link><p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">Checkout is in Paddle Sandbox. No real charges during testing.</p></div>
          </div>
        </section>

        <section className="vtn-card my-14 border-violet-500/25 p-8 text-center sm:p-12"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">Make room for your next idea</p><h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Spend less time organizing. More time creating.</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">Start with a thought. Voice to Notion helps turn it into something you can use.</p><Link href="/login" className="vtn-primary mt-7 inline-flex min-h-12 items-center justify-center px-7 text-sm font-bold">Get started free →</Link></section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-8 text-xs text-[var(--muted)]"><p>© {new Date().getUTCFullYear()} Voice to Notion. All rights reserved.</p><div className="flex flex-wrap gap-5"><Link href="/login" className="transition hover:text-[var(--foreground)]">Log in</Link><Link href="/app" className="transition hover:text-[var(--foreground)]">Workspace</Link><a href="#plans" className="transition hover:text-[var(--foreground)]">Plans</a></div></footer>
      </div>
    </main>
  );
}
