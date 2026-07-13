"use client";

import { useState, type FormEvent } from "react";
import {
  Bot,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  KeyRound,
  Mail,
  Store,
  Wrench,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth-context";

/* Support — replaces the Live Assistant page. Businesses pick a common
   problem category, describe the issue, and the ticket lands in
   clo@contextualintelligence.co (via Resend) tagged with a ticket id +
   category so triage is a mailbox filter, not detective work. */

const CATEGORIES = [
  { key: "Billing & payments", icon: CreditCard, blurb: "Invoices, plan changes, initiation fee", fg: "var(--ad-teal)", bg: "var(--ad-teal-bg)" },
  { key: "Venue listing", icon: Store, blurb: "Wrong details, photos, publishing", fg: "var(--ad-navy)", bg: "var(--ad-navy-bg)" },
  { key: "AI assistant & bookings", icon: Bot, blurb: "Missed messages, wrong replies, reservations", fg: "var(--ad-blue)", bg: "var(--ad-blue-bg)" },
  { key: "Account & sign-in", icon: KeyRound, blurb: "Access, password, team members", fg: "var(--ad-orange)", bg: "var(--ad-orange-bg)" },
  { key: "Technical problem", icon: Wrench, blurb: "Something broken in the dashboard", fg: "var(--ad-pink)", bg: "var(--ad-pink-bg)" },
  { key: "Something else", icon: HelpCircle, blurb: "Anything that doesn't fit above", fg: "var(--ad-ink-soft)", bg: "var(--ad-panel)" },
] as const;

export default function SupportPage() {
  const { getToken, user } = useAuth();
  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ticketId: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category) {
      setError("Pick a category so we can route your ticket.");
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send your ticket.");
        return;
      }
      setDone({ ticketId: data.ticketId });
    } catch {
      setError("Couldn't reach the support API.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "h-12 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none";

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Tell us what's wrong — tickets go straight to the team and we reply to your email."
      />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] sm:gap-6">
        <Card>
          <CardHeader title="Open a ticket" />
          {done ? (
            <div className="flex flex-col items-center gap-4 px-6 pb-16 pt-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ad-positive-bg)] text-[var(--ad-positive)]">
                <CheckCircle2 size={28} />
              </span>
              <div>
                <p className="text-lg font-semibold text-[var(--ad-ink)]">
                  Ticket {done.ticketId} created
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--ad-muted)]">
                  We&apos;ve emailed the team{user?.email ? ` and will reply to ${user.email}` : ""}.
                  Most tickets get a response within one business day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDone(null);
                  setCategory(null);
                  setSubject("");
                  setMessage("");
                }}
                className="mt-2 rounded-full border border-[var(--ad-line)] px-6 py-3 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
              >
                Open another ticket
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-6 px-6 pb-6">
              <div>
                <p className="mb-3 text-[13px] font-medium text-[var(--ad-ink-soft)]">
                  What&apos;s it about?
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CATEGORIES.map(({ key, icon: Icon, blurb, fg, bg }) => {
                    const active = category === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                          active
                            ? "border-[var(--ad-ink)] bg-[var(--ad-panel-2)]"
                            : "border-[var(--ad-line)] hover:bg-[var(--ad-panel-2)]"
                        }`}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ad-ink)]">
                            {key}
                          </span>
                          <span className="block truncate text-[11.5px] text-[var(--ad-muted)]">
                            {blurb}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                placeholder="Subject — one line summary"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
                required
                className={inputCls}
              />
              <textarea
                placeholder="Describe the problem — what happened, when, and what you expected."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                required
                rows={6}
                className="w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 py-3 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
              />

              {error ? (
                <p className="rounded-xl bg-[var(--ad-negative-bg)] px-4 py-3 text-xs text-[var(--ad-negative)]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="h-12 rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send ticket"}
              </button>
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-4 sm:gap-6">
          <Card>
            <CardHeader title="Email us directly" />
            <div className="px-6 pb-6">
              <a
                href="mailto:clo@contextualintelligence.co"
                className="flex items-center gap-4 rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] p-4 transition-colors hover:bg-[var(--ad-panel-2)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
                  <Mail size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--ad-ink)]">
                    clo@contextualintelligence.co
                  </span>
                  <span className="block text-xs text-[var(--ad-muted)]">
                    Same inbox the ticket form uses
                  </span>
                </span>
              </a>
              <p className="mt-4 text-xs leading-relaxed text-[var(--ad-muted)]">
                Tickets from this page arrive pre-tagged with your business,
                plan and a ticket id, so they&apos;re usually faster than a
                plain email.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Before you write in" />
            <ul className="flex flex-col gap-4 px-6 pb-6 text-[13px] leading-relaxed text-[var(--ad-ink-soft)]">
              <li>
                <span className="font-semibold text-[var(--ad-ink)]">Billing:</span>{" "}
                invoices and payment methods are self-serve under{" "}
                <span className="font-medium">Billing → Manage in Stripe</span>.
              </li>
              <li>
                <span className="font-semibold text-[var(--ad-ink)]">Venue details:</span>{" "}
                include the venue name exactly as it appears on your Overview.
              </li>
              <li>
                <span className="font-semibold text-[var(--ad-ink)]">Assistant issues:</span>{" "}
                the date/time and the customer&apos;s number help us find the
                conversation fast.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
