import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/* KPI tile — inset panel with an accent icon tile, big number and WoW delta.
   `emphasis` flips it to the solid-navy variant for the headline metric. */
export function Kpi({
  icon,
  label,
  value,
  delta,
  tone = "navy",
  emphasis = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** % change vs. last week; negative renders red. */
  delta?: number;
  tone?: "navy" | "orange" | "ink";
  emphasis?: boolean;
}) {
  const toneBg = `var(--ad-${tone}-bg)`;
  const toneFg = `var(--ad-${tone})`;
  const up = (delta ?? 0) >= 0;

  return (
    <div
      className="flex-1 rounded-[var(--ad-radius-sm)] border p-6 sm:p-7"
      style={{
        backgroundColor: emphasis ? "var(--ad-navy)" : "var(--ad-panel)",
        color: emphasis ? "var(--ad-paper)" : "var(--ad-ink)",
        borderColor: emphasis ? "var(--ad-navy)" : "var(--ad-line)",
        boxShadow: "var(--ad-shadow-card)",
      }}
    >
      <div
        className="mb-6 flex items-center gap-2.5 text-[15px]"
        style={{ opacity: emphasis ? 0.85 : 0.78 }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            backgroundColor: emphasis ? "rgba(255,255,255,0.16)" : toneBg,
            color: emphasis ? "var(--ad-paper)" : toneFg,
          }}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="ad-display text-[2.5rem] font-semibold leading-none tracking-tight sm:text-[2.75rem]">
          {value}
        </div>
        {delta !== undefined ? (
          <span
            className="mb-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={
              emphasis
                ? { backgroundColor: "rgba(255,255,255,0.16)", color: "#fff" }
                : up
                  ? { backgroundColor: "var(--ad-positive-bg)", color: "var(--ad-positive)" }
                  : { backgroundColor: "var(--ad-negative-bg)", color: "var(--ad-negative)" }
            }
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
