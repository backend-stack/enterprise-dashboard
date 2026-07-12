"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* Shared sign-in / sign-up card. In demo mode (no Firebase keys yet) the
   form is browsable and a "Continue in demo mode" shortcut opens the
   dashboard directly, so the UI can be reviewed before credentials exist. */
export function AuthCard({ mode }: { mode: "signin" | "signup" }) {
  const { demoMode, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (demoMode) {
      router.push("/dashboard");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) await signUpEmail(name, email, password);
      else await signInEmail(email, password);
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ad-ink)] shadow-[var(--ad-shadow-card)]">
            <Zap size={22} className="text-white" fill="currentColor" strokeWidth={0} />
          </span>
          <div className="text-center">
            <p className="ad-display text-xl font-semibold text-[var(--ad-ink)]">Pulse</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ad-muted)]">
              Enterprise Dashboard
            </p>
          </div>
        </div>

        <div className="rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-7 shadow-[var(--ad-shadow-float)] sm:p-9">
          <h1 className="ad-display mb-1 text-2xl font-semibold tracking-tight text-[var(--ad-ink)]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mb-6 text-sm text-[var(--ad-muted)]">
            {isSignup
              ? "Start monitoring messages, conversions and store traffic."
              : "Sign in to your workspace."}
          </p>

          {demoMode ? (
            <div className="mb-5 rounded-[var(--ad-radius-sm)] bg-[var(--ad-orange-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--ad-ink-soft)]">
              <span className="font-semibold text-[var(--ad-orange)]">Demo mode.</span>{" "}
              Firebase keys aren&apos;t in <code>.env</code> yet, so auth is
              simulated — any of the buttons below will open the dashboard.
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-[var(--ad-radius-sm)] bg-[var(--ad-negative-bg)] px-4 py-3 text-xs text-[var(--ad-negative)]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="flex flex-col gap-3">
            {isSignup ? (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                autoComplete="name"
              />
            ) : null}
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
              autoComplete={isSignup ? "new-password" : "current-password"}
              required={!demoMode}
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-12 rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "One moment…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--ad-muted)]">
            <span className="h-px flex-1 bg-[var(--ad-line)]" />
            or
            <span className="h-px flex-1 bg-[var(--ad-line)]" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="h-12 w-full rounded-full border border-[var(--ad-line)] text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)] disabled:opacity-50"
          >
            Continue with Google
          </button>

          {demoMode ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-3 h-12 w-full rounded-full bg-[var(--ad-navy)] text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
            >
              Continue in demo mode →
            </button>
          ) : null}

          <p className="mt-6 text-center text-xs text-[var(--ad-muted)]">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/signin" className="font-semibold text-[var(--ad-ink)] hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="font-semibold text-[var(--ad-ink)] hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>

          <Link
            href="/signup/business"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-dashed border-[var(--ad-line-strong)] text-sm font-semibold text-[var(--ad-navy)] transition-colors hover:bg-[var(--ad-navy-bg)]"
          >
            Are you a business? Join the partner platform →
          </Link>
        </div>
      </div>
    </div>
  );
}
