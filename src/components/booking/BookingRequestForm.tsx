"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Slot } from "@/lib/booking";

/* Public reservation form. Fetches availability per date from the slots API,
   posts the request, then shows the status link. No auth - customers use it. */

interface SlotsResponse {
  business: { id: string; name: string };
  settings: { slotMinutes: number; daysOpen: number[] };
  slots: Slot[];
}

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3.5 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-accent)] focus:outline-none";

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function BookingRequestForm({ businessId }: { businessId: string }) {
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusUrl, setStatusUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const loadSlots = useCallback(
    async (d: string) => {
      setLoadingSlots(true);
      setTime("");
      try {
        const qs = new URLSearchParams({ businessId, ...(d ? { date: d } : {}) });
        const res = await fetch(`/api/bookings/slots?${qs}`);
        if (!res.ok) {
          setUnavailable(true);
          return;
        }
        const data: SlotsResponse = await res.json();
        setBusinessName(data.business.name);
        setSlots(data.slots);
      } catch {
        setUnavailable(true);
      } finally {
        setLoadingSlots(false);
      }
    },
    [businessId]
  );

  // Initial load fetches the business name (empty date - no slots yet).
  useEffect(() => {
    void loadSlots("");
  }, [loadSlots]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, email, phone, partySize, date, time, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        if (res.status === 409) void loadSlots(date); // slot filled - refresh grid
        return;
      }
      setStatusUrl(data.statusUrl);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(statusUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (unavailable) {
    return (
      <Card className="w-full max-w-lg p-8">
        <p className="text-sm font-semibold text-[var(--ad-ink)]">
          Bookings unavailable
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          This business isn&apos;t accepting online reservations right now.
        </p>
      </Card>
    );
  }

  if (statusUrl) {
    return (
      <Card className="w-full max-w-lg p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-positive-bg)] text-[var(--ad-positive)]">
          <Check size={20} />
        </span>
        <h2 className="mt-4 text-lg font-bold tracking-tight text-[var(--ad-ink)]">
          Request sent!
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          {businessName} will approve or deny your reservation. We emailed your
          status link to {email} - you can also track it here:
        </p>
        <div className="mt-4 flex items-center gap-2">
          <a
            href={statusUrl}
            className="min-w-0 flex-1 truncate rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel-2)] px-3.5 py-2.5 text-xs text-[var(--ad-ink-soft)]"
          >
            {statusUrl}
          </a>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy status link"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ad-line)] text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
        <CalendarCheck size={20} />
      </span>
      <h1 className="mt-4 text-lg font-bold tracking-tight text-[var(--ad-ink)]">
        {businessName ? `Reserve a spot at ${businessName}` : "Reserve a spot"}
      </h1>
      <p className="mt-1 text-sm text-[var(--ad-muted)]">
        Pick a date and time - your request is confirmed once the business
        approves it.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
            Date
          </span>
          <input
            type="date"
            required
            min={todayLocal()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) void loadSlots(e.target.value);
            }}
            className={inputCls}
          />
        </label>

        {date ? (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Time
            </span>
            {loadingSlots ? (
              <p className="text-sm text-[var(--ad-muted)]">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[var(--ad-muted)]">
                No times available on this date - try another day.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={s.remaining === 0}
                    onClick={() => setTime(s.time)}
                    className={`h-10 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                      time === s.time
                        ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                        : "border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Your name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Party size
            </span>
            <input
              type="number"
              required
              min={1}
              max={100}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Phone (optional)
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything the business should know"
            className="w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3.5 py-2.5 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-accent)] focus:outline-none"
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-[var(--ad-negative-bg)] px-3.5 py-2.5 text-sm text-[var(--ad-negative)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !date || !time}
          className="h-11 w-full rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Request reservation"}
        </button>
      </form>
    </Card>
  );
}
