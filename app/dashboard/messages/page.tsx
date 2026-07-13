import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";
import { getViewer } from "@/lib/server-auth";
import { ArrowRight, Inbox, MessageSquare, Phone, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { maskPhone } from "@/components/dashboard/AgentBubble";
import { fetchAgentThreads, fetchIMessageStats } from "@/lib/imessage";
import { fetchMessagingByDay } from "@/lib/platform-data";
import { formatNumber } from "@/lib/format";

/* Messages - live messaging volume across the platform. */
export const dynamic = "force-dynamic";

function fmtWhen(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric" });
}

export default async function MessagesPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");
  if (viewer.kind === "user" && !viewer.isAdmin) return <AdminOnly title="Messages" />;

  const [stats, byDay, threads] = await Promise.all([
    fetchIMessageStats().catch(() => null),
    fetchMessagingByDay(14).catch(() => null),
    fetchAgentThreads().catch(() => null),
  ]);

  if (!stats) {
    return (
      <>
        <PageHeader title="Messages" subtitle="Live messaging volume." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured - add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const delivered = (stats.smsByStatus.sent ?? 0) + (stats.smsByStatus.delivered ?? 0);
  const inbound14 = (byDay ?? []).reduce((s, d) => s + d.inbound, 0);
  const outbound14 = (byDay ?? []).reduce((s, d) => s + d.outbound, 0);

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Live from Firestore · customer texts to the Clo agent and platform sends."
        action={
          <Link
            href="/dashboard/imessage"
            className="flex items-center gap-2 rounded-full bg-[var(--ad-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
          >
            Open iMessage inbox
            <ArrowRight size={15} />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<MessageSquare size={16} />}
          label="Customer texts"
          value={formatNumber(stats.totalMemories)}
          tone="navy"
          emphasis
          spark={byDay?.map((d) => d.inbound)}
        />
        <Kpi
          icon={<Phone size={16} />}
          label="Active threads"
          value={formatNumber(stats.uniquePhones)}
          tone="navy"
        />
        <Kpi
          icon={<Send size={16} />}
          label="Platform sends"
          value={formatNumber(stats.smsTotal)}
          tone="orange"
          spark={byDay?.map((d) => d.outbound)}
        />
        <Kpi
          icon={<Inbox size={16} />}
          label="Delivered"
          value={formatNumber(delivered)}
          tone="orange"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr] sm:mt-6 sm:gap-6">
        {byDay ? (
          <GroupedBarChart
            title="Message volume"
            seriesA="Inbound (customers)"
            seriesB="Outbound (platform)"
            rangeLabel="Last 14 days"
            data={byDay.map((d) => ({ label: d.label, a: d.inbound, b: d.outbound }))}
            summary={[
              { label: "Inbound", value: formatNumber(inbound14), dotColor: "var(--ad-navy)" },
              { label: "Outbound", value: formatNumber(outbound14), dotColor: "var(--ad-orange)" },
            ]}
          />
        ) : null}

        <Card>
          <CardHeader
            title="Latest conversations"
            accent="var(--ad-navy)"
            action={
              <Link
                href="/dashboard/imessage"
                className="text-xs font-semibold text-[var(--ad-navy)] hover:underline"
              >
                View all
              </Link>
            }
          />
          <ul className="flex flex-col px-4 pb-4">
            {(threads ?? []).slice(0, 7).map((t) => (
              <li key={t.phone}>
                <Link
                  href={`/dashboard/imessage?thread=${encodeURIComponent(t.phone)}`}
                  className="flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
                >
                  <Avatar name={t.name ?? t.phone.slice(-2)} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                        {t.name ?? maskPhone(t.phone)}
                      </p>
                      <span className="shrink-0 text-[10px] text-[var(--ad-muted)]">
                        {fmtWhen(t.lastAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[var(--ad-muted)]">{t.lastText || "…"}</p>
                  </div>
                </Link>
              </li>
            ))}
            {!threads?.length ? (
              <p className="px-2 py-4 text-sm text-[var(--ad-muted)]">No conversations yet.</p>
            ) : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
