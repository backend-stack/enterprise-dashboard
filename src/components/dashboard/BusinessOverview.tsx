"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarDays,
  Heart,
  MapPin,
  MessageSquare,
  Phone,
  PhoneMissed,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import type { CiData, CiStats, CiTenant } from "@/lib/ci";

/* Business overview - reference-dashboard layout for vendor accounts:
   welcome banner with headline stats, tinted KPI cards, a weekly
   conversation-activity chart (live CI feed), an engagement donut by venue,
   the venue table and recent bookings. Everything renders from real data;
   CI-backed panels disappear gracefully when the assistant isn't connected. */

interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  imageUrl: string | null;
  website: string | null;
  likes: number;
  live: boolean;
}

interface Analytics {
  venues: Venue[];
  totals: { venues: number; liveVenues: number; likes: number } | null;
}

/* Categorical slots for the donut - brand slate, orange, black and a mid
   slate tint, in this order. "Other" is de-emphasis gray. */
const DONUT_COLORS = ["#0b2447", "#fe7f2d", "#000000", "#5f7381"];
const OTHER_COLOR = "#cdd3da";

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
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

export interface CiBundle {
  data: CiData;
  stats: CiStats;
  tenant: CiTenant;
}

export function BusinessOverview() {
  const { business, getToken } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [ci, setCi] = useState<CiBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<CiTenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

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
        const json = await authed("/api/business/analytics");
        if (alive) setData(json);
      } catch {
        /* analytics unavailable - empty states below handle it */
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // Assistant feed is optional - skip silently when unconfigured. The
    // account may own several tenants (locations); load the list once and
    // default to the first.
    (async () => {
      try {
        const t = await authed("/api/ci/tenants");
        const list: CiTenant[] = t.tenants ?? [];
        if (!alive || !list.length) return;
        setTenants(list);
        setTenantId((prev) => prev ?? list[0].id);
      } catch {
        /* not connected */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  // Load (and reload) the assistant feed for the selected tenant.
  useEffect(() => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;
    let alive = true;
    (async () => {
      try {
        const [d, s] = await Promise.all([
          authed(`/api/ci/tenants/${tenant.id}/data`),
          authed(`/api/ci/tenants/${tenant.id}/stats`),
        ]);
        if (alive) setCi({ data: d, stats: s, tenant });
      } catch {
        /* keep the previous tenant's data on transient failures */
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantId, tenants, authed]);

  if (!business) return null;

  return (
    <>
      {/* Location switcher - only when the account owns several tenants. */}
      {tenants.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
          {tenants.map((t) => {
            const active = t.id === tenantId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTenantId(t.id)}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                    : "border-[var(--ad-line)] bg-[var(--ad-paper)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
                }`}
              >
                {t.name || t.id}
              </button>
            );
          })}
        </div>
      ) : null}
      <OverviewView
        businessName={business.businessName}
        approved={business.approved}
        plan={business.plan}
        data={data}
        ci={ci}
        loading={loading}
      />
    </>
  );
}

/* Pure view - all layout, no data fetching. */
export function OverviewView({
  businessName,
  approved,
  plan,
  data,
  ci,
  loading,
}: {
  businessName: string;
  approved: boolean;
  plan: string | null;
  data: Analytics | null;
  ci: CiBundle | null;
  loading: boolean;
}) {
  // Messages bucketed per day over the trailing week, for the bar chart.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return { date: d, label: fmtDay(d), inbound: 0, replies: 0 };
    });
    (ci?.data.messages ?? []).forEach((m) => {
      const t = new Date(m.created_at * 1000);
      t.setHours(0, 0, 0, 0);
      const idx = days.findIndex((d) => d.date.getTime() === t.getTime());
      if (idx >= 0) {
        if (m.role === "user") days[idx].inbound += 1;
        else days[idx].replies += 1;
      }
    });
    return days;
  }, [ci]);

  const bookings = useMemo(() => {
    const list = [...(ci?.data.reservations ?? [])];
    list.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    return list.slice(0, 6);
  }, [ci]);

  const totals = data?.totals ?? null;
  const venues = data?.venues ?? [];
  const stats = ci?.stats ?? null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Banner + KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr] sm:gap-6">
        <WelcomeBanner
          name={businessName}
          approved={approved}
          pills={
            stats
              ? [
                  { value: formatNumber(stats.conversations ?? 0), label: "Conversations" },
                  {
                    value:
                      stats.conversion_rate !== undefined
                        ? `${Math.round(stats.conversion_rate * 100)}%`
                        : "-",
                    label: "Conversion",
                  },
                ]
              : [
                  { value: totals ? formatNumber(totals.venues) : "…", label: "Venues" },
                  { value: totals ? formatNumber(totals.likes) : "…", label: "Likes" },
                ]
          }
        />
        <TintKpi
          icon={<Store size={18} />}
          bg="var(--ad-navy-bg)"
          fg="var(--ad-navy)"
          value={totals ? formatNumber(totals.liveVenues) : "…"}
          label="Venues live"
          sub={totals ? `of ${formatNumber(totals.venues)} total` : undefined}
        />
        <TintKpi
          icon={<Heart size={18} />}
          bg="var(--ad-orange-bg)"
          fg="var(--ad-orange)"
          value={totals ? formatNumber(totals.likes) : "…"}
          label="Customer likes"
          sub="across all venues"
        />
        {stats ? (
          <TintKpi
            icon={<CalendarDays size={18} />}
            bg="var(--ad-positive-bg)"
            fg="var(--ad-positive)"
            value={formatNumber(stats.bookings ?? 0)}
            label="Bookings"
            sub="via live assistant"
          />
        ) : (
          <TintKpi
            icon={<MessageSquare size={18} />}
            bg="var(--ad-positive-bg)"
            fg="var(--ad-positive)"
            value={plan ?? "-"}
            label="Current plan"
            sub={approved ? "account approved" : "pending approval"}
          />
        )}
      </div>

      {/* Activity chart + assistant performance (donut takes the slot when
          the assistant isn't connected) */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] sm:gap-6">
        {ci ? (
          <ActivityChart
            week={week}
            summary={[
              { label: "Messages this week", value: formatNumber(stats?.messages_7d ?? week.reduce((s, d) => s + d.inbound + d.replies, 0)) },
              { label: "New customers", value: formatNumber(stats?.customers_7d ?? 0) },
              { label: "Inquiries", value: formatNumber(stats?.inquiries ?? 0) },
            ]}
          />
        ) : (
          <Card className="flex flex-col items-start justify-center gap-2 p-8">
            <h3 className="text-[15px] font-semibold text-[var(--ad-ink)]">Conversation activity</h3>
            <p className="max-w-md text-sm text-[var(--ad-muted)]">
              Your AI assistant isn&apos;t connected yet - once it&apos;s live,
              daily conversations, bookings and conversion show up here.
            </p>
            <Link
              href="/dashboard/support"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--ad-navy)] px-4 py-2 text-xs font-semibold text-white"
            >
              Contact support to get set up <ArrowRight size={13} />
            </Link>
          </Card>
        )}
        {stats ? (
          <AssistantPanel stats={stats} line={ci?.tenant.line} />
        ) : (
          <EngagementDonut venues={venues} totalLikes={totals?.likes ?? 0} loading={loading} />
        )}
      </div>

      {/* With the assistant connected the donut moves down next to bookings */}
      {stats ? (
        <div className={`grid gap-4 sm:gap-6 ${bookings.length ? "xl:grid-cols-[1fr_1.5fr]" : ""}`}>
          <EngagementDonut venues={venues} totalLikes={totals?.likes ?? 0} loading={loading} />
          {bookings.length ? (
            <Card>
              <CardHeader
                title="Recent bookings"
                action={
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--ad-navy-bg)] px-3 py-1 text-xs font-semibold text-[var(--ad-navy)]">
                    <Bot size={13} /> Booked by your assistant
                  </span>
                }
              />
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
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Venues table */}
      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader
            title="Your venues"
            action={
              totals ? (
                <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
                  {formatNumber(totals.liveVenues)} live
                </span>
              ) : undefined
            }
          />
          {venues.length ? (
            <DataTable headers={["Venue", "Category", "Location", "Likes", "Status"]}>
              {venues.map((v) => (
                <Tr key={v.id}>
                  <Td className="font-medium text-[var(--ad-ink)]">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--ad-panel)] text-[var(--ad-ink)]">
                        {v.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Store size={15} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{v.name}</span>
                        {v.website ? (
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs font-normal text-[var(--ad-navy)] hover:underline"
                          >
                            Website
                          </a>
                        ) : null}
                      </span>
                    </span>
                  </Td>
                  <Td className="capitalize">{v.category || "-"}</Td>
                  <Td>
                    {v.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="shrink-0 text-[var(--ad-muted)]" />
                        <span className="max-w-[180px] truncate">{v.location}</span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </Td>
                  <Td className="font-semibold text-[var(--ad-ink)]">{formatNumber(v.likes)}</Td>
                  <Td>
                    <StatusBadge tone={v.live ? "positive" : "pending"}>
                      {v.live ? "Live" : "Unpublished"}
                    </StatusBadge>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
              {loading
                ? "Loading your venues…"
                : "No venues are linked to your account yet - once venues are added to your profile they'll appear here with live engagement numbers."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* Assistant performance - what the bot handled for the business: today's
   answered rate as a meter, the day's traffic split, median reply speed and
   reservations it has taken. */
function AssistantPanel({ stats, line }: { stats: CiStats; line?: string }) {
  const today = stats.today ?? {};
  const inbound = today.inbound ?? 0;
  const replies = today.reply ?? 0;
  const missed = today.missed_call ?? 0;
  const blocked = today.block ?? 0;
  const answeredPct = inbound > 0 ? Math.min(100, Math.round((replies / inbound) * 100)) : null;
  const p50 = stats.latency?.p50_ms;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="AI assistant"
        action={
          <StatusBadge tone="positive">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--ad-positive)]" />
            Online
          </StatusBadge>
        }
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
        {line ? (
          <p className="-mt-1 flex items-center gap-1.5 text-xs text-[var(--ad-muted)]">
            <Phone size={12} className="shrink-0" />
            Answering <span className="font-semibold text-[var(--ad-ink-soft)]">{line}</span>
          </p>
        ) : null}
        <div>
          <div className="flex items-baseline justify-between text-xs text-[var(--ad-ink-soft)]">
            <span>Answered today</span>
            <span className="font-semibold text-[var(--ad-ink)]">
              {answeredPct !== null ? `${answeredPct}%` : "No messages yet"}
            </span>
          </div>
          {/* Meter: fill + track from the same teal ramp */}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ad-teal-bg)]">
            <div
              className="h-full rounded-full bg-[var(--ad-teal)] transition-all duration-300"
              style={{ width: `${answeredPct ?? 0}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat icon={<MessageSquare size={14} />} value={inbound} label="Inbound today" fg="var(--ad-blue)" bg="var(--ad-blue-bg)" />
          <MiniStat icon={<Bot size={14} />} value={replies} label="Replies sent" fg="var(--ad-navy)" bg="var(--ad-navy-bg)" />
          <MiniStat icon={<PhoneMissed size={14} />} value={missed} label="Missed-call text-backs" fg="var(--ad-orange)" bg="var(--ad-orange-bg)" />
          <MiniStat icon={<ShieldCheck size={14} />} value={blocked} label="Stopped by consent" fg="var(--ad-pink)" bg="var(--ad-pink-bg)" />
        </div>

        <div className="mt-auto flex divide-x divide-[var(--ad-line)] rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)]">
          <div className="flex-1 px-4 py-3">
            <div className="ad-display text-lg font-semibold leading-tight text-[var(--ad-ink)]">
              {p50 != null ? `${(p50 / 1000).toFixed(1)}s` : "-"}
            </div>
            <div className="text-[11px] text-[var(--ad-muted)]">Median reply time</div>
          </div>
          <div className="flex-1 px-4 py-3">
            <div className="ad-display text-lg font-semibold leading-tight text-[var(--ad-ink)]">
              {formatNumber(stats.bookings ?? 0)}
            </div>
            <div className="text-[11px] text-[var(--ad-muted)]">Reservations booked</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({
  icon,
  value,
  label,
  fg,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  fg: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-panel)] text-[var(--ad-ink)]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold leading-tight text-[var(--ad-ink)]">
          {value.toLocaleString()}
        </div>
        <div className="truncate text-[11px] text-[var(--ad-muted)]">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WelcomeBanner({
  name,
  approved,
  pills,
}: {
  name: string;
  approved: boolean;
  pills: { value: string; label: string }[];
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-panel-2)] p-6 shadow-[var(--ad-shadow-card)] sm:col-span-2 xl:col-span-1">
      <div className="relative">
        <div className="flex items-center gap-2">
          <h1 className="ad-display text-xl font-bold tracking-tight text-[var(--ad-ink)] sm:text-2xl">
            Welcome back, {name}
          </h1>
          {approved ? <BadgeCheck size={18} className="shrink-0 text-[var(--ad-navy)]" /> : null}
        </div>
        <p className="mt-1 text-sm text-[var(--ad-ink-soft)]">Here&apos;s how your business is doing.</p>

        <div className="mt-6 inline-flex overflow-hidden rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)]">
          {pills.map((p, i) => (
            <div
              key={p.label}
              className={`px-4 py-3 text-center ${i > 0 ? "border-l border-[var(--ad-line)]" : ""}`}
            >
              <div className="text-lg font-bold leading-tight text-[var(--ad-ink)]">{p.value}</div>
              <div className="text-[11px] text-[var(--ad-muted)]">{p.label}</div>
            </div>
          ))}
        </div>
      </div>
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

/* Single-series weekly bar chart - thin slate columns, 4px rounded tips,
   solid hairline gridlines, per-bar hover tooltip with the inbound/reply
   breakdown. */
function ActivityChart({
  week,
  summary,
}: {
  week: { date: Date; label: string; inbound: number; replies: number }[];
  summary: { label: string; value: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...week.map((d) => d.inbound + d.replies), 1);
  const ticks = [max, Math.round(max / 2), 0];

  return (
    <Card>
      <CardHeader
        title="Conversation activity"
        action={
          <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
            Last 7 days
          </span>
        }
      />

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 px-6 pb-2">
        {summary.map((s) => (
          <div key={s.label}>
            <div className="text-xs text-[var(--ad-ink-soft)]">{s.label}</div>
            <div className="ad-display text-xl font-semibold leading-tight text-[var(--ad-ink)]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 px-6 pb-6 pt-4">
        <div className="flex h-40 w-7 flex-col justify-between pb-5 text-right text-[10px] text-[var(--ad-muted)]">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 bottom-5 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-[var(--ad-line)]" />
            ))}
          </div>

          <div className="relative flex h-40 items-stretch">
            {week.map((d, i) => {
              const total = d.inbound + d.replies;
              const isActive = active === i;
              return (
                <div
                  key={d.label + i}
                  className="group relative flex flex-1 cursor-default flex-col items-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((p) => (p === i ? null : p))}
                >
                  {isActive && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-3 text-left shadow-[var(--ad-shadow-float)]">
                      <p className="mb-1.5 text-xs font-semibold text-[var(--ad-ink)]">
                        {d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <TipRow label="Messages" value={total} strong />
                      <TipRow label="From customers" value={d.inbound} />
                      <TipRow label="Assistant replies" value={d.replies} />
                    </div>
                  )}

                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-4 max-w-6 rounded-t-[4px] transition-all duration-200 sm:w-5"
                      style={{
                        height: `${Math.max((total / max) * 100, total > 0 ? 3 : 1.5)}%`,
                        backgroundColor: "var(--ad-blue)",
                        opacity: active !== null && !isActive ? 0.35 : 1,
                      }}
                    />
                  </div>
                  <span
                    className="mt-2 h-5 text-xs leading-5 transition-colors"
                    style={{ color: isActive ? "var(--ad-ink)" : "var(--ad-muted)" }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TipRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="text-[var(--ad-ink-soft)]">{label}</span>
      <span className={`text-[var(--ad-ink)] ${strong ? "font-bold" : "font-semibold"}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

/* Donut of likes by venue - top four venues in validated categorical slots,
   remainder folded into a gray "Other". Legend rows carry names + counts so
   identity never rides on color alone. */
function EngagementDonut({
  venues,
  totalLikes,
  loading,
}: {
  venues: Venue[];
  totalLikes: number;
  loading: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  const slices = useMemo(() => {
    const liked = venues.filter((v) => v.likes > 0);
    const top = liked.slice(0, 4).map((v, i) => ({
      name: v.name,
      value: v.likes,
      color: DONUT_COLORS[i],
    }));
    const rest = liked.slice(4).reduce((s, v) => s + v.likes, 0);
    if (rest > 0) top.push({ name: "Other", value: rest, color: OTHER_COLOR });
    return top;
  }, [venues]);

  const R = 62;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 3 : 0; // 2–3px surface gap between arcs

  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = s.value / totalLikes;
    const len = Math.max(frac * C - GAP, 1.5);
    const arc = { ...s, len, offset };
    offset += frac * C;
    return arc;
  });

  const shown = active !== null && arcs[active] ? arcs[active] : null;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Engagement by venue" />
      {slices.length ? (
        <div className="flex flex-1 flex-col items-center gap-6 px-6 pb-6">
          <div className="relative">
            <svg width={170} height={170} viewBox="0 0 170 170" aria-hidden>
              <circle
                cx={85}
                cy={85}
                r={R}
                fill="none"
                stroke="var(--ad-panel)"
                strokeWidth={STROKE}
              />
              {arcs.map((a, i) => (
                <circle
                  key={a.name}
                  cx={85}
                  cy={85}
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={active === null || active === i ? STROKE : STROKE - 6}
                  strokeDasharray={`${a.len} ${C - a.len}`}
                  strokeDashoffset={-a.offset}
                  strokeLinecap="round"
                  transform="rotate(-90 85 85)"
                  className="cursor-pointer transition-all duration-200"
                  style={{ opacity: active === null || active === i ? 1 : 0.35 }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((p) => (p === i ? null : p))}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="ad-display text-2xl font-semibold leading-none text-[var(--ad-ink)]">
                {formatNumber(shown ? shown.value : totalLikes)}
              </span>
              <span className="mt-1 max-w-[90px] truncate text-[11px] text-[var(--ad-muted)]">
                {shown ? shown.name : "Total likes"}
              </span>
            </div>
          </div>

          <ul className="w-full">
            {arcs.map((a, i) => (
              <li
                key={a.name}
                className="flex cursor-default items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors hover:bg-[var(--ad-panel-2)]"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((p) => (p === i ? null : p))}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="min-w-0 flex-1 truncate text-[var(--ad-ink-soft)]">{a.name}</span>
                <span className="font-semibold text-[var(--ad-ink)]">{formatNumber(a.value)}</span>
                <span className="w-9 text-right text-[var(--ad-muted)]">
                  {Math.round((a.value / totalLikes) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
          {loading
            ? "Loading engagement…"
            : "No customer likes yet - engagement per venue will appear here as customers interact with your listings."}
        </p>
      )}
    </Card>
  );
}
