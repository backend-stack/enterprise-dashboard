import Link from "next/link";
import { Heart, MoveRight, PhoneCall, TrendingUp } from "lucide-react";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { CircularGallery } from "@/components/ui/CircularGallery";

/* The public hero - the waitlist-style mesh screen (black base, monochrome
   gradient mesh, one message, a Log in button), followed by one light
   section: the missed-revenue statement and the three product points. */

export const metadata = { title: "Contextual Intelligence" };

const SIGNUP_URL = "https://www.contextualintelligence.co/partners";

const CONNECTIONS = [
  { image: "/logo/brands/google.svg", text: "Google" },
  { image: "/logo/brands/gmail.svg", text: "Gmail" },
  { image: "/logo/brands/google-maps.svg", text: "Google Maps" },
  { image: "/logo/brands/whatsapp.svg", text: "WhatsApp" },
  { image: "/logo/brands/instagram.png", text: "Instagram" },
  { image: "/logo/brands/spotify.svg", text: "Spotify" },
  { image: "/logo/brands/brex.svg", text: "Brex" },
];

const POINTS = [
  {
    icon: PhoneCall,
    title: "Never miss a customer",
    blurb:
      "Your agent answers every call and text - during service, after hours, all week. Missed calls get an instant text back.",
  },
  {
    icon: Heart,
    title: "Build loyalty",
    blurb:
      "Every conversation remembers the customer - names, preferences, past visits - so regulars always feel like regulars.",
  },
  {
    icon: TrendingUp,
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
          <a
            href={SIGNUP_URL}
            className="mt-10 rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Sign up
          </a>
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

          {/* Case-study style block: featured point with a visual, then the
              other two side by side inside one bordered frame. */}
          <div className="mt-16 rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)]">
            {/* Featured - Never miss a customer */}
            <a
              href={SIGNUP_URL}
              className="group grid gap-4 overflow-hidden rounded-t-[var(--ad-radius-lg)] px-6 transition-colors duration-500 ease-out hover:bg-[var(--ad-panel-2)] lg:grid-cols-2 xl:px-16"
            >
              <div className="flex flex-col justify-between gap-4 pt-8 md:pt-16 lg:pb-16">
                <div className="flex items-center gap-3 text-2xl font-medium text-[var(--ad-ink)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ad-panel)]">
                    <PhoneCall size={18} strokeWidth={1.8} />
                  </span>
                  01
                </div>
                <div>
                  <span className="text-xs tracking-[0.12em] text-[var(--ad-muted)] sm:text-sm">
                    AI AGENT / EVERY CALL &amp; TEXT
                  </span>
                  <h2 className="mb-5 mt-4 text-2xl font-semibold text-balance text-[var(--ad-ink)] sm:text-3xl sm:leading-10">
                    {POINTS[0].title}.
                    <span className="font-medium text-[var(--ad-muted)] transition-colors duration-500 ease-out group-hover:text-[var(--ad-ink-soft)]">
                      {" "}
                      {POINTS[0].blurb}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 font-medium text-[var(--ad-ink)]">
                    Sign up
                    <MoveRight className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
              <div className="relative isolate py-16">
                <div className="relative isolate h-full rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-2">
                  {/* The visual - a missed call becoming a booked table. */}
                  <div className="flex aspect-[14/9] h-full w-full flex-col justify-center gap-3 overflow-hidden rounded-xl bg-black p-6 sm:p-8">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
                      Missed call · 9:42 PM
                    </p>
                    <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-[13px] leading-relaxed text-white">
                      Hey, do you have a table for 4 tonight?
                    </div>
                    <div className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[13px] leading-relaxed text-black">
                      We do! Booked you in for 9:15 - see you soon. ✓
                    </div>
                    <p className="self-end text-[11px] text-white/40">
                      Your agent · replied in 4s
                    </p>
                  </div>
                </div>
              </div>
            </a>

            {/* The other two points */}
            <div className="flex rounded-b-[var(--ad-radius-lg)] border-t border-[var(--ad-line)]">
              <div className="hidden w-24 shrink-0 rounded-bl-[var(--ad-radius-lg)] bg-[radial-gradient(var(--ad-muted)_1px,transparent_1px)] opacity-15 [background-size:10px_10px] xl:block" />
              <div className="grid flex-1 lg:grid-cols-2">
                {POINTS.slice(1).map(({ icon: Icon, title, blurb }, idx) => (
                  <a
                    key={title}
                    href={SIGNUP_URL}
                    className={`group flex flex-col justify-between gap-12 px-6 py-8 transition-colors duration-500 ease-out hover:bg-[var(--ad-panel-2)] md:py-16 lg:pb-16 xl:gap-16 ${
                      idx === 0
                        ? "xl:border-l xl:border-[var(--ad-line)] xl:pl-8"
                        : "border-t border-[var(--ad-line)] lg:border-l lg:border-t-0 xl:border-r xl:pl-8"
                    }`}
                  >
                    <div className="flex items-center gap-3 text-2xl font-medium text-[var(--ad-ink)]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ad-panel)]">
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      0{idx + 2}
                    </div>
                    <div>
                      <span className="text-xs tracking-[0.12em] text-[var(--ad-muted)] sm:text-sm">
                        {idx === 0
                          ? "CUSTOMER MEMORY / REPEAT VISITS"
                          : "DISCOVERY / NEW GUESTS"}
                      </span>
                      <h2 className="mb-5 mt-4 text-2xl font-semibold text-balance text-[var(--ad-ink)] sm:text-3xl sm:leading-10">
                        {title}.
                        <span className="font-medium text-[var(--ad-muted)] transition-colors duration-500 ease-out group-hover:text-[var(--ad-ink-soft)]">
                          {" "}
                          {blurb}
                        </span>
                      </h2>
                      <div className="flex items-center gap-2 font-medium text-[var(--ad-ink)]">
                        Sign up
                        <MoveRight className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="hidden w-24 shrink-0 rounded-br-[var(--ad-radius-lg)] bg-[radial-gradient(var(--ad-muted)_1px,transparent_1px)] opacity-15 [background-size:10px_10px] xl:block" />
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <a
              href={SIGNUP_URL}
              className="rounded-full bg-[var(--ad-ink)] px-10 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign up
            </a>
          </div>
        </div>
      </section>

      {/* ── Connections - the platforms we work with ───────────────────── */}
      <section className="overflow-hidden bg-black py-20 sm:py-28">
        <p className="text-center text-xs font-medium uppercase tracking-[0.22em] text-white/60">
          Connections
        </p>
        <h2 className="mx-auto mt-6 max-w-2xl px-6 text-center text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl">
          Works with the platforms your customers already use.
        </h2>
        <div className="mt-8 h-[440px] text-white sm:h-[520px]">
          <CircularGallery items={CONNECTIONS} bend={3} borderRadius={0.06} />
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
