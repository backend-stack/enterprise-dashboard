"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Store, BadgeCheck, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Kpi } from "@/components/dashboard/Kpi";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";

/* Live "your business" section shown at the top of the Overview for business
   accounts — their venues (from eventsV2 via lunaPartners.venueIds) and like
   counts, straight from Firestore. Renders nothing for personal accounts. */

interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  imageUrl: string | null;
  website: string | null;
  likes: number;
  live: boolean;
}

interface Analytics {
  venues: Venue[];
  totals: { venues: number; liveVenues: number; likes: number } | null;
}

export function BusinessHome() {
  const { business, getToken } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!business) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/business/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (alive && res.ok) setData(json);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  if (!business) return null;

  return (
    <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:gap-6">
      <Card className="p-1.5">
        <CardHeader
          title={business.businessName}
          accent="var(--ad-navy)"
          action={
            <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
              Live from your account
            </span>
          }
        />
        <div className="flex flex-col gap-4 p-4 pt-1 xl:flex-row">
          <Kpi
            icon={<Store size={17} />}
            label="Your venues"
            value={data?.totals ? formatNumber(data.totals.venues) : "…"}
            tone="navy"
            emphasis
          />
          <Kpi
            icon={<BadgeCheck size={17} />}
            label="Live on the platform"
            value={data?.totals ? formatNumber(data.totals.liveVenues) : "…"}
            tone="navy"
          />
          <Kpi
            icon={<Heart size={17} />}
            label="Customer likes"
            value={data?.totals ? formatNumber(data.totals.likes) : "…"}
            tone="orange"
          />
        </div>
      </Card>

      {data?.venues.length ? (
        <Card className="p-1.5">
          <CardHeader title="Your venues" accent="var(--ad-orange)" />
          <div className="grid gap-4 p-4 pt-1 sm:grid-cols-2 xl:grid-cols-3">
            {data.venues.map((v) => (
              <div
                key={v.id}
                className="overflow-hidden rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)]"
              >
                <div className="relative h-32 bg-[var(--ad-navy-bg)]">
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.imageUrl}
                      alt={v.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--ad-navy)]">
                      <Store size={28} strokeWidth={1.5} />
                    </div>
                  )}
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={
                      v.live
                        ? { backgroundColor: "var(--ad-positive-bg)", color: "var(--ad-positive)" }
                        : { backgroundColor: "var(--ad-pending-bg)", color: "var(--ad-pending)" }
                    }
                  >
                    {v.live ? "Live" : "Unpublished"}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--ad-ink)]">{v.name}</p>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--ad-orange)]">
                      <Heart size={12} fill="currentColor" strokeWidth={0} />
                      {formatNumber(v.likes)}
                    </span>
                  </div>
                  {v.category ? (
                    <p className="mt-0.5 text-xs capitalize text-[var(--ad-muted)]">{v.category}</p>
                  ) : null}
                  {v.location ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--ad-ink-soft)]">
                      <MapPin size={11} className="shrink-0 text-[var(--ad-muted)]" />
                      <span className="truncate">{v.location}</span>
                    </p>
                  ) : null}
                  {v.website ? (
                    <a
                      href={v.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ad-navy)] hover:underline"
                    >
                      Website <ExternalLink size={11} />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : !loading && data ? (
        <Card className="p-6 text-sm text-[var(--ad-muted)]">
          No venues are linked to your account yet — once venues are added to
          your profile they&apos;ll appear here with live engagement numbers.
        </Card>
      ) : null}
    </div>
  );
}
