import type { ReactNode } from "react";

/* Rounded editorial surface — the building block for every panel. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] shadow-[var(--ad-shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  accent = "var(--ad-accent)",
  action,
}: {
  title: string;
  /** Small color swatch before the title. */
  accent?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div className="flex items-center gap-2.5">
        <span
          className="h-4 w-1.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h3 className="text-[15px] font-semibold text-[var(--ad-ink)]">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
