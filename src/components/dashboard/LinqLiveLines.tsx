"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Phone } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { maskPhone } from "@/components/dashboard/AgentBubble";
import type { LinqChat, LinqLine, LinqMessage } from "@/lib/linq";

/* Live Linq line browser - the client half of the iMessage "Lines" module.
   Server renders the first snapshot (props), then this component polls
   /api/linq/live so new messages, chats and line health show up without a
   page reload. Selecting a line/chat swaps client state (no navigation) and
   mirrors the choice into the URL so refresh/share still works. */

const POLL_MS = 5000;

interface Snapshot {
  lines: LinqLine[] | null;
  line: string;
  chats: LinqChat[] | null;
  messages: LinqMessage[] | null;
  at: string;
}

function fmtWhen(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* "Today" / "Yesterday" / "Jul 10, 2026" chips between message groups. */
function fmtDaySep(iso: string): string {
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function healthTone(status: string): "positive" | "pending" | "negative" {
  if (status === "HEALTHY") return "positive";
  if (status === "AT_RISK") return "pending";
  return "negative";
}

/* Customer avatar - a circle carrying the number's last two digits, since
   phones are all we know about the other side. */
function DigitAvatar({ handle, size = 36 }: { handle: string; size?: number }) {
  const digits = handle.replace(/\D/g, "").slice(-2) || "??";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-slate-bg)] font-semibold text-[var(--ad-ink)]"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {digits}
    </span>
  );
}

/* Agent avatar beside outbound bubbles. */
function AgentAvatar({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-slate)] text-white"
      style={{ width: size, height: size }}
    >
      <Bot size={size * 0.55} />
    </span>
  );
}

/* Mirrors the selection into ?line=&chat= without a server navigation. */
function syncUrl(line: string, chat: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("line", line);
  if (chat) url.searchParams.set("chat", chat);
  else url.searchParams.delete("chat");
  window.history.replaceState(null, "", url.toString());
}

