import Link from "next/link";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

/* The public hero - the waitlist-style mesh screen (black base, monochrome
   gradient mesh, one message, a Log in button), followed by one light
   section: the missed-revenue statement and the three product points. */

export const metadata = { title: "Contextual Intelligence" };

const POINTS = [
  {
    title: "Never miss a customer",
    blurb:
      "Your agent answers every call and text - during service, after hours, all week. Missed calls get an instant text back.",
  },
  {
    title: "Build loyalty",
    blurb:
      "Every conversation remembers the customer - names, preferences, past visits - so regulars always feel like regulars.",
  },
  {
    title: "Attract new customers",
    blurb:
      "Get discovered by people nearby looking for exactly what you offer - and turn first questions into first visits.",
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      {/* ── Hero - full-screen mesh ─────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-black">
        {/* Monochrome gradient mesh fills the whole screen */}
        <HeroBackdrop />

        {/* Top bar - login only. */}
        <header className="relative z-10 flex items-center justify-end px-6 py-6 sm:px-10">
          <Link
            href="/login"
            className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Log in
          </Link>
        </header>

        {/* Center - the one message. */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">
            For Partners
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-6xl font-medium leading-[1.02] tracking-tight text-white sm:text-7xl lg:text-8xl">
            Contextual Intelligence
          </h1>
          <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Stay competitive in the new way to engage with customers.
          </p>
          <Link
            href="/login"
            className="mt-10 rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* ── The problem + the three points ─────────────────────────────── */}
      <section className="border-t border-[var(--ad-line)] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="mx-auto max-w-2xl text-center text-2xl font-medium leading-snug tracking-tight text-[var(--ad-ink)] sm:text-3xl">
            Most businesses lose{" "}
            <span className="whitespace-nowrap">$5,000&ndash;$10,000</span> a month
            to missed customers.
          </p>
          <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-[var(--ad-muted)]">
            A website and a booking platform aren&apos;t enough anymore.
          </p>

          <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {POINTS.map((p, i) => (
              <div key={p.title} className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ad-muted)]">
                  0{i + 1}
                </p>
                <h2 className="mt-3 text-lg font-semibold tracking-tight text-[var(--ad-ink)]">
                  {p.title}
                </h2>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[var(--ad-ink-soft)]">
                  {p.blurb}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href="/login"
              className="rounded-full bg-[var(--ad-ink)] px-10 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-[var(--ad-line)] px-6 py-6 text-xs text-[var(--ad-muted)] sm:px-10">
        <span>© 2026 Contextual Intelligence</span>
        <a
          href="https://www.contextualintelligence.co"
          className="transition-colors hover:text-[var(--ad-ink)]"
        >
          contextualintelligence.co
        </a>
      </footer>
    </div>
  );
}
