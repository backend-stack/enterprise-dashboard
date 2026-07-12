export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatCompact(n: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatMoney(cents: number): string {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
