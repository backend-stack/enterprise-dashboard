import { CalendarDays, CircleCheck, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";
import { getViewer } from "@/lib/server-auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { Funnel } from "@/components/dashboard/Funnel";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { fetchEvents, fetchRsvps } from "@/lib/platform-data";
import { formatNumber } from "@/lib/format";

/* Conversions - live RSVP pipeline and event fill rates. */
export const dynamic = "force-dynamic";

function fmtWhen(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const GOOD_STATUSES = new Set(["approved", "paid", "going", "confirmed"]);

export default async function ConversionsPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");
  if (viewer.kind === "user" && !viewer.isAdmin) return <AdminOnly title="Conversions" />;

  const [rsvps, events] = await Promise.all([
    fetchRsvps().catch(() => null),
    fetchEvents().catch(() => null),
  ]);

  if (!rsvps) {
    return (
      <>
        <PageHeader title="Conversions" subtitle="Live RSVP pipeline." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured - add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const statusCounts = new Map<string, number>();
  rsvps.forEach((r) => statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1));
  const converted = rsvps.filter((r) => GOOD_STATUSES.has(r.status)).length;
  const totalGoing = (events ?? []).reduce((s, e) => s + e.going, 0);
  const totalCapacity = (events ?? []).reduce((s, e) => s + e.capacity, 0);

  const funnelStages = [
    { label: "RSVP applications", value: rsvps.length },
    ...[...statusCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ label: `Status: ${status}`, value: count })),
  ];

  return (
    <>
      <PageHeader
        title="Conversions"
        subtitle="Live from Firestore · how RSVP applications turn into confirmed guests."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          icon={<TrendingUp size={16} />}
          label="RSVP applications"
          value={formatNumber(rsvps.length)}
          tone="orange"
          emphasis
        />
        <Kpi
          icon={<CircleCheck size={16} />}
          label="Confirmed"
          value={formatNumber(converted)}
          tone="navy"
        />
        <Kpi
          icon={<CalendarDays size={16} />}
          label="Seats filled"
          value={totalCapacity ? `${formatNumber(totalGoing)} / ${formatNumber(totalCapacity)}` : "-"}
          tone="navy"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr] sm:mt-6 sm:gap-6">
        <Funnel stages={funnelStages} />

        <Card>
          <CardHeader title="Event fill rates" accent="var(--ad-navy)" />
          {events?.length ? (
            <DataTable headers={["Event", "Date", "Going", "Pending", "Capacity", "Fill"]}>
              {events.map((e) => {
                const fill = e.capacity ? Math.round((e.going / e.capacity) * 100) : 0;
                return (
                  <Tr key={e.id}>
                    <Td className="font-medium text-[var(--ad-ink)]">
                      {e.name}
                      <span className="block text-xs font-normal text-[var(--ad-muted)]">{e.venue}</span>
                    </Td>
                    <Td className="whitespace-nowrap">{fmtWhen(e.startsAt)}</Td>
                    <Td>{formatNumber(e.going)}</Td>
                    <Td>{formatNumber(e.pending)}</Td>
                    <Td>{e.capacity ? formatNumber(e.capacity) : "-"}</Td>
                    <Td>
                      <StatusBadge tone={fill >= 75 ? "positive" : fill > 0 ? "navy" : "neutral"}>
                        {fill}%
                      </StatusBadge>
                    </Td>
                  </Tr>
                );
              })}
            </DataTable>
          ) : (
            <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">No events yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardHeader title="All RSVPs" accent="var(--ad-orange)" />
          <DataTable headers={["Guest", "Event", "Status", "Applied"]}>
            {rsvps.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-[var(--ad-ink)]">{r.name}</Td>
                <Td>{r.event}</Td>
                <Td>
                  <StatusBadge
                    tone={
                      GOOD_STATUSES.has(r.status)
                        ? "positive"
                        : r.status === "denied"
                          ? "negative"
                          : "orange"
                    }
                  >
                    {r.status}
                  </StatusBadge>
                </Td>
                <Td className="whitespace-nowrap">{fmtWhen(r.appliedAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
