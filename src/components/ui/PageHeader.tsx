import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="ad-display text-2xl font-semibold tracking-tight text-[var(--ad-ink)] sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--ad-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
