"use client";

import { useMemo, useState } from "react";
import { Bot, Lock, Search, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AgentBubble, maskPhone, statusInfo } from "@/components/dashboard/AgentBubble";
import type { AgentThread, ThreadMessage } from "@/lib/imessage";

/* Two-pane team inbox. All messages arrive pre-fetched from the server, so
   switching threads is instant - no navigation, no reload, no scroll jump.
   Consecutive messages from the same side are visually grouped: the sender
   label shows once at the top of a run, the timestamp once at the bottom. */

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

function fmtDay(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function AgentInbox({
  threads,
  messagesByPhone,
  initialPhone,
}: {
  threads: AgentThread[];
  messagesByPhone: Record<string, ThreadMessage[]>;
  initialPhone?: string | null;
}) {
  const [activePhone, setActivePhone] = useState<string | null>(
    initialPhone && threads.some((t) => t.phone === initialPhone)
      ? initialPhone
      : threads[0]?.phone ?? null
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        (t.name ?? "").toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.lastText.toLowerCase().includes(q)
    );
  }, [threads, query]);

  const activeThread = threads.find((t) => t.phone === activePhone) ?? null;
  const messages = activePhone ? (messagesByPhone[activePhone] ?? []) : [];

  return (
    <div className="flex h-[580px]">
      {/* ── Thread list ─────────────────────────────────────────────────── */}
      <div className="flex w-full max-w-[300px] shrink-0 flex-col border-r border-[var(--ad-line)]">
        {/* Search */}
        <div className="border-b border-[var(--ad-line)] p-3">
          <label className="relative flex h-9 items-center">
            <Search size={14} className="pointer-events-none absolute left-3 text-[var(--ad-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or number"
              className="h-full w-full rounded-full border border-[var(--ad-line)] bg-[var(--ad-panel)] pl-8 pr-3 text-xs text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((t) => {
            const active = t.phone === activePhone;
            return (
              <button
                key={t.phone}
                type="button"
                onClick={() => setActivePhone(t.phone)}
                className={`flex w-full items-start gap-3 border-b border-[var(--ad-line)] px-4 py-3.5 text-left transition-colors ${
                  active ? "bg-[var(--ad-navy-bg)]" : "hover:bg-[var(--ad-panel-2)]"
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar name={t.name ?? t.phone.slice(-2)} size={38} />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--ad-paper)] bg-[var(--ad-positive)]">
                    <Bot size={9} className="text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                      {t.name ?? maskPhone(t.phone)}
                    </p>
                    <span className="shrink-0 text-[10px] text-[var(--ad-muted)]">
                      {fmtWhen(t.lastAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-[var(--ad-muted)]">
                      {t.lastText || "…"}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold leading-4 ${
                        active
                          ? "bg-[var(--ad-navy)] text-white"
                          : "bg-[var(--ad-panel)] text-[var(--ad-muted)]"
                      }`}
                    >
                      {t.messageCount}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {!filtered.length ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--ad-muted)]">
              No conversations match &ldquo;{query}&rdquo;.
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Conversation ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--ad-panel-2)]">
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 border-b border-[var(--ad-line)] bg-[var(--ad-paper)] px-6 py-3.5">
              <Avatar name={activeThread.name ?? activeThread.phone.slice(-2)} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--ad-ink)]">
                  {activeThread.name ?? maskPhone(activeThread.phone)}
                </p>
                <p className="text-xs text-[var(--ad-muted)]">
                  {maskPhone(activeThread.phone)} · iMessage
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--ad-navy-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--ad-navy)]">
                <Bot size={13} />
                Handled by Clo Agent
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const newDay = !prev || fmtDay(prev.at) !== fmtDay(m.at);
                // Group runs of consecutive bubbles from the same side.
                const startsRun = newDay || !prev || prev.from !== m.from;
                const endsRun = !next || next.from !== m.from || fmtDay(next.at) !== fmtDay(m.at);

                return (
                  <div key={m.id}>
                    {newDay ? (
                      <div className="my-5 flex justify-center">
                        <span className="rounded-full border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 py-1 text-[10px] font-medium text-[var(--ad-muted)]">
                          {fmtDay(m.at)}
                        </span>
                      </div>
                    ) : null}

                    {m.from === "insight" ? (
                      <div className="my-3 flex justify-center">
                        <span className="flex max-w-[80%] items-start gap-1.5 rounded-full bg-[var(--ad-orange-bg)] px-3.5 py-1.5 text-[11px] text-[var(--ad-ink-soft)]">
                          <Sparkles size={12} className="mt-0.5 shrink-0 text-[var(--ad-orange)]" />
                          <span className="truncate">Agent insight: {m.text}</span>
                        </span>
                      </div>
                    ) : m.from === "agent" ? (
                      <div className={startsRun ? "pt-2" : "pt-0.5"}>
                        <div className="flex justify-end">
                          <div className="max-w-[72%]">
                            {startsRun ? (
                              <p className="mb-1 flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ad-navy)]">
                                <Bot size={11} /> Clo Agent
                              </p>
                            ) : null}
                            <div
                              className={`rounded-2xl bg-[#233d4d] px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-[var(--ad-shadow-card)] ${
                                endsRun ? "rounded-br-md" : ""
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            </div>
                            {endsRun ? (
                              <p className="mt-1 text-right text-[10px] text-[var(--ad-muted)]">
                                {fmtTime(m.at)}
                                {m.status ? ` · ${statusInfo(m.status).label}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={startsRun ? "pt-2" : "pt-0.5"}>
                        <div className="flex justify-start">
                          <div className="max-w-[72%]">
                            <div
                              className={`rounded-2xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-4 py-2.5 text-[13px] leading-relaxed text-[var(--ad-ink)] shadow-[var(--ad-shadow-card)] ${
                                endsRun ? "rounded-bl-md" : ""
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            </div>
                            {endsRun ? (
                              <p className="mt-1 text-[10px] text-[var(--ad-muted)]">{fmtTime(m.at)}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!messages.length ? (
                <p className="py-8 text-center text-sm text-[var(--ad-muted)]">
                  No stored messages for this thread yet.
                </p>
              ) : null}
            </div>

            {/* Read-only composer - completes the iMessage look and states
                plainly why there's no reply box. */}
            <div className="border-t border-[var(--ad-line)] bg-[var(--ad-paper)] px-6 py-3">
              <div className="flex h-10 items-center gap-2.5 rounded-full border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4">
                <Lock size={13} className="shrink-0 text-[var(--ad-muted)]" />
                <span className="truncate text-xs text-[var(--ad-muted)]">
                  Read-only view - replies are sent by the Clo Agent from its phone line
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--ad-muted)]">
            No conversations yet.
          </div>
        )}
      </div>
    </div>
  );
}
