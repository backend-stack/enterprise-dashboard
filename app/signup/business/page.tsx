"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Building2, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* Business signup — the dashboard-native version of the marketing site's
   /partners intake. Creates the Firebase account AND the `lunaPartners`
   profile in one flow, then drops the business straight into the dashboard
   (pending approval, mirroring the existing platform's vendor lifecycle). */

const inputCls =
  "h-12 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ad-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function BusinessSignupPage() {
  const { demoMode, signUpEmail, getToken, refreshBusiness } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    locations: "1",
    visitorsPerWeek: "",
    avgMonthlySpend: "",
    bookingLink: "",
    message: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (demoMode) {
      router.push("/dashboard");
      return;
    }

    if (!form.businessName.trim()) return setError("Business name is required.");
    if (!form.phone.trim()) return setError("Phone number is required.");
    if (!form.address.trim()) return setError("Business address is required.");

    setBusy(true);
    try {
      // 1. Create the Firebase account (display name = business name).
      await signUpEmail(form.businessName.trim(), form.email, form.password);

      // 2. Create the lunaPartners business profile server-side.
      const token = await getToken();
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName: form.businessName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          locations: form.locations,
          visitorsPerWeek: form.visitorsPerWeek,
          avgMonthlySpend: form.avgMonthlySpend,
          bookingLink: form.bookingLink,
          message: form.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not create the business profile.");
      }

      await refreshBusiness();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ad-ink)] shadow-[var(--ad-shadow-card)]">
            <Zap size={22} className="text-white" fill="currentColor" strokeWidth={0} />
          </span>
          <div className="text-center">
            <p className="ad-display text-xl font-semibold text-[var(--ad-ink)]">Pulse</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ad-muted)]">
              Business Platform
            </p>
          </div>
        </div>

        <div className="rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-7 shadow-[var(--ad-shadow-float)] sm:p-10">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
              <Building2 size={17} />
            </span>
            <h1 className="ad-display text-2xl font-semibold tracking-tight text-[var(--ad-ink)]">
              Sign up your business
            </h1>
          </div>
          <p className="mb-7 text-sm text-[var(--ad-muted)]">
            Create a partner account and get the enterprise dashboard — messages,
            conversions, store traffic and billing in one place. Profiles are
            reviewed before full activation.
          </p>

          {error ? (
            <div className="mb-5 rounded-[var(--ad-radius-sm)] bg-[var(--ad-negative-bg)] px-4 py-3 text-xs text-[var(--ad-negative)]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Business name *">
              <input className={inputCls} placeholder="e.g. Gospel NYC" value={form.businessName} onChange={set("businessName")} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Work email *">
                <input className={inputCls} type="email" placeholder="you@business.com" value={form.email} onChange={set("email")} autoComplete="email" required />
              </Field>
              <Field label="Password *">
                <input className={inputCls} type="password" placeholder="8+ characters" value={form.password} onChange={set("password")} autoComplete="new-password" required minLength={8} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone *">
                <input className={inputCls} type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set("phone")} autoComplete="tel" required />
              </Field>
              <Field label="Locations">
                <input className={inputCls} type="number" min={1} value={form.locations} onChange={set("locations")} />
              </Field>
            </div>

            <Field label="Business address *">
              <input className={inputCls} placeholder="281 Lafayette St, New York, NY 10012" value={form.address} onChange={set("address")} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Visitors per week">
                <input className={inputCls} type="number" min={0} placeholder="e.g. 400" value={form.visitorsPerWeek} onChange={set("visitorsPerWeek")} />
              </Field>
              <Field label="Avg. customer spend / month ($)">
                <input className={inputCls} type="number" min={0} placeholder="e.g. 1000" value={form.avgMonthlySpend} onChange={set("avgMonthlySpend")} />
              </Field>
            </div>

            <Field label="Booking link (optional)">
              <input className={inputCls} type="url" placeholder="https://…" value={form.bookingLink} onChange={set("bookingLink")} />
            </Field>

            <Field label="Anything else? (optional)">
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 py-3 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
                placeholder="Tell us about your business…"
                value={form.message}
                onChange={set("message")}
              />
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-12 rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Creating your account…" : "Create business account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--ad-muted)]">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-[var(--ad-ink)] hover:underline">
              Sign in
            </Link>
            {" · "}
            <Link href="/signup" className="font-semibold text-[var(--ad-ink)] hover:underline">
              Personal signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
