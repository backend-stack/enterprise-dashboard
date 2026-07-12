import { CreditCard, Footprints, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { ActivityItem } from "@/lib/mock-data";

const KIND_STYLE = {
  message: { icon: MessageSquare, bg: "var(--ad-navy-bg)", fg: "var(--ad-navy)" },
  conversion: { icon: TrendingUp, bg: "var(--ad-positive-bg)", fg: "var(--ad-positive)" },
  visit: { icon: Footprints, bg: "var(--ad-orange-bg)", fg: "var(--ad-orange)" },
  billing: { icon: CreditCard, bg: "var(--ad-panel)", fg: "var(--ad-ink-soft)" },
} as const;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="p-1.5">
      <CardHeader title="Recent activity" accent="var(--ad-navy)" />
      <ul className="flex flex-col px-3 pb-4">
        {items.map((item) => {
          const style = KIND_STYLE[item.kind];
          const Icon = style.icon;
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: style.bg, color: style.fg }}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                  {item.text}
                </p>
                <p className="truncate text-xs text-[var(--ad-muted)]">
                  {item.detail}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-[var(--ad-muted)]">
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
