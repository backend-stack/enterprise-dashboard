import { Clock, Footprints, Store } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { GroupedBarChart } from "@/components/dashboard/GroupedBarChart";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { HOURS, LOCATIONS, TOTALS } from "@/lib/mock-data";
import { formatMoney, formatNumber } from "@/lib/format";

export default function StoreTrafficPage() {
  const todayVisitors = HOURS.reduce((s, h) => s + h.visitors, 0);
  const peak = HOURS.reduce((a, b) => (b.visitors > a.visitors ? b : a));

  return (
    <>
      <PageHeader
        title="Store Traffic"
        subtitle="Foot traffic across locations — who's walking in, and when."
      />

      <Card className="p-1.5">
        <CardHeader title="Foot traffic" accent="var(--ad-orange)" />
        <div className="flex flex-col gap-4 p-4 pt-1 lg:flex-row">
          <Kpi
            icon={<Footprints size={17} />}
            label="Visitors today"
            value={formatNumber(todayVisitors)}
            delta={5.6}
            tone="navy"
            emphasis
          />
          <Kpi
            icon={<Clock size={17} />}
            label="Peak hour"
            value={peak.label}
            tone="orange"
          />
          <Kpi
            icon={<Store size={17} />}
            label="Weekly visitors"
            value={formatNumber(TOTALS.visitors)}
            delta={5.6}
            tone="navy"
          />
        </div>
      </Card>

      <div className="mt-4 sm:mt-6">
        <GroupedBarChart
          title="Traffic by hour"
          seriesA="All visitors"
          seriesB="Campaign walk-ins"
          rangeLabel="Today"
          data={HOURS.map((h) => ({ label: h.label, a: h.visitors, b: h.walkIns }))}
          summary={[
            { label: "All visitors", value: formatNumber(todayVisitors), dotColor: "var(--ad-navy)" },
            {
              label: "Campaign walk-ins",
              value: formatNumber(HOURS.reduce((s, h) => s + h.walkIns, 0)),
              dotColor: "var(--ad-orange)",
            },
          ]}
        />
      </div>

      <div className="mt-4 sm:mt-6">
        <Card className="p-1.5">
          <CardHeader title="Locations" accent="var(--ad-navy)" />
          <DataTable
            headers={["Store", "Visitors (7d)", "Conversions", "Revenue", "WoW trend"]}
          >
            {LOCATIONS.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium text-[var(--ad-ink)]">
                  {l.name}
                  <span className="block text-xs font-normal text-[var(--ad-muted)]">
                    {l.city}
                  </span>
                </Td>
                <Td>{formatNumber(l.visitors)}</Td>
                <Td>{formatNumber(l.conversions)}</Td>
                <Td>{formatMoney(l.revenue)}</Td>
                <Td>
                  <StatusBadge tone={l.trend >= 0 ? "positive" : "negative"}>
                    {l.trend >= 0 ? "▲" : "▼"} {Math.abs(l.trend).toFixed(1)}%
                  </StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
