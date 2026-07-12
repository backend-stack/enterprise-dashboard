/* Initials avatar on an ink tile — no remote images needed. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-navy)] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || "?"}
    </span>
  );
}
