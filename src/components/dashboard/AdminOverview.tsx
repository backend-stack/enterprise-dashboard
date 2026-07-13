"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { OverviewView, type CiBundle } from "@/components/dashboard/BusinessOverview";
import type { CiData, CiStats, CiTenant } from "@/lib/ci";

/* Admin overview - the same four-tile assistant view businesses see
   (Messages, Missed phone calls, Requests, Special Bookings), aggregated
   across every tenant on the account. */

export function AdminOverview() {
  const { getToken, user, loading: authLoading } = useAuth();
  const [ci, setCi] = useState<CiBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const authed = useCallback(
    async (path: string) => {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`api ${res.status}`);
      return res.json();
    },
    [getToken]
  );

  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;

    (async () => {
      try {
        const t = await authed("/api/ci/tenants");
        const tenants: CiTenant[] = t.tenants ?? [];
        if (!tenants.length) return;

        const bundles = await Promise.all(
          tenants.map(async (tenant) => {
            const [d, s] = await Promise.all([
              authed(`/api/ci/tenants/${tenant.id}/data`).catch(() => null),
              authed(`/api/ci/tenants/${tenant.id}/stats`).catch(() => null),
            ]);
            return { tenant, data: (d ?? {}) as CiData, stats: (s ?? {}) as CiStats };
          })
        );

        // Fold every tenant into one bundle: lists concatenated, counts summed.
        const data: CiData = { messages: [], reservations: [], inquiries: [] };
        const stats: CiStats = { today: {} };
        const sum = (a: number | undefined, b: number | undefined) =>
          a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);
        for (const b of bundles) {
          data.messages!.push(...(b.data.messages ?? []));
          data.reservations!.push(...(b.data.reservations ?? []));
          data.inquiries!.push(...(b.data.inquiries ?? []));
          stats.messages = sum(stats.messages, b.stats.messages);
          stats.messages_7d = sum(stats.messages_7d, b.stats.messages_7d);
          stats.inquiries = sum(stats.inquiries, b.stats.inquiries);
          stats.bookings = sum(stats.bookings, b.stats.bookings);
          stats.today!.missed_call = sum(stats.today!.missed_call, b.stats.today?.missed_call);
        }

        if (alive) {
          setCi({
            data,
            stats,
            tenant: { id: "all", name: "All locations", type: "aggregate" },
          });
        }
      } catch {
        /* not connected - OverviewView's empty state handles it */
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authed, authLoading, user]);

  return <OverviewView ci={ci} loading={loading} />;
}
