import { MessageCircle, Phone, Send, ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import {
  fetchAgentThreads,
  fetchIMessageStats,
  fetchSmsLog,
} from "@/lib/imessage";
import { formatNumber } from "@/lib/format";

/* Live page — the iMessage/SMS agent's threads (agentMemories), learned
   contacts (contactProfiles) and the outbound delivery log (smsLog). */
export const dynamic = "force-dynamic";

function fmtWhen(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Mask the middle digits so full numbers aren't splashed across the UI. */
function maskPhone(phone: string): string {
  return phone.replace(/(\+?\d{1,2})\d+(\d{4})$/, "$1•••$2");
}

function statusTone(status: string): "positive" | "pending" | "negative" | "neutral" {
  if (status === "sent" || status === "delivered") return "positive";
  if (status.startsWith("skipped")) return "pending";
  if (status === "failed" || status === "error") return "negative";
  return "neutral";
}

export default async function IMessagePage() {
  const [threads, smsLog, stats] = await Promise.all([
    fetchAgentThreads().catch(() => null),
    fetchSmsLog(30).catch(() => null),
    fetchIMessageStats().catch(() => null),
  ]);

  if (!threads || !stats) {
    return (
      <>
        <PageHeader title="iMessage Agent" subtitle="Conversations handled by the messaging agent." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured — add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const skipped = Object.entries(stats.smsByStatus)
    .filter(([s]) => s.startsWith("skipped"))
    .reduce((n, [, c]) => n + c, 0);

  return (
    <>
      <PageHeader
        title="iMessage Agent"
        subtitle="Live from Firestore · agent conversations, learned contacts and the outbound SMS log."
      />

      <Card className="p-1.5">
        <CardHeader title="Agent activity" accent="var(--ad-orange)" />
        <div className="flex flex-col gap-4 p-4 pt-1 xl:flex-row">
          <Kpi
            icon={<MessageCircle size={17} />}
            label="Agent messages"
            value={formatNumber(stats.totalMemories)}
            tone="navy"
            emphasis
          />
          <Kpi
            icon={<Phone size={17} />}
            label="Active threads"
            value={formatNumber(stats.uniquePhones)}
            tone="navy"
          />
          <Kpi
            icon={<Send size={17} />}
            label="Outbound SMS logged"
            value={formatNumber(stats.smsTotal)}
            tone="orange"
          />
          <Kpi
            icon={<ShieldAlert size={17} />}
            label="Skipped sends"
            value={formatNumber(skipped)}
            tone="orange"
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr] sm:mt-6 sm:gap-6">
        {/* Threads */}
        <Card className="p-1.5">
          <CardHeader title="Conversations" accent="var(--ad-navy)" />
          <ul className="flex flex-col px-3 pb-4">
            {threads.map((t) => (
              <li
                key={t.phone}
                className="flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--ad-panel-2)]"
              >
                <Avatar name={t.name ?? t.phone.slice(-2)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--ad-ink)]">
                      {t.name ?? maskPhone(t.phone)}
                    </p>
                    {t.name ? (
                      <span className="text-[11px] text-[var(--ad-muted)]">
                        {maskPhone(t.phone)}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--ad-muted)]">
                    {t.lastText || "…"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-[var(--ad-muted)]">
                    {fmtWhen(t.lastAt)}
                  </span>
                  <span className="rounded-full bg-[var(--ad-navy-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ad-navy)]">
                    {t.messageCount} msg{t.messageCount === 1 ? "" : "s"}
                  </span>
                </div>
              </li>
            ))}
            {!threads.length ? (
              <p className="px-2 py-4 text-sm text-[var(--ad-muted)]">
                No agent conversations yet.
              </p>
            ) : null}
          </ul>
        </Card>

        {/* SMS log */}
        <Card className="p-1.5">
          <CardHeader title="Outbound delivery log" accent="var(--ad-orange)" />
          {smsLog && smsLog.length ? (
            <DataTable headers={["To", "Message", "Kind", "Status", "When"]}>
              {smsLog.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap font-medium text-[var(--ad-ink)]">
                    {m.to ? maskPhone(m.to) : "—"}
                  </Td>
                  <Td>
                    <span className="block max-w-[320px] truncate" title={m.body}>
                      {m.body}
                    </span>
                    {m.error ? (
                      <span className="block truncate text-xs text-[var(--ad-negative)]">
                        {m.error}
                      </span>
                    ) : null}
                  </Td>
                  <Td>{m.kind || "—"}</Td>
                  <Td>
                    <StatusBadge tone={statusTone(m.status)}>{m.status}</StatusBadge>
                  </Td>
                  <Td className="whitespace-nowrap">{fmtWhen(m.createdAt)}</Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-5 pb-6 pt-1 text-sm text-[var(--ad-muted)]">
              No outbound messages logged yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
