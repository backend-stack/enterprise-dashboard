"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  PhoneMissed,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { maskPhone } from "@/components/dashboard/AgentBubble";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import type { CiData, CiStats, CiTenant } from "@/lib/ci";

/* Business overview, kept deliberately simple - exactly four things from the
   live assistant feed: Messages, Missed phone calls, Requests and Special
   Bookings. A KPI tile for each, then the Requests and Special Bookings
   lists underneath. */

export interface CiBundle {
  data: CiData;
  stats: CiStats;
  tenant: CiTenant;
}

function fmtBookingWhen(date: string, time: string): string {
  // `date` is YYYY-MM-DD; `time` is a display string like "7:30 PM".
  const parsed = date ? new Date(`${date}T00:00:00`) : null;
  const label =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : date;
  return [label, time].filter(Boolean).join(" · ");
}

function fmtUnix(seconds?: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BusinessOverview() {
  const { business, getToken } = useAuth();
  const [ci, setCi] = useState<CiBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const authed = useCallback(
    async (path: string) => {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`api ${res.status}`);
      return res.json();
    },
    [getToken]
  );

  useEffect(() => {
    if (!business) return;
    let alive = true;

    (async () => {
      try {
        const t = await authed("/api/ci/tenants");
        const tenant: CiTenant | undefined = (t.tenants ?? [])[0];
        if (!tenant) return;
        const [d, s] = await Promise.all([
          authed(`/api/ci/tenants/${tenant.id}/data`),
          authed(`/api/ci/tenants/${tenant.id}/stats`),
        ]);
        if (alive) setCi({ data: d, stats: s, tenant });
      } catch {
        /* not connected - the empty state below handles it */
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  if (!business) return null;

  return <OverviewView ci={ci} loading={loading} />;
}

/* Pure view - all layout, no data fetching. */
export function OverviewView({ ci, loading }: { ci: CiBundle | null; loading: boolean }) {
  const stats = ci?.stats ?? null;

  const requests = [...(ci?.data.inquiries ?? [])]
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
    .slice(0, 6);
  const bookings = [...(ci?.data.reservations ?? [])]
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
    .slice(0, 6);

  const messages = stats?.messages ?? ci?.data.messages?.length ?? null;
  const missedCalls = stats?.today?.missed_call ?? null;
  const requestCount = stats?.inquiries ?? ci?.data.inquiries?.length ?? null;
  const bookingCount = stats?.bookings ?? ci?.data.reservations?.length ?? null;

  const n = (v: number | null): string => (v !== null ? formatNumber(v) : loading ? "…" : "-");

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* The four numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        <TintKpi
          icon={<MessageSquare size={18} />}
          bg="var(--ad-navy-bg)"
          fg="var(--ad-navy)"
          value={n(messages)}
          label="Messages"
          sub={stats?.messages_7d !== undefined ? `${formatNumber(stats.messages_7d)} this week` : undefined}
        />
        <TintKpi
          icon={<PhoneMissed size={18} />}
          bg="var(--ad-orange-bg)"
          fg="var(--ad-orange)"
          value={n(missedCalls)}
          label="Missed phone calls"
          sub="text-back sent today"
        />
        <TintKpi
          icon={<CalendarDays size={18} />}
          bg="var(--ad-slate-bg)"
          fg="var(--ad-slate)"
          value={n(bookingCount)}
          label="Special Bookings"
          sub="via your assistant"
        />
        <TintKpi
          icon={<ClipboardList size={18} />}
          bg="var(--ad-critical-bg)"
          fg="var(--ad-critical-deep)"
          value={n(requestCount)}
          label="Requests"
          sub="customer inquiries"
        />
      </div>

      {/* Assistant not connected yet - one gentle nudge, nothing else. */}
      {!ci && !loading ? (
        <Card className="flex flex-col items-start gap-2 p-8">
          <h3 className="text-[15px] font-semibold text-[var(--ad-ink)]">
            Your assistant isn&apos;t connected yet
          </h3>
          <p className="max-w-md text-sm text-[var(--ad-muted)]">
            Once it&apos;s live, messages, missed phone calls, requests and special
            bookings show up here.
          </p>
          <Link
            href="/dashboard/support"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--ad-navy)] px-4 py-2 text-xs font-semibold text-white"
          >
            Contact support to get set up <ArrowRight size={13} />
          </Link>
        </Card>
      ) : null}

      {/* Special Bookings + Requests */}
      {ci ? (
        <div className="grid gap-4 xl:grid-cols-2 sm:gap-6">
          <Card>
            <CardHeader
              title="Special Bookings"
              action={
                <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
                  {formatNumber(bookingCount ?? 0)} total
                </span>
              }
            />
            {bookings.length ? (
              <ul className="flex flex-col px-4 pb-4">
                {bookings.map((b, i) => (
                  <li
                    key={`${b.name}-${b.date}-${i}`}
                    className="flex items-center gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-panel)] text-[var(--ad-ink)]">
                      <CalendarDays size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ad-ink)]">{b.name}</p>
                      <p className="truncate text-xs text-[var(--ad-muted)]">
                        Party of {b.party_size} · {fmtBookingWhen(b.date, b.time)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        b.status === "confirmed"
                          ? "positive"
                          : b.status === "cancelled"
                            ? "negative"
                            : "pending"
                      }
                    >
                      {b.status}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                No special bookings yet - reservations your assistant takes will appear here.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Requests"
              action={
                <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
                  {formatNumber(requestCount ?? 0)} total
                </span>
              }
            />
            {requests.length ? (
              <ul className="flex flex-col px-4 pb-4">
                {requests.map((r, i) => (
                  <li
                    key={`${r.customer_phone}-${r.created_at}-${i}`}
                    className="flex items-center gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-panel)] text-[var(--ad-ink)]">
                      <ClipboardList size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                        {r.text || r.request || "Customer request"}
                      </p>
                      <p className="truncate text-xs text-[var(--ad-muted)]">
                        {[r.customer_phone ? maskPhone(r.customer_phone) : "", fmtUnix(r.created_at)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                No requests yet - customer inquiries your assistant collects will appear here.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function TintKpi({
  icon,
  bg,
  fg,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  bg: string;
  fg: string;
  value: string;
  label: string;
  sub?: string;
}) {
  void fg;
  return (
    <div
      className="flex flex-col items-start justify-between gap-4 rounded-[var(--ad-radius-card)] p-6 shadow-[var(--ad-shadow-card)]"
      style={{ backgroundColor: bg }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ad-paper)] text-[var(--ad-ink)]">
        {icon}
      </span>
      <div>
        <div className="ad-display text-[1.7rem] font-semibold leading-none tracking-tight text-[var(--ad-ink)]">
          {value}
        </div>
        <div className="mt-1.5 text-[13px] font-medium text-[var(--ad-ink-soft)]">{label}</div>
        {sub ? <div className="mt-0.5 text-[11.5px] text-[var(--ad-muted)]">{sub}</div> : null}
      </div>
    </div>
  );
}
