"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

/* Pure-CSS interactive grouped bar chart — no chart library, matching the
   reference dashboard. Two series (navy + orange) per bucket, hover tooltip
   with exact numbers, dashed y-axis gridlines. */

export interface BarPoint {
  label: string;
  /** Full label used in the tooltip (e.g. formatted date). */
  tooltipLabel?: string;
  a: number;
  b: number;
}

export function GroupedBarChart({
  title,
  seriesA,
  seriesB,
  data,
  rangeLabel,
  summary,
}: {
  title: string;
  seriesA: string;
  seriesB: string;
  data: BarPoint[];
  rangeLabel?: string;
  /** Optional stat strip above the plot. */
  summary?: { label: string; value: string; dotColor?: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => Math.max(d.a, d.b)), 1);
  const ticks = [max, Math.round(max / 2), 0];

  return (
    <Card>
      <CardHeader
        title={title}
        accent="var(--ad-orange)"
        action={
          rangeLabel ? (
            <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
              {rangeLabel}
            </span>
          ) : undefined
        }
      />

      {summary?.length ? (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 px-6 pb-2">
          {summary.map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-1.5 text-xs text-[var(--ad-ink-soft)]">
                {s.dotColor && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.dotColor }}
                  />
                )}
                {s.label}
              </div>
              <div className="ad-display text-xl font-semibold leading-tight text-[var(--ad-ink)]">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 px-6 pb-6 pt-4">
        <div className="flex h-44 w-8 flex-col justify-between pb-5 text-right text-[10px] text-[var(--ad-muted)]">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 bottom-5 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-[var(--ad-line)]" />
            ))}
          </div>

          <div className="relative flex h-44 items-stretch gap-2">
            {data.map((d, i) => {
              const isActive = active === i;
              return (
                <div
                  key={d.label + i}
                  className="group relative flex flex-1 cursor-default flex-col items-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() =>
                    setActive((prev) => (prev === i ? null : prev))
                  }
                >
                  {isActive && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-3 text-left shadow-[var(--ad-shadow-float)]">
                      <p className="mb-2 text-xs font-semibold text-[var(--ad-ink)]">
                        {d.tooltipLabel ?? d.label}
                      </p>
                      <TipRow color="var(--ad-navy)" label={seriesA} value={d.a} />
                      <TipRow color="var(--ad-orange)" label={seriesB} value={d.b} />
                    </div>
                  )}

                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <Bar
                      heightPct={(d.a / max) * 100}
                      color="var(--ad-navy)"
                      dim={active !== null && !isActive}
                      value={d.a}
                      show={isActive}
                    />
                    <Bar
                      heightPct={(d.b / max) * 100}
                      color="var(--ad-orange)"
                      dim={active !== null && !isActive}
                      value={d.b}
                      show={isActive}
                    />
                  </div>

                  <span
                    className="mt-2 h-5 text-xs leading-5 transition-colors"
                    style={{ color: isActive ? "var(--ad-ink)" : "var(--ad-muted)" }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Bar({
  heightPct,
  color,
  dim,
  value,
  show,
}: {
  heightPct: number;
  color: string;
  dim: boolean;
  value: number;
  show: boolean;
}) {
  return (
    <div className="relative flex h-full w-2.5 items-end sm:w-3.5">
      <span
        className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold leading-none transition-opacity"
        style={{ color, opacity: show ? 1 : 0 }}
      >
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <div
        className="w-full rounded-md transition-all duration-200"
        style={{
          height: `${Math.max(heightPct, value > 0 ? 3 : 1.5)}%`,
          backgroundColor: color,
          opacity: dim ? 0.35 : 1,
        }}
      />
    </div>
  );
}

function TipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="flex items-center gap-1.5 text-[var(--ad-ink-soft)]">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold text-[var(--ad-ink)]">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
