"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth-context";
import { formatDay } from "@/lib/format";
import {
  DEFAULT_BOOKING_SETTINGS,
  type Booking,
  type BookingSettings,
  type BookingStatus,
} from "@/lib/booking";
import { MOCK_BOOKINGS, MOCK_BOOKING_SETTINGS } from "@/lib/mock-bookings";

/* Owner view: pending requests with approve/deny, upcoming approved bookings
   grouped by date, booking settings, and the copyable public link. In demo
   mode (no Firebase) everything works against in-memory mock data. */

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "pending",
  approved: "positive",
  denied: "negative",
  cancelled: "neutral",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fieldCls =
  "h-10 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 text-sm text-[var(--ad-ink)] focus:border-[var(--ad-accent)] focus:outline-none";

export function BookingsManager() {
  const { demoMode, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [businessId, setBusinessId] = useState("demo");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (demoMode) {
      setBookings(MOCK_BOOKINGS);
      setSettings(MOCK_BOOKING_SETTINGS);
      setLoading(false);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load bookings.");
        return;
      }
      setBusinessId(data.business.id);
      setBookings(data.bookings);
      setSettings(data.settings);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [demoMode, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: "approved" | "denied") => {
    setDeciding(id);
    try {
      if (demoMode) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...b, status: decision, decidedAt: new Date().toISOString() }
              : b
          )
        );
        return;
      }
      const token = await getToken();
      const res = await fetch(`/api/bookings/${id}/decide`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed.");
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
    } finally {
      setDeciding(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      if (demoMode) return;
      const token = await getToken();
      const res = await fetch("/api/bookings/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed.");
        return;
      }
      setSettings(data.settings);
    } finally {
      setSavingSettings(false);
    }
  };

  const publicUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/book/${businessId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings
    .filter((b) => b.status === "approved")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const upcomingByDate = upcoming.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.date] ??= []).push(b);
    return acc;
  }, {});

  if (loading) {
    return (
      <>
        <PageHeader title="Bookings" />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">Loading bookings…</Card>
      </>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <>
        <PageHeader title="Bookings" />
        <Card className="p-8">
          <p className="text-sm font-semibold text-[var(--ad-ink)]">
            Bookings unavailable
          </p>
          <p className="mt-1.5 text-sm text-[var(--ad-muted)]">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Approve or deny reservation requests from your public booking page."
        action={
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full border border-[var(--ad-line)] px-4 py-2.5 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy booking link"}
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-[var(--ad-negative-bg)] px-3.5 py-2.5 text-sm text-[var(--ad-negative)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {/* Pending requests */}
          <Card>
            <CardHeader
              title="Pending requests"
              action={
                pending.length ? (
                  <StatusBadge tone="pending">{pending.length} waiting</StatusBadge>
                ) : undefined
              }
            />
            {pending.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                No pending requests. New requests from your booking page land
                here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--ad-line)]">
                {pending.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ad-ink)]">
                        {b.name}
                        <span className="ml-2 font-normal text-[var(--ad-muted)]">
                          party of {b.partySize}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted)]">
                        {formatDay(b.date)} at {b.time}
                        {b.note ? ` - "${b.note}"` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={deciding === b.id}
                        onClick={() => void decide(b.id, "approved")}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--ad-ink)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={deciding === b.id}
                        onClick={() => void decide(b.id, "denied")}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--ad-line)] px-4 py-2 text-xs font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)] disabled:opacity-40"
                      >
                        <X size={13} /> Deny
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Upcoming approved */}
          <Card>
            <CardHeader title="Upcoming bookings" />
            {upcoming.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                Approved bookings show up here, grouped by day.
              </p>
            ) : (
              <div className="space-y-4 px-6 pb-6">
                {Object.entries(upcomingByDate).map(([date, items]) => (
                  <div key={date}>
                    <p className="mb-2 text-xs font-semibold text-[var(--ad-muted)]">
                      {formatDay(date)}
                    </p>
                    <ul className="space-y-2">
                      {items.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ad-line)] px-4 py-3"
                        >
                          <p className="min-w-0 flex-1 truncate text-sm text-[var(--ad-ink)]">
                            <span className="font-semibold">{b.time}</span>
                            <span className="ml-2">{b.name}</span>
                            <span className="ml-2 text-[var(--ad-muted)]">
                              party of {b.partySize}
                            </span>
                          </p>
                          <StatusBadge tone={TONE[b.status]}>{b.status}</StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Settings */}
        <Card className="h-fit">
          <CardHeader title="Booking settings" />
          <div className="space-y-4 px-6 pb-6">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[var(--ad-ink-soft)]">
                Accept online bookings
              </span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
                className="h-5 w-5 accent-[var(--ad-ink)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Opens
                </span>
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                  className={fieldCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Closes
                </span>
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                  className={fieldCls}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Slot length (min)
                </span>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={settings.slotMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, slotMinutes: Number(e.target.value) })
                  }
                  className={fieldCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Capacity per slot
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.capacityPerSlot}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      capacityPerSlot: Number(e.target.value),
                    })
                  }
                  className={fieldCls}
                />
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                Days open
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, i) => {
                  const on = settings.daysOpen.includes(i);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          daysOpen: on
                            ? settings.daysOpen.filter((d) => d !== i)
                            : [...settings.daysOpen, i].sort(),
                        })
                      }
                      className={`h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                        on
                          ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                          : "border-[var(--ad-line)] text-[var(--ad-muted)] hover:bg-[var(--ad-panel)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={savingSettings}
              className="h-10 w-full rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {savingSettings ? "Saving…" : demoMode ? "Save (demo)" : "Save settings"}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
