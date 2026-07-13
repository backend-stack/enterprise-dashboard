import { CircleCheck, MapPin, Store, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";
import { getViewer } from "@/lib/server-auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { fetchVendorApplications, fetchVendors } from "@/lib/vendors";
import { formatNumber } from "@/lib/format";

/* Live page — reads lunaPartners + partnerApplications from Firestore on
   every request via the Admin SDK. */
export const dynamic = "force-dynamic";

function NotConfigured() {
  return (
    <Card className="p-8 text-sm text-[var(--ad-muted)]">
      Firebase Admin credentials aren&apos;t configured — add FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live vendors.
    </Card>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function VendorsPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");
  if (viewer.kind === "user" && !viewer.isAdmin) return <AdminOnly title="Vendors" />;

  const [vendors, applications] = await Promise.all([
    fetchVendors().catch(() => null),
    fetchVendorApplications().catch(() => null),
  ]);

  if (!vendors) {
    return (
      <>
        <PageHeader title="Vendors" subtitle="Partner businesses on the platform." />
        <NotConfigured />
      </>
    );
  }

  const approved = vendors.filter((v) => v.approved).length;
  const venuesLinked = vendors.reduce((s, v) => s + v.venueCount, 0);
  const pendingApps = (applications ?? []).filter(
    (a) => a.status === "new" || a.status === "pending"
  ).length;

  return (
    <>
      <PageHeader
        title="Vendors"
        subtitle={`Live from Firestore · ${vendors.length} partner${vendors.length === 1 ? "" : "s"} in lunaPartners`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Store size={16} />}
          label="Vendors"
          value={formatNumber(vendors.length)}
          tone="navy"
          emphasis
        />
        <Kpi
          icon={<CircleCheck size={16} />}
          label="Approved"
          value={formatNumber(approved)}
          tone="navy"
        />
        <Kpi
          icon={<MapPin size={16} />}
          label="Venues linked"
          value={formatNumber(venuesLinked)}
          tone="orange"
        />
        <Kpi
          icon={<Inbox size={16} />}
          label="Pending applications"
          value={formatNumber(pendingApps)}
          tone="orange"
        />
      </div>

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardHeader title="All vendors" accent="var(--ad-navy)" />
          <DataTable
            headers={[
              "Business",
              "Contact",
              "Address",
              "Visitors / wk",
              "Avg spend / mo",
              "Venues",
              "Stripe",
              "Status",
              "Joined",
            ]}
          >
            {vendors.map((v) => (
              <Tr key={v.id}>
                <Td className="font-medium text-[var(--ad-ink)]">
                  <span className="flex items-center gap-3">
                    <Avatar name={v.businessName} size={32} />
                    <span>
                      {v.businessName}
                      {v.isAdmin ? (
                        <span className="ml-2 rounded-md bg-[var(--ad-navy-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ad-navy)]">
                          admin
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Td>
                <Td>
                  {v.email || "—"}
                  {v.phone ? (
                    <span className="block text-xs text-[var(--ad-muted)]">{v.phone}</span>
                  ) : null}
                </Td>
                <Td>{v.address || "—"}</Td>
                <Td>{v.visitorsPerWeek !== null ? formatNumber(v.visitorsPerWeek) : "—"}</Td>
                <Td>{v.avgMonthlySpend !== null ? `$${formatNumber(v.avgMonthlySpend)}` : "—"}</Td>
                <Td>{v.venueCount}</Td>
                <Td>
                  <StatusBadge tone={v.stripeConnected ? "positive" : "neutral"}>
                    {v.stripeConnected ? "connected" : "not linked"}
                  </StatusBadge>
                </Td>
                <Td>
                  <StatusBadge tone={v.approved ? "positive" : "pending"}>
                    {v.approved ? "approved" : "pending"}
                  </StatusBadge>
                </Td>
                <Td>{fmtDate(v.createdAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardHeader title="Inbound applications" accent="var(--ad-orange)" />
          {applications && applications.length ? (
            <DataTable
              headers={[
                "Business",
                "Contact",
                "City",
                "Locations",
                "Visitors / wk",
                "Avg spend",
                "Status",
                "Submitted",
              ]}
            >
              {applications.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium text-[var(--ad-ink)]">
                    {a.businessName}
                    {a.message ? (
                      <span className="block max-w-[280px] truncate text-xs font-normal text-[var(--ad-muted)]">
                        “{a.message}”
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    {a.email || "—"}
                    {a.phone ? (
                      <span className="block text-xs text-[var(--ad-muted)]">{a.phone}</span>
                    ) : null}
                  </Td>
                  <Td>{a.city || "—"}</Td>
                  <Td>{a.locations}</Td>
                  <Td>{formatNumber(a.weeklyVisitors)}</Td>
                  <Td>${formatNumber(a.avgSpend)}</Td>
                  <Td>
                    <StatusBadge tone={a.status === "new" ? "orange" : "neutral"}>
                      {a.status}
                    </StatusBadge>
                  </Td>
                  <Td>{fmtDate(a.submittedAt)}</Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
              No inbound applications yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
