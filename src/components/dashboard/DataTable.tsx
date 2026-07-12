import type { ReactNode } from "react";

/* Minimal hairline table used across pages — header row in muted caps,
   hover highlight on body rows. */
export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto px-2 pb-3">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-[var(--ad-line)] px-3 pb-2.5 pt-1 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-[var(--ad-panel-2)]">{children}</tr>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[var(--ad-line)] px-3 py-3 align-middle text-[var(--ad-ink-soft)] ${className}`}
    >
      {children}
    </td>
  );
}
