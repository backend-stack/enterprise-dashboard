import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CircleCheck, CreditCard, MessageSquare, Radio, Store, UserPlus, Users } from "lucide-react";
import { getViewer } from "@/lib/server-auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { BusinessHome } from "@/components/dashboard/BusinessHome";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import {
  fetchActivity,
  fetchEvents,
  fetchRsvps,
  fetchSignupsByDay,
  fetchUserStats,
  fetchVenueEngagement,
} from "@/lib/platform-data";
import { formatNumber } from "@/lib/format";

/* Overview — live platform metrics from Firestore on every load. */
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtWhen(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* Business accounts get a scoped overview — their venues plus quick links.
   Platform-wide metrics below are rendered for admins only. */
function QuickLink({
  href,
  icon,
  title,
  blurb,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-5 shadow-[var(--ad-shadow-card)] transition-colors hover:bg-[var(--ad-panel-2)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--ad-ink)]">{title}</span>
        <span className="block truncate text-xs text-[var(--ad-muted)]">{blurb}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-[var(--ad-muted)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default async function OverviewPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");

  // Business / non-admin accounts: only their own data, never platform-wide.
  if (viewer.kind === "user" && !viewer.isAdmin) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Your business at a glance." />
        <BusinessHome />
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickLink
            href="/dashboard/assistant"
            icon={<Radio size={19} />}
            title="Live Assistant"
            blurb="Real-time conversations, bookings and customers"
          />
          <QuickLink
            href="/dashboard/billing"
            icon={<CreditCard size={19} />}
            title="Billing"
            blurb="Plan, invoices and payment method"
          />
        </div>
      </>
    );
  }

  const [stats, signups, events, rsvps, activity, venueData] = await Promise.all([
    fetchUserStats().catch(() => null),
    fetchSignupsByDay(7).catch(() => null),
    fetchEvents().catch(() => null),
    fetchRsvps().catch(() => null),
    fetchActivity(8).catch(() => null),
    fetchVenueEngagement().catch(() => null),
  ]);

  if (!stats) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Live platform metrics." />
        <BusinessHome />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured — add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const weekSignups = (signups ?? []).reduce((s, d) => s + d.signups, 0);
  const weekApproved = (signups ?? []).reduce((s, d) => s + d.approved, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Live from your platform database — members, events, venues and activity."
      />

      {/* Live business section — renders only for business accounts. */}
      <BusinessHome />

      {/* KPI strip */}
      <Card className="p-1.5">
        <CardHeader
          title="Platform"
          accent="var(--ad-orange)"
          action={
            <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
              Live
            </span>
          }
        />
        <div className="flex flex-col gap-4 p-4 pt-1 xl:flex-row">
          <Kpi
            icon={<Users size={17} />}
            label="Total members"
            value={formatNumber(stats.total)}
            tone="navy"
            emphasis
          />
          <Kpi
            icon={<CircleCheck size={17} />}
            label="Approved"
            value={formatNumber(stats.approved)}
            tone="navy"
          />
          <Kpi
            icon={<UserPlus size={17} />}
            label="New this week"
            value={formatNumber(stats.newThisWeek)}
            tone="orange"
          />
          <Kpi
            icon={<Store size={17} />}
            label="Venues live"
            value={formatNumber(venueData?.venues.length ?? 0)}
            tone="orange"
          />
        </div>
      </Card>

      {/* Signups chart + events */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr] sm:mt-6 sm:gap-6">
        {signups ? (
          <GroupedBarChart
            title="Signups"
            seriesA="Signed up"
            seriesB="Approved"
            rangeLabel="Last 7 days"
            data={signups.map((d) => ({
              label: d.label,
              tooltipLabel: fmtDate(d.date),
              a: d.signups,
              b: d.approved,
            }))}
            summary={[
              { label: "Signed up", value: formatNumber(weekSignups), dotColor: "var(--ad-navy)" },
              { label: "Approved", value: formatNumber(weekApproved), dotColor: "var(--ad-orange)" },
              {
                label: "Approval rate",
                value: weekSignups ? `${Math.round((weekApproved / weekSignups) * 100)}%` : "—",
              },
            ]}
          />
        ) : null}

        <Card className="p-1.5">
          <CardHeader title="Events" accent="var(--ad-navy)" />
          <div className="flex flex-col gap-3 px-4 pb-5 pt-1">
            {(events ?? []).map((e) => {
              const fill = e.capacity ? Math.min(100, Math.round((e.going / e.capacity) * 100)) : 0;
              return (
                <div
                  key={e.id}
                  className="rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">{e.name}</p>
                      <p className="truncate text-xs text-[var(--ad-muted)]">
                        {e.venue}
                        {e.address ? ` · ${e.address}` : ""}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--ad-ink-soft)]">
                      <CalendarDays size={12} className="text-[var(--ad-muted)]" />
                      {fmtDate(e.startsAt)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ad-mist)]">
                    <div
                      className="h-full rounded-full bg-[var(--ad-navy)]"
                      style={{ width: `${Math.max(fill, e.going > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--ad-muted)]">
                    <span>
                      <strong className="font-semibold text-[var(--ad-ink)]">{e.going}</strong> going
                      {e.capacity ? ` of ${e.capacity}` : ""}
                    </span>
                    {e.pending ? <span>{e.pending} pending</span> : null}
                    {e.priceCents ? <span>${(e.priceCents / 100).toFixed(0)} / ticket</span> : null}
                    {!e.published ? (
                      <StatusBadge tone="orange">draft</StatusBadge>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!events?.length ? (
              <p className="px-1 py-3 text-sm text-[var(--ad-muted)]">No events yet.</p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Activity + RSVPs */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr] sm:mt-6 sm:gap-6">
        <Card className="p-1.5">
          <CardHeader title="Recent admin activity" accent="var(--ad-navy)" />
          <ul className="flex flex-col px-3 pb-4">
            {(activity ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
                  <MessageSquare size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                    {a.actor} · {a.action}
                  </p>
                  <p className="truncate text-xs text-[var(--ad-muted)]">{a.target || "—"}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--ad-muted)]">{fmtWhen(a.at)}</span>
              </li>
            ))}
            {!activity?.length ? (
              <p className="px-2 py-4 text-sm text-[var(--ad-muted)]">No activity logged yet.</p>
            ) : null}
          </ul>
        </Card>

        <Card className="p-1.5">
          <CardHeader title="Recent RSVPs" accent="var(--ad-orange)" />
          {rsvps?.length ? (
            <DataTable headers={["Guest", "Event", "Status", "Applied"]}>
              {rsvps.slice(0, 8).map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-[var(--ad-ink)]">{r.name}</Td>
                  <Td>{r.event}</Td>
                  <Td>
                    <StatusBadge
                      tone={
                        r.status === "approved" || r.status === "paid"
                          ? "positive"
                          : r.status === "denied"
                            ? "negative"
                            : "orange"
                      }
                    >
                      {r.status}
                    </StatusBadge>
                  </Td>
                  <Td>{fmtWhen(r.appliedAt)}</Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-5 pb-6 pt-1 text-sm text-[var(--ad-muted)]">No RSVPs yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
