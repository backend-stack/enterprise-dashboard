import { Inbox, MessageSquare, Reply, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { CONVERSATIONS, TOTALS, WEEK } from "@/lib/mock-data";
import { formatDay, formatNumber } from "@/lib/format";

const REPLIED = 8916;
const CAMPAIGNS_SENT = 14;

export default function MessagesPage() {
  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Outbound campaigns and customer conversations across every channel."
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[var(--ad-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
          >
            <Send size={15} />
            New campaign
          </button>
        }
      />

      <Card className="p-1.5">
        <CardHeader title="Messaging" accent="var(--ad-orange)" />
        <div className="flex flex-col gap-4 p-4 pt-1 lg:flex-row">
          <Kpi
            icon={<MessageSquare size={17} />}
            label="Delivered"
            value={formatNumber(TOTALS.messages)}
            delta={12.4}
            tone="navy"
            emphasis
          />
          <Kpi
            icon={<Reply size={17} />}
            label="Opened / replied"
            value={formatNumber(REPLIED)}
            delta={6.9}
            tone="orange"
          />
          <Kpi
            icon={<Inbox size={17} />}
            label="Campaigns sent"
            value={String(CAMPAIGNS_SENT)}
            delta={16.7}
            tone="navy"
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr] sm:mt-6 sm:gap-6">
        <GroupedBarChart
          title="Delivered vs. engaged"
          seriesA="Delivered"
          seriesB="Engaged"
          rangeLabel="Last 7 days"
          data={WEEK.map((d) => ({
            label: d.label,
            tooltipLabel: formatDay(d.date),
            a: d.messages,
            b: Math.round(d.messages * 0.71),
          }))}
        />

        <Card className="p-1.5">
          <CardHeader title="Recent conversations" accent="var(--ad-navy)" />
          <ul className="flex flex-col px-3 pb-4">
            {CONVERSATIONS.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
              >
                <Avatar name={c.customer} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                      {c.customer}
                    </p>
                    <span className="rounded-md bg-[var(--ad-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ad-muted)]">
                      {c.channel}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--ad-muted)]">
                    {c.preview}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-[var(--ad-muted)]">{c.time}</span>
                  <StatusBadge
                    tone={
                      c.status === "converted"
                        ? "positive"
                        : c.status === "replied"
                          ? "navy"
                          : "pending"
                    }
                  >
                    {c.status}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
