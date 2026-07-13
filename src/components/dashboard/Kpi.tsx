import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/* KPI tile — flat white enterprise card: muted label + small accent icon
   tile, big number, delta chip, optional sparkline drawn from real data. */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 96;
  const h = 30;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 6)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={w}
        cy={h - 3 - ((data[data.length - 1] - min) / range) * (h - 6)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function Kpi({
  icon,
  label,
  value,
  delta,
  deltaLabel = "vs last week",
  tone = "navy",
  emphasis = false,
  spark,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** % change; negative renders red. */
  delta?: number;
  deltaLabel?: string;
  tone?: "navy" | "orange" | "ink";
  /** Kept for API compatibility — adds a subtle accent keyline. */
  emphasis?: boolean;
  /** Real series to draw as a small sparkline. */
  spark?: number[];
}) {
  const toneBg = `var(--ad-${tone}-bg)`;
  const toneFg = `var(--ad-${tone})`;
  const up = (delta ?? 0) >= 0;

  return (
    <div
      className="relative flex-1 overflow-hidden rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-5 shadow-[var(--ad-shadow-card)] sm:p-6"
    >
      {emphasis ? (
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${toneFg}, transparent 70%)` }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--ad-muted)]">{label}</span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: toneBg, color: toneFg }}
        >
          {icon}
        </span>
      </div>

      <div className="ad-display mt-2 text-[2rem] font-semibold leading-none tracking-tight text-[var(--ad-ink)] sm:text-[2.25rem]">
        {value}
      </div>

      <div className="mt-3 flex min-h-[30px] items-end justify-between gap-2">
        {delta !== undefined ? (
          <span className="flex items-center gap-1.5">
            <span
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
              style={
                up
                  ? { backgroundColor: "var(--ad-positive-bg)", color: "var(--ad-positive)" }
                  : { backgroundColor: "var(--ad-negative-bg)", color: "var(--ad-negative)" }
              }
            >
              {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-[11px] text-[var(--ad-muted)]">{deltaLabel}</span>
          </span>
        ) : (
          <span />
        )}
        {spark ? <Sparkline data={spark} color={toneFg} /> : null}
      </div>
    </div>
  );
}
