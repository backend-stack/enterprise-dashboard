import { AlertTriangle, MessageCircle, Phone, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server-auth";
import {
  fetchLinqChats,
  fetchLinqLines,
  fetchLinqMessages,
  linqConfigured,
  resolveBusinessLine,
  type LinqChat,
  type LinqLine,
  type LinqMessage,
} from "@/lib/linq";
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
  if (!iso) return "-";
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

/* Builds the ?line=&chat= URL for the Linq line browser. */
function lineUrl(line: string, chat?: string): string {
  const p = new URLSearchParams({ line });
  if (chat) p.set("chat", chat);
  return `/dashboard/imessage?${p.toString()}`;
}

function healthTone(status: string): "positive" | "pending" | "negative" {
  if (status === "HEALTHY") return "positive";
  if (status === "AT_RISK") return "pending";
  return "negative";
}

export default async function IMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; line?: string; chat?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");

  /* Businesses may see everything the agent SENDS (message bodies, delivery
     results, masked recipients) - but the Inbox with customers' private
     conversation threads stays admin-only. */
  const adminView = !(viewer.kind === "user" && !viewer.isAdmin);

  const { thread: threadParam, line: lineParam, chat: chatParam } = await searchParams;

  /* Linq line browser - the account's iMessage lines straight from the Linq
     partner API. Admins see every line; a business sees only ITS line —
     its own number once one is assigned (lunaPartners.linqLine), the shared
     demo line (LINQ_BUSINESS_LINE) until then. */
  const bizLine =
    !adminView && viewer.kind === "user" ? await resolveBusinessLine(viewer.uid) : "";
  const linqEnabled = linqConfigured() && (adminView || Boolean(bizLine));
  let lines: LinqLine[] | null = null;
  let selectedLine = "";
  let chats: LinqChat[] | null = null;
  let selectedChat: LinqChat | null = null;
  let messages: LinqMessage[] | null = null;
  if (linqEnabled) {
    const all = await fetchLinqLines().catch(() => null);
    if (adminView) {
      lines = all;
      selectedLine =
        lines?.find((l) => l.phoneNumber === lineParam)?.phoneNumber ??
        lines?.[0]?.phoneNumber ??
        "";
    } else {
      // Businesses: exactly one line, regardless of any ?line= param.
      const match = all?.find((l) => l.phoneNumber === bizLine);
      lines = match ? [match] : [{ id: bizLine, phoneNumber: bizLine, health: "UNKNOWN" }];
      selectedLine = bizLine;
    }
    if (selectedLine) {
      chats = await fetchLinqChats(selectedLine).catch(() => null);
      selectedChat = chats?.find((c) => c.id === chatParam) ?? null;
      if (selectedChat) {
        messages = await fetchLinqMessages(selectedChat.id).catch(() => null);
      }
    }
  }

  const [threads, messagesByPhone, campaigns, smsLog, stats] = await Promise.all([
    adminView ? fetchAgentThreads().catch(() => null) : Promise.resolve(null),
    adminView ? fetchAllThreadMessages().catch(() => null) : Promise.resolve(null),
    fetchSmsCampaigns().catch(() => null),
    fetchSmsLog(15).catch(() => null),
    fetchIMessageStats().catch(() => null),
  ]);

  if (!stats || (adminView && !threads)) {
    return (
      <>
        <PageHeader title="iMessage Agent" subtitle="Conversations handled by the Clo agent." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Firebase Admin credentials aren&apos;t configured - add FIREBASE_PROJECT_ID,
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
        subtitle={
          adminView
            ? "Live from Firestore · every conversation the Clo agent is handling."
            : "Every message the agent is sending customers, with delivery results."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<MessageCircle size={16} />} label="Agent messages" value={formatNumber(stats.totalMemories)} tone="navy" emphasis />
        <Kpi icon={<Phone size={16} />} label="Active threads" value={formatNumber(stats.uniquePhones)} tone="navy" />
        <Kpi icon={<Send size={16} />} label="Delivered" value={formatNumber(delivered)} tone="orange" />
        <Kpi icon={<ShieldAlert size={16} />} label="Skipped sends" value={formatNumber(skipped)} tone="orange" />
      </div>

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
            Every logged send was skipped - missing phone number or SMS sending not
            configured. Open &ldquo;What&apos;s being sent&rdquo; below to see exactly
            what <em>would</em> have gone out.
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5">
        {/* ── Module 0: Lines - live per-line conversations from Linq ─────── */}
        {linqEnabled && lines?.length ? (
          <CollapsibleCard
            title={adminView ? "Lines" : "Your line"}
            meta={
              adminView
                ? "Live from Linq - pick a line to see every conversation on it"
                : `Every conversation on your business line ${selectedLine}`
            }
            accent="var(--ad-navy)"
            badge={adminView ? `${lines.length} line${lines.length === 1 ? "" : "s"}` : undefined}
            defaultOpen
          >
            <div className="flex flex-col gap-4 p-4">
              {/* Line picker */}
              <div className="flex flex-wrap items-center gap-2">
                {lines.map((l) => {
                  const active = l.phoneNumber === selectedLine;
                  return (
                    <Link
                      key={l.id || l.phoneNumber}
                      href={lineUrl(l.phoneNumber)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                        active
                          ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                          : "border-[var(--ad-line)] bg-[var(--ad-paper)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
                      }`}
                    >
                      <Phone size={13} />
                      {l.phoneNumber}
                      <span
                        className="h-2 w-2 rounded-full"
                        title={l.health}
                        style={{
                          backgroundColor:
                            l.health === "HEALTHY"
                              ? "var(--ad-positive)"
                              : l.health === "AT_RISK"
                                ? "var(--ad-pending)"
                                : "var(--ad-negative)",
                        }}
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Chats + thread */}
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                {/* Conversation list for the selected line */}
                <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel-2)] p-2">
                  {(chats ?? []).map((c) => {
                    const active = selectedChat?.id === c.id;
                    const who = c.isGroup
                      ? c.displayName || `Group · ${c.participants.length} people`
                      : c.participants.map(maskPhone).join(", ") || c.displayName || "Unknown";
                    return (
                      <Link
                        key={c.id}
                        href={lineUrl(selectedLine, c.id)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                          active ? "bg-[var(--ad-paper)] shadow-[var(--ad-shadow-card)]" : "hover:bg-[var(--ad-paper)]"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
                          <MessageCircle size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--ad-ink)]">
                            {who}
                          </span>
                          <span className="block truncate text-[11px] text-[var(--ad-muted)]">
                            {c.service ?? "-"} · {fmtWhen(c.updatedAt)}
                          </span>
                        </span>
                        {c.health !== "HEALTHY" ? (
                          <StatusBadge tone={healthTone(c.health)}>{c.health.replace("_", " ").toLowerCase()}</StatusBadge>
                        ) : null}
                      </Link>
                    );
                  })}
                  {!chats?.length ? (
                    <p className="px-3 py-4 text-sm text-[var(--ad-muted)]">
                      No conversations on this line yet.
                    </p>
                  ) : null}
                </div>

                {/* Thread */}
                <div className="flex max-h-[520px] flex-col rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)]">
                  {selectedChat ? (
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                            {selectedChat.isGroup
                              ? selectedChat.displayName || "Group chat"
                              : selectedChat.participants.map(maskPhone).join(", ")}
                          </p>
                          <p className="text-[11px] text-[var(--ad-muted)]">
                            via {selectedLine} · {selectedChat.service ?? "-"}
                          </p>
                        </div>
                        <StatusBadge tone={healthTone(selectedChat.health)}>
                          {selectedChat.health.replace("_", " ").toLowerCase()}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                        {(messages ?? []).map((m) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${m.fromMe ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                                m.fromMe
                                  ? "rounded-br-md bg-[var(--ad-navy)] text-white"
                                  : "rounded-bl-md bg-[var(--ad-panel)] text-[var(--ad-ink)]"
                              }`}
                            >
                              {m.text || (m.mediaCount ? "" : "…")}
                              {m.mediaCount ? (
                                <span className={m.text ? "mt-1 block text-xs opacity-75" : "text-xs opacity-90"}>
                                  📎 {m.mediaCount} attachment{m.mediaCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </div>
                            <span className="mt-1 px-1 text-[10px] text-[var(--ad-muted)]">
                              {fmtWhen(m.at)}
                              {m.fromMe && m.deliveryStatus ? ` · ${m.deliveryStatus}` : ""}
                            </span>
                          </div>
                        ))}
                        {!messages?.length ? (
                          <p className="py-6 text-center text-sm text-[var(--ad-muted)]">
                            No messages in this conversation yet.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--ad-muted)]">
                      Select a conversation to read the full thread.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleCard>
        ) : null}

        {/* ── Module 1: Inbox - private threads, platform admins only ─────── */}
        {adminView && threads ? (
          <CollapsibleCard
            title="Inbox"
            meta="Customer conversations, one thread per phone number - click a thread to read it"
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
        ) : null}

        {/* ── Module 2: What's being sent ─────────────────────────────────── */}
        <CollapsibleCard
          title="What's being sent"
          meta="Each distinct outgoing message, with delivery results - tap one to read it"
          accent="var(--ad-orange)"
          badge={`${campaigns?.length ?? 0} message${(campaigns?.length ?? 0) === 1 ? "" : "s"}`}
          defaultOpen={!adminView}
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
                        {m.to ? maskPhone(m.to) : "-"}
                      </Td>
                      <Td>
                        <span className="block max-w-[360px] truncate" title={m.body}>
                          {m.body}
                        </span>
                        {m.error ? (
                          <span className="block truncate text-xs text-[var(--ad-negative)]">{m.error}</span>
                        ) : null}
                      </Td>
                      <Td>{KIND_LABEL[m.kind] ?? (m.kind || "-")}</Td>
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
