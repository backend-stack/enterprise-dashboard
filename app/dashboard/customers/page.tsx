import { UserPlus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { CUSTOMERS } from "@/lib/mock-data";
import { formatMoney, formatNumber } from "@/lib/format";

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${CUSTOMERS.length} customers · sorted by lifetime spend`}
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[var(--ad-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
          >
            <UserPlus size={15} />
            Invite customer
          </button>
        }
      />

      <Card className="p-1.5">
        <CardHeader title="All customers" accent="var(--ad-orange)" />
        <DataTable
          headers={["Customer", "Segment", "Store visits", "Lifetime spend", "Last seen"]}
        >
          {[...CUSTOMERS]
            .sort((a, b) => b.spend - a.spend)
            .map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-[var(--ad-ink)]">
                  <span className="flex items-center gap-3">
                    <Avatar name={c.name} size={32} />
                    <span>
                      {c.name}
                      <span className="block text-xs font-normal text-[var(--ad-muted)]">
                        {c.email}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td>
                  <StatusBadge
                    tone={
                      c.segment === "VIP"
                        ? "orange"
                        : c.segment === "Repeat"
                          ? "navy"
                          : "neutral"
                    }
                  >
                    {c.segment}
                  </StatusBadge>
                </Td>
                <Td>{formatNumber(c.visits)}</Td>
                <Td className="font-semibold text-[var(--ad-ink)]">
                  {formatMoney(c.spend)}
                </Td>
                <Td>{c.lastSeen}</Td>
              </Tr>
            ))}
        </DataTable>
      </Card>
    </>
  );
}
