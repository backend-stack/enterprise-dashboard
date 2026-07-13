import { CircleCheck, Clock, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";
import { getViewer } from "@/lib/server-auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { fetchRecentUsers, fetchUserStats } from "@/lib/platform-data";
import { formatNumber } from "@/lib/format";

/* Customers - live member base from the users collection. */
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CustomersPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");
  if (viewer.kind === "user" && !viewer.isAdmin) return <AdminOnly title="Customers" />;

  const [stats, users] = await Promise.all([
    fetchUserStats().catch(() => null),
    fetchRecentUsers(50).catch(() => null),
  ]);

  if (!stats) {
    return (
      <>
        <PageHeader title="Customers" subtitle="Live member base." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured - add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`Live from Firestore · ${formatNumber(stats.total)} members on the platform.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Users size={16} />}
          label="Total members"
          value={formatNumber(stats.total)}
          tone="navy"
          emphasis
        />
        <Kpi
          icon={<CircleCheck size={16} />}
          label="Approved"
          value={formatNumber(stats.approved)}
          tone="navy"
        />
        <Kpi
          icon={<Clock size={16} />}
          label="Pending review"
          value={formatNumber(stats.pending)}
          tone="orange"
        />
        <Kpi
          icon={<UserPlus size={16} />}
          label="New this week"
          value={formatNumber(stats.newThisWeek)}
          tone="orange"
        />
      </div>

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardHeader
            title="Newest members"
            accent="var(--ad-navy)"
            action={
              <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
                Latest {users?.length ?? 0}
              </span>
            }
          />
          {users?.length ? (
            <DataTable headers={["Member", "Instagram", "Status", "Score", "Joined"]}>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium text-[var(--ad-ink)]">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} size={32} />
                      {u.name}
                    </span>
                  </Td>
                  <Td>{u.instagram ? `@${u.instagram.replace(/^@/, "")}` : "-"}</Td>
                  <Td>
                    <StatusBadge
                      tone={
                        u.status === "approved"
                          ? "positive"
                          : u.status === "pending"
                            ? "orange"
                            : u.status === "denied" || u.status === "rejected"
                              ? "negative"
                              : "neutral"
                      }
                    >
                      {u.status}
                    </StatusBadge>
                  </Td>
                  <Td>{formatNumber(u.score)}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(u.joined)}</Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">No members found.</p>
          )}
        </Card>
      </div>
    </>
  );
}
