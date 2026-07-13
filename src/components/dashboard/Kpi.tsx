import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, MoreVertical } from "lucide-react";

/* KPI tile - reference-style card: label + kebab up top, big number, bright
   trend chip underneath, and a glowing accent icon or live sparkline on the
   right edge. */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 96;
  const h = 34;
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
  /** Kept for API compatibility - no longer changes the visual. */
  emphasis?: boolean;
  /** Real series to draw as a small sparkline. */
  spark?: number[];
}) {
  const toneBg = tone === "ink" ? "var(--ad-panel)" : `var(--ad-${tone}-bg)`;
  const toneFg = tone === "ink" ? "var(--ad-ink)" : `var(--ad-${tone})`;
  const up = (delta ?? 0) >= 0;
  void emphasis;

  return (
    <div className="relative flex-1 overflow-hidden rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-6 shadow-[var(--ad-shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13.5px] font-medium text-[var(--ad-ink-soft)]">{label}</span>
        <span className="-mr-1.5 -mt-1 flex h-7 w-7 items-center justify-center rounded-xl text-[var(--ad-muted)]">
          <MoreVertical size={15} />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="ad-display text-[2rem] font-semibold leading-none tracking-tight text-[var(--ad-ink)] sm:text-[2.15rem]">
            {value}
          </div>
          <div className="mt-3 flex min-h-[20px] items-center gap-1.5">
            {delta !== undefined ? (
              <>
                <span
                  className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={
                    up
                      ? { backgroundColor: "var(--ad-positive-bg)", color: "var(--ad-positive)" }
                      : { backgroundColor: "var(--ad-negative-bg)", color: "var(--ad-negative)" }
                  }
                >
                  {up ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
                  {Math.abs(delta).toFixed(0)}%
                </span>
                <span className="whitespace-nowrap text-[11.5px] text-[var(--ad-muted)]">{deltaLabel}</span>
              </>
            ) : null}
          </div>
        </div>

        {spark ? (
          <Sparkline data={spark} color={toneFg} />
        ) : (
          <span
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: toneFg,
              color: "#fff",
              boxShadow: `0 0 0 5px ${toneBg}`,
            }}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
