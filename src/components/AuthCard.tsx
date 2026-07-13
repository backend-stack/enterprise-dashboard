"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { HeroShader } from "@/components/ui/HeroShader";

/* Sign-in — the contextualintelligence.co split layout: form on the left,
   the animated fluted-glass shader inset as a rounded panel on the right.
   Account creation lives on contextualintelligence.co/partners; this screen
   only signs existing accounts in (email/password + Google, plus the
   demo-mode shortcut for keyless local review). Spacing on an 8pt grid. */
export function AuthCard() {
  const { demoMode, signInEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (demoMode) {
      router.push("/dashboard");
      return;
    }
    setBusy(true);
    try {
      await signInEmail(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    if (demoMode) {
      router.push("/dashboard");
      return;
    }
    setBusy(true);
    try {
      await signInGoogle();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "h-12 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none";

  return (
    <div className="flex min-h-screen">
      {/* Left — form. */}
      <div className="flex w-full flex-col bg-[var(--ad-paper)] md:w-1/2">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6 md:mx-0 md:max-w-none md:px-8 md:py-8 lg:px-14 lg:py-10">
          {/* Top bar — CI mark left, flow switch right. */}
          <div className="flex shrink-0 items-center justify-between">
            <Link href="/" aria-label="Contextual Intelligence home" className="flex items-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ad-ink)]">
                <Image
                  src="/logo/ci/ci-mark.png"
                  alt="Contextual Intelligence"
                  width={80}
                  height={80}
                  className="h-6 w-6 invert"
                />
              </span>
            </Link>
            <a
              href="https://www.contextualintelligence.co/partners"
              className="text-sm text-[var(--ad-muted)] transition-colors hover:text-[var(--ad-ink)]"
            >
              Create account
            </a>
          </div>

          {/* Body — centered form column. */}
          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="w-full max-w-sm">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ad-muted)]">
                Business dashboard
              </p>
              <h1 className="ad-display text-3xl font-semibold leading-[1.05] tracking-tight text-[var(--ad-ink)] sm:text-4xl">
                Welcome back.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ad-ink-soft)]">
                Sign in to see your venues, conversations and bookings.
              </p>

              {demoMode ? (
                <div className="mt-6 rounded-xl bg-[var(--ad-orange-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--ad-ink-soft)]">
                  <span className="font-semibold text-[var(--ad-orange)]">Demo mode.</span>{" "}
                  Firebase keys aren&apos;t in <code>.env</code> yet, so auth is
                  simulated — any of the buttons below will open the dashboard.
                </div>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-xl bg-[var(--ad-negative-bg)] px-4 py-3 text-xs text-[var(--ad-negative)]">
                  {error}
                </div>
              ) : null}

              <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  autoComplete="email"
                  required={!demoMode}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  autoComplete="current-password"
                  required={!demoMode}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 h-12 rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "One moment…" : "Sign in"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-[var(--ad-muted)]">
                <span className="h-px flex-1 bg-[var(--ad-line)]" />
                or
                <span className="h-px flex-1 bg-[var(--ad-line)]" />
              </div>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="h-12 w-full rounded-full border border-[var(--ad-line)] text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:border-[var(--ad-ink-soft)] disabled:opacity-50"
              >
                Continue with Google
              </button>

              {demoMode ? (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 h-12 w-full rounded-full bg-[var(--ad-navy)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Continue in demo mode →
                </button>
              ) : null}

              <p className="mt-6 text-sm text-[var(--ad-muted)]">
                New here?{" "}
                <a
                  href="https://www.contextualintelligence.co/partners"
                  className="text-[var(--ad-ink)] underline underline-offset-2"
                >
                  Sign up as a partner
                </a>
              </p>

              <a
                href="https://www.contextualintelligence.co/partners"
                className="mt-6 flex h-12 w-full items-center justify-center rounded-full border border-dashed border-[var(--ad-line-strong)] text-sm font-semibold text-[var(--ad-navy)] transition-colors hover:bg-[var(--ad-navy-bg)]"
              >
                Are you a business? Join the partner platform →
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-xs text-[var(--ad-muted)]">© 2026 Contextual Intelligence</p>
            <div className="flex gap-4">
              <a
                href="https://www.contextualintelligence.co/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--ad-muted)] transition-colors hover:text-[var(--ad-ink)]"
              >
                Privacy
              </a>
              <a
                href="https://www.contextualintelligence.co/terms"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--ad-muted)] transition-colors hover:text-[var(--ad-ink)]"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right — animated line shader, inset as a rounded rectangle. */}
      <div className="relative hidden p-4 md:sticky md:top-0 md:block md:h-screen md:w-1/2 lg:p-6">
        <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[#efefef] shadow-[0_8px_40px_-24px_rgba(0,0,0,0.25)]">
          <HeroShader />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{ boxShadow: "inset 16px 0 36px -44px rgba(0,0,0,0.14)" }}
          />
          <div className="absolute bottom-10 left-10 right-10 z-10">
            <div className="w-64 border-t border-black/10 pt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50">
                Contextual Intelligence
              </p>
              <p className="text-sm leading-relaxed text-black/70">
                The business dashboard for your venues, live assistant and
                customers — powered by Contextual Intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
