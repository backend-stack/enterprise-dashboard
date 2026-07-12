import { Percent, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { Funnel } from "@/components/dashboard/Funnel";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { FUNNEL, LOCATIONS, TOTALS, WEEK } from "@/lib/mock-data";
import { formatDay, formatMoney, formatNumber } from "@/lib/format";

export default function ConversionsPage() {
  const rate = (TOTALS.conversions / TOTALS.messages) * 100;
  const aov = TOTALS.revenue / TOTALS.conversions;

  return (
    <>
      <PageHeader
        title="Conversions"
        subtitle="How messages and visits turn into purchases."
      />

      <Card className="p-1.5">
        <CardHeader title="Conversion health" accent="var(--ad-orange)" />
        <div className="flex flex-col gap-4 p-4 pt-1 lg:flex-row">
          <Kpi
            icon={<TrendingUp size={17} />}
            label="Conversions"
            value={formatNumber(TOTALS.conversions)}
            delta={8.1}
            tone="orange"
            emphasis
          />
          <Kpi
            icon={<Percent size={17} />}
            label="Conversion rate"
            value={`${rate.toFixed(1)}%`}
            delta={1.3}
            tone="navy"
          />
          <Kpi
            icon={<ShoppingBag size={17} />}
            label="Avg. order value"
            value={formatMoney(Math.round(aov))}
            delta={4.2}
            tone="navy"
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr] sm:mt-6 sm:gap-6">
        <GroupedBarChart
          title="Visitors vs. conversions"
          seriesA="Visitors"
          seriesB="Conversions"
          rangeLabel="Last 7 days"
          data={WEEK.map((d) => ({
            label: d.label,
            tooltipLabel: formatDay(d.date),
            a: d.visitors,
            b: d.conversions,
          }))}
        />
        <Funnel stages={FUNNEL} />
      </div>

      <div className="mt-4 sm:mt-6">
        <Card className="p-1.5">
          <CardHeader title="Conversion by location" accent="var(--ad-navy)" />
          <DataTable
            headers={["Store", "Visitors", "Conversions", "Rate", "Revenue", "Trend"]}
          >
            {LOCATIONS.map((l) => {
              const locRate = (l.conversions / l.visitors) * 100;
              return (
                <Tr key={l.id}>
                  <Td className="font-medium text-[var(--ad-ink)]">
                    {l.name}
                    <span className="block text-xs font-normal text-[var(--ad-muted)]">
                      {l.city}
                    </span>
                  </Td>
                  <Td>{formatNumber(l.visitors)}</Td>
                  <Td>{formatNumber(l.conversions)}</Td>
                  <Td className="font-semibold text-[var(--ad-ink)]">
                    {locRate.toFixed(1)}%
                  </Td>
                  <Td>{formatMoney(l.revenue)}</Td>
                  <Td>
                    <StatusBadge tone={l.trend >= 0 ? "positive" : "negative"}>
                      {l.trend >= 0 ? "▲" : "▼"} {Math.abs(l.trend).toFixed(1)}%
                    </StatusBadge>
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
