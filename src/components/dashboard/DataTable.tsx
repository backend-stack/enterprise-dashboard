import type { ReactNode } from "react";

/* Reference-style table — header row as a filled light band with rounded
   ends, hairline dividers between body rows, hover highlight. */
export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={`bg-[var(--ad-panel)] px-4 py-3 text-left text-[12px] font-semibold text-[var(--ad-ink-soft)] ${
                  i === 0 ? "rounded-l-lg" : ""
                } ${i === headers.length - 1 ? "rounded-r-lg" : ""}`}
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
      className={`border-b border-[var(--ad-line)] px-4 py-4 align-middle text-[var(--ad-ink-soft)] ${className}`}
    >
      {children}
    </td>
  );
}