export function LinqLiveLines({
  initialLines,
  initialLine,
  initialChats,
  initialChatId,
  initialMessages,
}: {
  initialLines: LinqLine[];
  initialLine: string;
  initialChats: LinqChat[] | null;
  initialChatId: string | null;
  initialMessages: LinqMessage[] | null;
}) {
  const [lines, setLines] = useState<LinqLine[]>(initialLines);
  const [selectedLine, setSelectedLine] = useState(initialLine);
  const [chats, setChats] = useState<LinqChat[] | null>(initialChats);
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [messages, setMessages] = useState<LinqMessage[] | null>(initialMessages);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  /* Drop responses that arrive out of order (line/chat changed mid-flight). */
  const reqSeq = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMsgId = useRef<string | null>(initialMessages?.at(-1)?.id ?? null);
  const lastChatScrolled = useRef<string | null>(null);

  const refresh = useCallback(async (line: string, chat: string | null) => {
    const seq = ++reqSeq.current;
    try {
      const p = new URLSearchParams();
      if (line) p.set("line", line);
      if (chat) p.set("chat", chat);
      const res = await fetch(`/api/linq/live?${p.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const snap = (await res.json()) as Snapshot;
      if (seq !== reqSeq.current) return; // a newer request superseded us
      if (snap.lines) setLines(snap.lines);
      setChats(snap.chats);
      if (chat) setMessages(snap.messages);
      setUpdatedAt(snap.at);
      setStale(false);
    } catch {
      if (seq === reqSeq.current) setStale(true);
    } finally {
      if (seq === reqSeq.current) setLoadingThread(false);
    }
  }, []);

  /* Poll while the tab is visible; also fires immediately whenever the
     selected line or chat changes. */
  useEffect(() => {
    if (!selectedLine) return;
    void refresh(selectedLine, chatId);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(selectedLine, chatId);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [selectedLine, chatId, refresh]);

  /* Auto-scroll: jump to the bottom when a thread opens, and follow new
     messages only if the reader is already near the bottom. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !messages?.length) return;
    const newest = messages.at(-1)?.id ?? null;
    if (chatId !== lastChatScrolled.current) {
      lastChatScrolled.current = chatId;
      lastMsgId.current = newest;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (newest !== lastMsgId.current) {
      lastMsgId.current = newest;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, chatId]);

  const selectLine = (line: string) => {
    if (line === selectedLine) return;
    setSelectedLine(line);
    setChatId(null);
    setMessages(null);
    setChats(null);
    syncUrl(line, null);
  };

  const selectChat = (id: string) => {
    if (id === chatId) return;
    setChatId(id);
    setMessages(null);
    setLoadingThread(true);
    syncUrl(selectedLine, id);
  };

  const selectedChat = chats?.find((c) => c.id === chatId) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Line picker + live status */}
      <div className="flex flex-wrap items-center gap-2">
        {lines.map((l) => {
          const active = l.phoneNumber === selectedLine;
          return (
            <button
              key={l.id || l.phoneNumber}
              type="button"
              onClick={() => selectLine(l.phoneNumber)}
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
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--ad-muted)]">
          <span
            className={`h-2 w-2 rounded-full ${stale ? "bg-[var(--ad-pending)]" : "animate-pulse bg-[var(--ad-positive)]"}`}
          />
          {stale ? "Reconnecting…" : updatedAt ? `Live · updated ${fmtTime(updatedAt)}` : "Live"}
        </span>
      </div>

      {/* Chats + thread */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversation list for the selected line */}
        <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel-2)] p-2">
          {(chats ?? []).map((c) => {
            const active = chatId === c.id;
            const who = c.isGroup
              ? c.displayName || `Group · ${c.participants.length} people`
              : c.participants.map(maskPhone).join(", ") || c.displayName || "Unknown";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectChat(c.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  active ? "bg-[var(--ad-paper)] shadow-[var(--ad-shadow-card)]" : "hover:bg-[var(--ad-paper)]"
                }`}
              >
                <DigitAvatar handle={c.participants[0] ?? c.displayName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ad-ink)]">
                    {who}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--ad-muted)]">
                    {c.service ?? "-"} · {fmtWhen(c.updatedAt)}
                  </span>
                </span>
                {c.health !== "HEALTHY" ? (
                  <StatusBadge tone={healthTone(c.health)}>
                    {c.health.replace("_", " ").toLowerCase()}
                  </StatusBadge>
                ) : null}
              </button>
            );
          })}
          {!chats?.length ? (
            <p className="px-3 py-4 text-sm text-[var(--ad-muted)]">
              {chats === null ? "Loading conversations…" : "No conversations on this line yet."}
            </p>
          ) : null}
        </div>

        {/* Thread */}
        <div className="flex max-h-[520px] flex-col rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)]">
          {selectedChat ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DigitAvatar handle={selectedChat.participants[0] ?? ""} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                      {selectedChat.isGroup
                        ? selectedChat.displayName || "Group chat"
                        : selectedChat.participants.map(maskPhone).join(", ")}
                    </p>
                    <p className="text-[11px] text-[var(--ad-muted)]">
                      via {selectedLine} · {selectedChat.service ?? "-"} ·{" "}
                      {messages?.length ?? 0} message{(messages?.length ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={healthTone(selectedChat.health)}>
                  {selectedChat.health.replace("_", " ").toLowerCase()}
                </StatusBadge>
              </div>
              <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {(messages ?? []).map((m, i) => {
                  const prev = messages?.[i - 1];
                  const newDay = !prev || prev.at.slice(0, 10) !== m.at.slice(0, 10);
                  return (
                    <div key={m.id} className="flex flex-col gap-3">
                      {newDay ? (
                        <div className="flex items-center justify-center py-1">
                          <span className="rounded-full bg-[var(--ad-panel)] px-3.5 py-1 text-[11px] font-medium text-[var(--ad-muted)]">
                            {fmtDaySep(m.at)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={`flex items-end gap-2 ${m.fromMe ? "justify-end" : "justify-start"}`}
                      >
                        {!m.fromMe ? (
                          <DigitAvatar handle={selectedChat.participants[0] ?? ""} size={28} />
                        ) : null}
                        <div
                          className={`flex max-w-[72%] flex-col ${m.fromMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                              m.fromMe
                                ? "rounded-br-md bg-[var(--ad-slate)] text-white"
                                : "rounded-bl-md border border-[var(--ad-line)] bg-[var(--ad-panel)] text-[var(--ad-ink)]"
                            }`}
                          >
                            {m.text || (m.mediaCount ? "" : "…")}
                            {m.mediaCount ? (
                              <span
                                className={m.text ? "mt-1 block text-xs opacity-75" : "text-xs opacity-90"}
                              >
                                📎 {m.mediaCount} attachment{m.mediaCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          <span className="mt-1 px-1 text-[10px] text-[var(--ad-muted)]">
                            {fmtTime(m.at)}
                            {m.fromMe && m.deliveryStatus ? ` · ${m.deliveryStatus}` : ""}
                          </span>
                        </div>
                        {m.fromMe ? <AgentAvatar /> : null}
                      </div>
                    </div>
                  );
                })}
                {!messages?.length ? (
                  <p className="py-6 text-center text-sm text-[var(--ad-muted)]">
                    {loadingThread ? "Loading messages…" : "No messages in this conversation yet."}
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
  );
}
