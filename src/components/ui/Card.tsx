import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";

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
  accent,
  action,
}: {
  title: string;
  /** Kept for API compatibility — headers are now plain bold titles. */
  accent?: string;
  action?: ReactNode;
}) {
  void accent;
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h3 className="text-[15px] font-semibold tracking-tight text-[var(--ad-ink)]">
        {title}
      </h3>
      {action ?? (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ad-muted)]">
          <MoreVertical size={15} />
        </span>
      )}
    </div>
  );
}
