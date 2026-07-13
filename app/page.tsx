import Link from "next/link";
import Image from "next/image";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

/* The public hero - one minimal screen in the waitlist style: black base
   with the monochrome gradient mesh, the wordmark, one line of subtext and
   a Log in button. */

export const metadata = { title: "Contextual Intelligence" };

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      {/* Monochrome gradient mesh fills the whole screen */}
      <HeroBackdrop />

      {/* Top bar - logo left, login right. */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
          <Image
            src="/logo/ci/ci-mark.png"
            alt="Contextual Intelligence"
            width={80}
            height={80}
            className="h-6 w-6 invert"
          />
        </span>
        <Link
          href="/login"
          className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Log in
        </Link>
      </header>

      {/* Center - the one message. */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-40 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">
          For Partners
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-6xl font-medium leading-[1.02] tracking-tight text-white sm:text-7xl lg:text-8xl">
          Contextual Intelligence
        </h1>
        <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
          The partner dashboard for your venues, agent and customers.
        </p>
        <Link
          href="/login"
          className="mt-10 rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Log in
        </Link>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-6 py-6 text-xs text-white/50 sm:px-10">
        <span>© 2026 Contextual Intelligence</span>
        <a
          href="https://www.contextualintelligence.co"
          className="transition-colors hover:text-white"
        >
          contextualintelligence.co
        </a>
      </footer>
    </div>
  );
}
