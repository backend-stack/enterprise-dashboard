import { DollarSign, Footprints, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { BusinessHome } from "@/components/dashboard/BusinessHome";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { Funnel } from "@/components/dashboard/Funnel";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import {
  ACTIVITY,
  DELTAS,
  FUNNEL,
  PAYMENTS,
  TOTALS,
  WEEK,
} from "@/lib/mock-data";
import { formatCompact, formatDay, formatMoney, formatNumber } from "@/lib/format";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Messages, conversions, store traffic and revenue — last 7 days."
      />

      {/* Live business section — renders only for business accounts. */}
      <BusinessHome />

      {/* KPI strip */}
      <Card className="p-1.5">
        <CardHeader
          title="This week"
          accent="var(--ad-orange)"
          action={
            <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
              Sample data
            </span>
          }
        />
        <div className="flex flex-col gap-4 p-4 pt-1 xl:flex-row">
          <Kpi
            icon={<MessageSquare size={17} />}
            label="Messages"
            value={formatNumber(TOTALS.messages)}
            delta={DELTAS.messages}
            tone="navy"
          />
          <Kpi
            icon={<TrendingUp size={17} />}
            label="Conversions"
            value={formatNumber(TOTALS.conversions)}
            delta={DELTAS.conversions}
            tone="orange"
            emphasis
          />
          <Kpi
            icon={<Footprints size={17} />}
            label="Store visitors"
            value={formatNumber(TOTALS.visitors)}
            delta={DELTAS.visitors}
            tone="navy"
          />
          <Kpi
            icon={<DollarSign size={17} />}
            label="Revenue"
            value={`$${formatCompact(TOTALS.revenue / 100)}`}
            delta={DELTAS.revenue}
            tone="orange"
          />
        </div>
      </Card>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr] sm:mt-6 sm:gap-6">
        <GroupedBarChart
          title="Messages → conversions"
          seriesA="Messages"
          seriesB="Conversions"
          rangeLabel="Last 7 days"
          data={WEEK.map((d) => ({
            label: d.label,
            tooltipLabel: formatDay(d.date),
            a: d.messages,
            b: d.conversions,
          }))}
          summary={[
            { label: "Messages", value: formatNumber(TOTALS.messages), dotColor: "var(--ad-navy)" },
            { label: "Conversions", value: formatNumber(TOTALS.conversions), dotColor: "var(--ad-orange)" },
            {
              label: "Conversion rate",
              value: `${((TOTALS.conversions / TOTALS.messages) * 100).toFixed(1)}%`,
            },
          ]}
        />
        <Funnel stages={FUNNEL} />
      </div>

      {/* Activity + payments */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr] sm:mt-6 sm:gap-6">
        <ActivityFeed items={ACTIVITY} />
        <Card className="p-1.5">
          <CardHeader title="Recent payments" accent="var(--ad-orange)" />
          <DataTable headers={["Customer", "Amount", "Method", "Status", "When"]}>
            {PAYMENTS.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-[var(--ad-ink)]">{p.customer}</Td>
                <Td className="font-semibold text-[var(--ad-ink)]">
                  {formatMoney(p.amount)}
                </Td>
                <Td>{p.method}</Td>
                <Td>
                  <StatusBadge
                    tone={
                      p.status === "paid"
                        ? "positive"
                        : p.status === "pending"
                          ? "pending"
                          : "negative"
                    }
                  >
                    {p.status}
                  </StatusBadge>
                </Td>
                <Td>{p.date}</Td>
              </Tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
