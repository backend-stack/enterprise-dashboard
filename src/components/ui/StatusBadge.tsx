const TONES = {
  positive: { color: "var(--ad-positive)", bg: "var(--ad-positive-bg)" },
  negative: { color: "var(--ad-negative)", bg: "var(--ad-negative-bg)" },
  pending: { color: "var(--ad-pending)", bg: "var(--ad-pending-bg)" },
  neutral: { color: "var(--ad-ink-soft)", bg: "var(--ad-panel)" },
  navy: { color: "var(--ad-navy)", bg: "var(--ad-navy-bg)" },
  orange: { color: "var(--ad-orange)", bg: "var(--ad-orange-bg)" },
} as const;

export type BadgeTone = keyof typeof TONES;

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: t.color, backgroundColor: t.bg }}
    >
      {children}
    </span>
  );
}
