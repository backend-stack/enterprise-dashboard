import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/* Collapsible card section - native <details>/<summary>, so it works in
   server components with zero JS. Header mirrors CardHeader (accent swatch +
   title) plus an optional meta line and a chevron that flips when open. */
export function CollapsibleCard({
  title,
  meta,
  accent = "var(--ad-accent)",
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Small grey line under the title explaining what's inside. */
  meta?: string;
  accent?: string;
  /** Right-aligned chip text (e.g. a count). */
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] shadow-[var(--ad-shadow-card)]"
    >
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 rounded-[var(--ad-radius-card)] px-5 py-4 transition-colors hover:bg-[var(--ad-panel-2)] [&::-webkit-details-marker]:hidden">
        <span className="h-4 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[var(--ad-ink)]">{title}</span>
          {meta ? (
            <span className="block truncate text-xs text-[var(--ad-muted)]">{meta}</span>
          ) : null}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          size={17}
          className="shrink-0 text-[var(--ad-muted)] transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-[var(--ad-line)]">{children}</div>
    </details>
  );
}

/* Smaller inline collapsible row - for items inside a section (e.g. one
   outgoing message). */
export function CollapsibleRow({
  summary,
  right,
  defaultOpen = false,
  children,
}: {
  summary: ReactNode;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group/row rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)]"
    >
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 rounded-[var(--ad-radius-sm)] px-4 py-3 transition-colors hover:bg-[var(--ad-panel-2)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        {right ? <span className="shrink-0">{right}</span> : null}
        <ChevronDown
          size={15}
          className="shrink-0 text-[var(--ad-muted)] transition-transform duration-200 group-open/row:rotate-180"
        />
      </summary>
      <div className="border-t border-[var(--ad-line)] px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
