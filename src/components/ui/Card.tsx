import type { ReactNode } from "react";

/* Rounded editorial surface - the building block for every panel. */
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
  accent,
  action,
}: {
  title: string;
  /** Kept for API compatibility - headers are now plain bold titles. */
  accent?: string;
  /** Real controls only - headers render no decorative fallback. */
  action?: ReactNode;
}) {
  void accent;
  return (
    <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-6">
      <h3 className="text-[15px] font-semibold tracking-tight text-[var(--ad-ink)]">
        {title}
      </h3>
      {action}
    </div>
  );
}
