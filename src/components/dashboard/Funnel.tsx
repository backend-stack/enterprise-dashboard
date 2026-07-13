import { Card, CardHeader } from "@/components/ui/Card";
import type { FunnelStage } from "@/lib/mock-data";

/* Horizontal conversion funnel - each stage is a navy bar scaled to the top
   stage, with drop-off percentages between rows. */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value || 1;

  return (
    <Card>
      <CardHeader title="Conversion funnel" accent="var(--ad-navy)" />
      <div className="flex flex-col gap-3 px-6 pb-6">
        {stages.map((s, i) => {
          const pct = (s.value / top) * 100;
          const prev = i > 0 ? stages[i - 1].value : null;
          const carry = prev ? Math.round((s.value / prev) * 100) : null;
          const last = i === stages.length - 1;
          return (
            <div key={s.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-[var(--ad-ink-soft)]">
                  {s.label}
                </span>
                <span className="flex items-baseline gap-2">
                  {carry !== null && (
                    <span className="text-[10px] text-[var(--ad-muted)]">
                      {carry}% of previous
                    </span>
                  )}
                  <span className="ad-display text-sm font-semibold text-[var(--ad-ink)]">
                    {s.value.toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="h-7 overflow-hidden rounded-xl bg-[var(--ad-panel)]">
                <div
                  className="h-full rounded-xl transition-all"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    background: last
                      ? "var(--ad-orange)"
                      : `color-mix(in srgb, var(--ad-navy) ${100 - i * 14}%, var(--ad-navy-bg))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
