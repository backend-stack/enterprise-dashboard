import { MessageCircle, Phone } from "lucide-react";
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
import { Card } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/Collapsible";
import { PageHeader } from "@/components/ui/PageHeader";
import { Kpi } from "@/components/dashboard/Kpi";
import { AgentInbox } from "@/components/dashboard/AgentInbox";
import { LinqLiveLines } from "@/components/dashboard/LinqLiveLines";
import {
  fetchAgentThreads,
  fetchAllThreadMessages,
  fetchIMessageStats,
} from "@/lib/imessage";
import { formatNumber } from "@/lib/format";

/* Live team-inbox for the Clo iMessage agent: the Linq line browser plus
   the Firestore-backed Inbox. All thread messages are pre-fetched so
   switching conversations is instant. */
export const dynamic = "force-dynamic";

export default async function IMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; line?: string; chat?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");

  /* The Inbox with customers' private conversation threads stays admin-only;
     a business sees only its own line below. */
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

  const [threads, messagesByPhone, stats] = await Promise.all([
    adminView ? fetchAgentThreads().catch(() => null) : Promise.resolve(null),
    adminView ? fetchAllThreadMessages().catch(() => null) : Promise.resolve(null),
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

  return (
    <>
      <PageHeader
        title="iMessage Agent"
        subtitle={
          adminView
            ? "Live from Firestore · every conversation the Clo agent is handling."
            : "Every conversation on your business line, live."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Kpi icon={<MessageCircle size={16} />} label="Agent messages" value={formatNumber(stats.totalMemories)} tone="navy" emphasis />
        <Kpi icon={<Phone size={16} />} label="Active threads" value={formatNumber(stats.uniquePhones)} tone="navy" />
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5">
        {/* ── Lines - live per-line conversations from Linq ────────────────── */}
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
            <LinqLiveLines
              initialLines={lines}
              initialLine={selectedLine}
              initialChats={chats}
              initialChatId={selectedChat?.id ?? null}
              initialMessages={messages}
            />
          </CollapsibleCard>
        ) : null}

        {/* ── Inbox - private threads, platform admins only ────────────────── */}
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
      </div>
    </>
  );
}
