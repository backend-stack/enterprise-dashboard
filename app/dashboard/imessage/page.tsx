import { AlertTriangle, MessageCircle, Phone, Send, ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { CollapsibleCard, CollapsibleRow } from "@/components/ui/Collapsible";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { AgentInbox } from "@/components/dashboard/AgentInbox";
import { AgentBubble, maskPhone, statusInfo } from "@/components/dashboard/AgentBubble";
import {
  fetchAgentThreads,
  fetchAllThreadMessages,
  fetchIMessageStats,
  fetchSmsCampaigns,
  fetchSmsLog,
} from "@/lib/imessage";
import { formatNumber } from "@/lib/format";

/* Live team-inbox for the Clo iMessage agent, organised as collapsible
   modules: Inbox (open by default) → What's being sent → Delivery log.
   All thread messages are pre-fetched so switching conversations is instant. */
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

const KIND_LABEL: Record<string, string> = {
  pending: "RSVP waitlist notice",
  approved: "RSVP approval",
  payment_required: "Payment request",
  resend: "RSVP link resend",
  blast: "Blast",
};

export default async function IMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const { thread: threadParam } = await searchParams;

  const [threads, messagesByPhone, campaigns, smsLog, stats] = await Promise.all([
    fetchAgentThreads().catch(() => null),
    fetchAllThreadMessages().catch(() => null),
    fetchSmsCampaigns().catch(() => null),
    fetchSmsLog(15).catch(() => null),
    fetchIMessageStats().catch(() => null),
  ]);

  if (!threads || !stats) {
    return (
      <>
        <PageHeader title="iMessage Agent" subtitle="Conversations handled by the Clo agent." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured — add FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env to load live data.
        </Card>
      </>
    );
  }

  const delivered = (stats.smsByStatus.sent ?? 0) + (stats.smsByStatus.delivered ?? 0);
  const skipped = Object.entries(stats.smsByStatus)
    .filter(([s]) => s.startsWith("skipped"))
    .reduce((n, [, c]) => n + c, 0);
  const allSkipped = stats.smsTotal > 0 && delivered === 0;

  return (
    <>
      <PageHeader
        title="iMessage Agent"
        subtitle="Live from Firestore · every conversation the Clo agent is handling."
      />

      <Card className="p-1.5">
        <CardHeader title="Agent activity" accent="var(--ad-orange)" />
        <div className="flex flex-col gap-4 p-4 pt-1 xl:flex-row">
          <Kpi icon={<MessageCircle size={17} />} label="Agent messages" value={formatNumber(stats.totalMemories)} tone="navy" emphasis />
          <Kpi icon={<Phone size={17} />} label="Active threads" value={formatNumber(stats.uniquePhones)} tone="navy" />
          <Kpi icon={<Send size={17} />} label="Delivered" value={formatNumber(delivered)} tone="orange" />
          <Kpi icon={<ShieldAlert size={17} />} label="Skipped sends" value={formatNumber(skipped)} tone="orange" />
        </div>
      </Card>

      {allSkipped ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-[var(--ad-radius-sm)] px-4 py-3.5 text-sm text-white shadow-[0_10px_24px_-12px_rgba(224,97,14,0.7)] sm:mt-6"
          style={{
            background:
              "linear-gradient(135deg, var(--ad-orange) 0%, var(--ad-orange-deep) 100%)",
          }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <AlertTriangle size={14} />
          </span>
          <span className="leading-snug">
            <strong className="font-semibold">
              Platform notifications aren&apos;t reaching customers right now.
            </strong>{" "}
            Every logged send was skipped — missing phone number or SMS sending not
            configured. Open &ldquo;What&apos;s being sent&rdquo; below to see exactly
            what <em>would</em> have gone out.
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5">
        {/* ── Module 1: Inbox ─────────────────────────────────────────────── */}
        <CollapsibleCard
          title="Inbox"
          meta="Customer conversations, one thread per phone number — click a thread to read it"
          accent="var(--ad-navy)"
          badge={`${threads.length} conversation${threads.length === 1 ? "" : "s"}`}
          defaultOpen
        >
          <AgentInbox
            threads={threads}
            messagesByPhone={messagesByPhone ?? {}}
            initialPhone={threadParam ?? null}
          />
        </CollapsibleCard>

        {/* ── Module 2: What's being sent ─────────────────────────────────── */}
        <CollapsibleCard
          title="What's being sent"
          meta="Each distinct outgoing message, with delivery results — tap one to read it"
          accent="var(--ad-orange)"
          badge={`${campaigns?.length ?? 0} message${(campaigns?.length ?? 0) === 1 ? "" : "s"}`}
        >
          <div className="flex flex-col gap-3 p-4">
            {(campaigns ?? []).map((c) => {
              const wasDelivered = (c.statuses.sent ?? 0) + (c.statuses.delivered ?? 0) > 0;
              return (
                <CollapsibleRow
                  key={c.body}
                  summary={
                    <span className="block min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ad-ink)]">
                        {KIND_LABEL[c.kind] ?? (c.kind || "Message")}
                      </span>
                      <span className="block truncate text-xs text-[var(--ad-muted)]">
                        “{c.body}”
                      </span>
                    </span>
                  }
                  right={
                    <span className="flex items-center gap-2">
                      <span className="hidden text-[11px] text-[var(--ad-muted)] sm:block">
                        {c.recipients} recipient{c.recipients === 1 ? "" : "s"}
                      </span>
                      <StatusBadge tone={wasDelivered ? "positive" : "orange"}>
                        {wasDelivered ? "Delivered" : "Not delivered"}
                      </StatusBadge>
                    </span>
                  }
                >
                  <AgentBubble text={c.body} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {Object.entries(c.statuses).map(([status, count]) => {
                      const info = statusInfo(status);
                      return (
                        <StatusBadge key={status} tone={info.tone}>
                          {count} · {info.label}
                        </StatusBadge>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--ad-muted)]">
                    Sent {fmtWhen(c.firstAt)}
                    {c.lastAt !== c.firstAt ? ` → ${fmtWhen(c.lastAt)}` : ""}
                    {c.sampleTo.length ? (
                      <>
                        {" · To: "}
                        {c.sampleTo.map(maskPhone).join(", ")}
                        {c.recipients > c.sampleTo.length ? ` +${c.recipients - c.sampleTo.length} more` : ""}
                      </>
                    ) : null}
                  </p>
                </CollapsibleRow>
              );
            })}
            {!campaigns?.length ? (
              <p className="px-1 py-2 text-sm text-[var(--ad-muted)]">No outbound messages logged yet.</p>
            ) : null}
          </div>
        </CollapsibleCard>

        {/* ── Module 3: Delivery log ──────────────────────────────────────── */}
        <CollapsibleCard
          title="Delivery log"
          meta="The raw per-recipient send log, newest first"
          accent="var(--ad-navy)"
          badge={smsLog?.length ? `last ${smsLog.length}` : undefined}
        >
          {smsLog && smsLog.length ? (
            <div className="p-2">
              <DataTable headers={["To", "Message", "Type", "Status", "When"]}>
                {smsLog.map((m) => {
                  const info = statusInfo(m.status);
                  return (
                    <Tr key={m.id}>
                      <Td className="whitespace-nowrap font-medium text-[var(--ad-ink)]">
                        {m.to ? maskPhone(m.to) : "—"}
                      </Td>
                      <Td>
                        <span className="block max-w-[360px] truncate" title={m.body}>
                          {m.body}
                        </span>
                        {m.error ? (
                          <span className="block truncate text-xs text-[var(--ad-negative)]">{m.error}</span>
                        ) : null}
                      </Td>
                      <Td>{KIND_LABEL[m.kind] ?? (m.kind || "—")}</Td>
                      <Td>
                        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                      </Td>
                      <Td className="whitespace-nowrap">{fmtWhen(m.createdAt)}</Td>
                    </Tr>
                  );
                })}
              </DataTable>
            </div>
          ) : (
            <p className="px-5 py-5 text-sm text-[var(--ad-muted)]">
              No outbound messages logged yet.
            </p>
          )}
        </CollapsibleCard>
      </div>
    </>
  );
}
