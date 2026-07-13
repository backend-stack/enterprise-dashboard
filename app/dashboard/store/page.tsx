import { Heart, Layers, Store } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";
import { getViewer } from "@/lib/server-auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { fetchVenueEngagement } from "@/lib/platform-data";
import { formatNumber } from "@/lib/format";

/* Store Traffic - live venue engagement across the platform. */
export const dynamic = "force-dynamic";

export default async function StoreTrafficPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");
  if (viewer.kind === "user" && !viewer.isAdmin) return <AdminOnly title="Store Traffic" />;

  const data = await fetchVenueEngagement().catch(() => null);

  if (!data) {
    return (
      <>
        <PageHeader title="Store Traffic" subtitle="Live venue engagement." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured - add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const { venues, totalLikes, categories } = data;
  const topVenues = venues.filter((v) => v.likes > 0).slice(0, 8);
  const maxLikes = Math.max(...topVenues.map((v) => v.likes), 1);
  const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Store Traffic"
        subtitle="Live from Firestore · venue engagement across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          icon={<Store size={16} />}
          label="Venues live"
          value={formatNumber(venues.filter((v) => v.live).length)}
          tone="navy"
          emphasis
        />
        <Kpi
          icon={<Heart size={16} />}
          label="Customer likes"
          value={formatNumber(totalLikes)}
          tone="orange"
        />
        <Kpi
          icon={<Layers size={16} />}
          label="Categories"
          value={formatNumber(topCategories.length)}
          tone="navy"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr] sm:mt-6 sm:gap-6">
        {/* Most-liked venues - horizontal bars */}
        <Card>
          <CardHeader title="Most-liked venues" accent="var(--ad-navy)" />
          <div className="flex flex-col gap-3 px-6 pb-6">
            {topVenues.map((v) => (
              <div key={v.id}>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="min-w-0 truncate font-medium text-[var(--ad-ink-soft)]">
                    {v.name}
                  </span>
                  <span className="ad-display ml-3 shrink-0 text-sm font-semibold text-[var(--ad-ink)]">
                    {formatNumber(v.likes)}
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-xl bg-[var(--ad-panel)]">
                  <div
                    className="h-full rounded-xl bg-[var(--ad-navy)]"
                    style={{ width: `${Math.max((v.likes / maxLikes) * 100, 3)}%` }}
                  />
                </div>
              </div>
            ))}
            {!topVenues.length ? (
              <p className="py-3 text-sm text-[var(--ad-muted)]">No venue likes recorded yet.</p>
            ) : null}
          </div>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader title="Venues by category" accent="var(--ad-orange)" />
          <div className="flex flex-col gap-2 px-6 pb-6">
            {topCategories.map(([cat, count]) => (
              <div
                key={cat}
                className="flex items-center justify-between rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium capitalize text-[var(--ad-ink)]">
                  {cat}
                </span>
                <span className="ml-3 shrink-0 rounded-full bg-[var(--ad-navy-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ad-navy)]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6">
        <Card>
          <CardHeader title="All venues" accent="var(--ad-navy)" />
          <DataTable headers={["Venue", "Category", "Location", "Likes"]}>
            {venues.map((v) => (
              <Tr key={v.id}>
                <Td className="font-medium text-[var(--ad-ink)]">
                  {v.name}
                  {!v.live ? (
                    <span className="ml-2 rounded-lg bg-[var(--ad-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ad-muted)]">
                      removed
                    </span>
                  ) : null}
                </Td>
                <Td className="capitalize">{v.category}</Td>
                <Td>
                  <span className="block max-w-[340px] truncate" title={v.location}>
                    {v.location || "-"}
                  </span>
                </Td>
                <Td>
                  <StatusBadge tone={v.likes > 0 ? "orange" : "neutral"}>
                    {formatNumber(v.likes)}
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
