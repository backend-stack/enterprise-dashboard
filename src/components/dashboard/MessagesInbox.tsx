"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";
import { maskPhone } from "@/components/dashboard/AgentBubble";
import type { CiMessage, CiTenant } from "@/lib/ci";

/* Unified Messages inbox - every conversation the agent is having, across
   every tenant, in one list. Live from the Contextual Intelligence API via
   the /api/ci proxy (CI_API_BASE_URL + CI_API_TOKEN):

     GET /api/ci/tenants                 → the account's tenants
     GET /api/ci/tenants/{id}/data      → each tenant's message feed

   Messages are grouped by customer phone into conversations and polled so
   new activity shows up without a reload. Read-only by design - the CI API
   exposes no send endpoints. */

const POLL_MS = 10_000;

interface Conversation {
  key: string; // `${tenantId}|${phone}`
  phone: string;
  tenantId: string;
  tenantName: string;
  messages: CiMessage[]; // oldest first
  lastAt: number; // unix seconds
}

function fmtTime(unixSec: number): string {
  if (!unixSec) return "";
  return new Date(unixSec * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtWhen(unixSec: number): string {
  if (!unixSec) return "-";
  return new Date(unixSec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* "Today" / "Yesterday" / "Jul 10, 2026" chips between message groups. */
function fmtDaySep(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dayKey(unixSec: number): string {
  return new Date(unixSec * 1000).toDateString();
}

/* Customer avatar - the number's last two digits, same visual language as
   the iMessage page. */
function DigitAvatar({ handle, size = 34 }: { handle: string; size?: number }) {
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

function AgentAvatar({ size = 26 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-slate)] text-white"
      style={{ width: size, height: size }}
    >
      <Bot size={size * 0.55} />
    </span>
  );
}

/** Folds every tenant's flat message feed into per-customer conversations. */
function buildConversations(
  feeds: Array<{ tenant: CiTenant; messages: CiMessage[] }>
): Conversation[] {
  const byKey = new Map<string, Conversation>();
  for (const { tenant, messages } of feeds) {
    for (const m of messages) {
      const phone = m.customer_phone || "unknown";
      const key = `${tenant.id}|${phone}`;
      let convo = byKey.get(key);
      if (!convo) {
        convo = {
          key,
          phone,
          tenantId: tenant.id,
          tenantName: tenant.name || tenant.id,
          messages: [],
          lastAt: 0,
        };
        byKey.set(key, convo);
      }
      convo.messages.push(m);
      if (m.created_at > convo.lastAt) convo.lastAt = m.created_at;
    }
  }
  const list = [...byKey.values()];
  for (const c of list) c.messages.sort((a, b) => a.created_at - b.created_at);
  list.sort((a, b) => b.lastAt - a.lastAt);
  return list;
}

export function MessagesInbox() {
  const { getToken, user, loading: authLoading } = useAuth();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const reqSeq = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(0);
  const lastKeyScrolled = useRef<string | null>(null);

  const authed = useCallback(
    async (path: string) => {
      const token = await getToken();
      const res = await fetch(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.status === 503) {
        setNotConfigured(true);
        throw new Error("not_configured");
      }
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : `GET ${path} → ${res.status}`);
      }
      return json ?? {};
    },
    [getToken]
  );

  /* One full snapshot: the tenant list, then every tenant's feed. */
  const refresh = useCallback(
    async () => {
      const seq = ++reqSeq.current;
      try {
        const t = await authed("/api/ci/tenants");
        const tenants = (t.tenants as CiTenant[]) ?? [];
        const feeds = await Promise.all(
          tenants.map(async (tenant) => {
            const d = await authed(`/api/ci/tenants/${tenant.id}/data`).catch(() => null);
            return { tenant, messages: ((d?.messages as CiMessage[]) ?? []).filter(Boolean) };
          })
        );
        if (seq !== reqSeq.current) return;
        const list = buildConversations(feeds);
        setConvos(list);
        // Open the newest conversation by default on first load.
        setSelectedKey((prev) => prev ?? list[0]?.key ?? null);
        setUpdatedAt(new Date().toISOString());
        setStale(false);
        setError(null);
      } catch (err) {
        if (seq !== reqSeq.current) return;
        if ((err as Error).message !== "not_configured") {
          setError((err as Error).message);
        }
        setStale(true);
      }
    },
    [authed]
  );

  // Boot + live poll (paused while the tab is hidden). Waits for Firebase to
  // restore the session first - a fetch without an ID token is a guaranteed 401.
  useEffect(() => {
    if (authLoading || !user) return;
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, authLoading, user]);

  const selected = convos?.find((c) => c.key === selectedKey) ?? null;

  /* Auto-scroll: jump to the bottom when a thread opens, follow new messages
     only if the reader is already near the bottom. */
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !selected) return;
    if (selected.key !== lastKeyScrolled.current) {
      lastKeyScrolled.current = selected.key;
      lastMsgCount.current = selected.messages.length;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (selected.messages.length !== lastMsgCount.current) {
      lastMsgCount.current = selected.messages.length;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [selected]);

  if (notConfigured) {
    return (
      <Card className="p-8 text-sm text-[var(--ad-muted)]">
        The agent API isn&apos;t connected yet - set CI_API_BASE_URL and CI_API_TOKEN in .env
        to stream live messages here.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {error ? (
        <div className="rounded-[var(--ad-radius-sm)] bg-[var(--ad-critical-bg)] px-4 py-3 text-sm font-medium text-[var(--ad-critical-deep)]">
          {error}
        </div>
      ) : null}

      {/* Conversations + thread - fills the viewport below the header */}
      <div className="grid gap-4 lg:h-[calc(100dvh-190px)] lg:min-h-[480px] lg:grid-cols-[380px_1fr]">
        {/* Conversation list - every tenant, one unified feed */}
        <Card className="flex max-h-[min(480px,calc(100dvh-220px))] flex-col overflow-hidden lg:h-full lg:max-h-none">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--ad-line)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--ad-ink)]">
              Conversations{convos ? ` · ${convos.length}` : ""}
            </p>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--ad-muted)]">
              <span
                className={`h-2 w-2 rounded-full ${stale ? "bg-[var(--ad-pending)]" : "animate-pulse bg-[var(--ad-positive)]"}`}
              />
              {stale
                ? "Reconnecting…"
                : updatedAt
                  ? `Live · ${new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                  : "Live"}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {(convos ?? []).map((c) => {
              const active = c.key === selectedKey;
              const last = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedKey(c.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "bg-[var(--ad-panel)] shadow-[var(--ad-shadow-card)]"
                      : "hover:bg-[var(--ad-panel-2)]"
                  }`}
                >
                  <DigitAvatar handle={c.phone} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12.5px] font-semibold text-[var(--ad-ink)]">
                        {maskPhone(c.phone)}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--ad-muted)]">
                        {fmtWhen(c.lastAt)}
                      </span>
                    </span>
                    <span className="block truncate text-[11px] text-[var(--ad-muted)]">
                      <span className="font-medium text-[var(--ad-ink-soft)]">{c.tenantName}</span>
                      {" · "}
                      {last ? `${last.role === "assistant" ? "→ " : ""}${last.text}` : "-"}
                    </span>
                  </span>
                </button>
              );
            })}
            {convos && !convos.length ? (
              <p className="px-3 py-4 text-sm text-[var(--ad-muted)]">No conversations yet.</p>
            ) : null}
            {!convos ? (
              <p className="px-3 py-4 text-sm text-[var(--ad-muted)]">Loading conversations…</p>
            ) : null}
          </div>
        </Card>

        {/* Thread */}
        <Card className="flex max-h-[min(560px,calc(100dvh-220px))] min-h-[360px] flex-col overflow-hidden lg:h-full lg:max-h-none">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DigitAvatar handle={selected.phone} size={42} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--ad-ink)]">
                      {maskPhone(selected.phone)}
                    </p>
                    <p className="text-xs text-[var(--ad-muted)]">
                      {selected.tenantName} · {selected.messages.length} message
                      {selected.messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div ref={threadRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {selected.messages.map((m, i) => {
                  const prev = selected.messages[i - 1];
                  const fromMe = m.role === "assistant";
                  const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                  return (
                    <div key={`${m.created_at}_${i}`} className="flex flex-col gap-2.5">
                      {newDay ? (
                        <div className="flex items-center justify-center py-1">
                          <span className="rounded-full bg-[var(--ad-panel)] px-3.5 py-1 text-[11px] font-medium text-[var(--ad-muted)]">
                            {fmtDaySep(m.created_at)}
                          </span>
                        </div>
                      ) : null}
                      <div className={`flex items-end gap-2 ${fromMe ? "justify-end" : "justify-start"}`}>
                        {!fromMe ? <DigitAvatar handle={selected.phone} size={28} /> : null}
                        <div className={`flex max-w-[70%] flex-col ${fromMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                              fromMe
                                ? "rounded-br-md bg-[var(--ad-slate)] text-white"
                                : "rounded-bl-md border border-[var(--ad-line)] bg-[var(--ad-panel)] text-[var(--ad-ink)]"
                            }`}
                          >
                            {m.text}
                          </div>
                          <span className="mt-1 px-1 text-[10px] text-[var(--ad-muted)]">
                            {fmtTime(m.created_at)}
                          </span>
                        </div>
                        {fromMe ? <AgentAvatar /> : null}
                      </div>
                    </div>
                  );
                })}
                {!selected.messages.length ? (
                  <p className="py-6 text-center text-sm text-[var(--ad-muted)]">
                    No messages in this conversation yet.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--ad-muted)]">
              Pick a conversation to read the full thread.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
