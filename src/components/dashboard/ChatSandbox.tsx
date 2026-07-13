"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  Contact,
  DoorOpen,
  Mic,
  Pencil,
  Plus,
  Terminal,
  Users,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { maskPhone } from "@/components/dashboard/AgentBubble";

/* Interactive playground for the Linq v3 chats API, backed by the in-memory
   sandbox at /api/v3 and its dummy tenant accounts. Every button maps 1:1 to
   a real endpoint, and each call is appended to the API activity log below,
   so the page doubles as living documentation of the surface:

     POST /v3/chats · GET /v3/chats · GET|PUT /v3/chats/{id}
     POST /v3/chats/{id}/read · /leave · /share_contact_card · /voicememo */

interface Tenant {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
}

interface Chat {
  id: string;
  display_name: string;
  participants: string[];
  is_group: boolean;
  service: string;
  health_status: { status: string };
  unread_count: number;
  left: boolean;
  updated_at: string;
}

interface Message {
  id: string;
  kind: "text" | "voicememo" | "contact_card";
  text: string;
  duration_seconds: number | null;
  is_from_me: boolean;
  delivery_status: string;
  sent_at: string;
}

interface ApiLogEntry {
  id: number;
  method: string;
  path: string;
  status: number;
  at: string;
}

function fmtTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function chatTitle(c: Chat): string {
  if (c.display_name) return c.display_name;
  if (c.is_group) return `Group · ${c.participants.length} people`;
  return c.participants.map(maskPhone).join(", ") || "Unknown";
}

/* Small circle with the handle's last two digits - same customer avatar
   language as the iMessage page. */
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

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-[var(--ad-critical)] text-[var(--ad-critical-deep)] hover:bg-[var(--ad-critical-bg)]"
          : "border-[var(--ad-line)] bg-[var(--ad-paper)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function ChatSandbox() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string>("");
  const [detail, setDetail] = useState<(Chat & { messages: Message[] }) | null>(null);
  const [log, setLog] = useState<ApiLogEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Create-chat form
  const [newParticipants, setNewParticipants] = useState("");
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const logSeq = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);

  /* Every sandbox request goes through here so the method, spec path and
     status land in the activity log. */
  const call = useCallback(
    async (
      method: string,
      specPath: string,
      opts: { tenant?: string; body?: unknown } = {}
    ): Promise<Record<string, unknown> | null> => {
      const tenant = opts.tenant ?? tenantId;
      const sep = specPath.includes("?") ? "&" : "?";
      const res = await fetch(`/api${specPath}${tenant ? `${sep}tenant=${tenant}` : ""}`, {
        method,
        headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
      logSeq.current += 1;
      setLog((prev) =>
        [
          {
            id: logSeq.current,
            method,
            path: specPath,
            status: res.status,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 30)
      );
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : `${method} ${specPath} failed`);
        return null;
      }
      setError(null);
      return json;
    },
    [tenantId]
  );

  const refreshChats = useCallback(
    async (tenant: string, viaLog = true) => {
      if (viaLog) {
        const json = await call("GET", "/v3/chats", { tenant });
        if (json) setChats((json.chats as Chat[]) ?? []);
        return;
      }
      // Background poll - skip the log so it doesn't drown user actions.
      const res = await fetch(`/api/v3/chats?tenant=${tenant}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setChats((json.chats as Chat[]) ?? []);
      }
    },
    [call]
  );

  const refreshDetail = useCallback(
    async (tenant: string, id: string, viaLog = true) => {
      if (viaLog) {
        const json = await call("GET", `/v3/chats/${id}`, { tenant });
        if (json) setDetail(json.chat as Chat & { messages: Message[] });
        return;
      }
      const res = await fetch(`/api/v3/chats/${id}?tenant=${tenant}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDetail(json.chat as Chat & { messages: Message[] });
      }
    },
    [call]
  );

  // Boot: load the dummy tenant accounts and select the first.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v3/tenants", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const list = (json.tenants as Tenant[]) ?? [];
      setTenants(list);
      if (list[0]) setTenantId(list[0].id);
    })();
  }, []);

  // Tenant switch: reload chats, clear selection.
  useEffect(() => {
    if (!tenantId) return;
    setChatId("");
    setDetail(null);
    refreshChats(tenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Chat switch: load the thread.
  useEffect(() => {
    if (!tenantId || !chatId) return;
    setRenaming(false);
    refreshDetail(tenantId, chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Quiet 5s poll so canned auto-replies show up without clicking around.
  useEffect(() => {
    if (!tenantId) return;
    const t = setInterval(() => {
      refreshChats(tenantId, false);
      if (chatId) refreshDetail(tenantId, chatId, false);
    }, 5_000);
    return () => clearInterval(t);
  }, [tenantId, chatId, refreshChats, refreshDetail]);

  // Keep the thread pinned to the newest message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [detail?.messages.length, chatId]);

  const tenant = tenants.find((t) => t.id === tenantId) ?? null;

  /* ---------------------------------------------------------- actions */

  const handleCreate = async () => {
    const participants = newParticipants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const json = await call("POST", "/v3/chats", {
      body: {
        participants,
        display_name: newName || undefined,
        message: newMessage || undefined,
      },
    });
    if (json?.chat) {
      setCreating(false);
      setNewParticipants("");
      setNewName("");
      setNewMessage("");
      await refreshChats(tenantId, false);
      setChatId((json.chat as Chat).id);
    }
  };

  const handleRename = async () => {
    if (!chatId) return;
    const json = await call("PUT", `/v3/chats/${chatId}`, {
      body: { display_name: renameValue },
    });
    if (json) {
      setRenaming(false);
      await Promise.all([refreshChats(tenantId, false), refreshDetail(tenantId, chatId, false)]);
    }
  };

  const handleSimple = async (suffix: "read" | "leave" | "share_contact_card") => {
    if (!chatId) return;
    const json = await call("POST", `/v3/chats/${chatId}/${suffix}`, { body: {} });
    if (json) {
      await Promise.all([refreshChats(tenantId, false), refreshDetail(tenantId, chatId, false)]);
    }
  };

  const handleVoiceMemo = async () => {
    if (!chatId) return;
    const json = await call("POST", `/v3/chats/${chatId}/voicememo`, {
      body: { duration_seconds: 9 + Math.floor(Math.random() * 20) },
    });
    if (json) await refreshDetail(tenantId, chatId, false);
  };

  /* ------------------------------------------------------------ render */

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Dummy tenant accounts */}
      <Card className="p-4">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ad-muted)]">
          <Building2 size={13} /> Dummy tenant accounts
        </p>
        <div className="flex flex-wrap gap-2">
          {tenants.map((t) => {
            const active = t.id === tenantId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTenantId(t.id)}
                className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                  active
                    ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                    : "border-[var(--ad-line)] bg-[var(--ad-paper)] hover:bg-[var(--ad-panel)]"
                }`}
              >
                <span className="flex flex-col">
                  <span className={`text-[13px] font-semibold ${active ? "text-white" : "text-[var(--ad-ink)]"}`}>
                    {t.business_name}
                  </span>
                  <span className={`text-[11px] ${active ? "text-white/70" : "text-[var(--ad-muted)]"}`}>
                    {t.contact_name} · {t.phone_number}
                  </span>
                </span>
              </button>
            );
          })}
          {!tenants.length ? (
            <p className="text-sm text-[var(--ad-muted)]">Loading tenant accounts…</p>
          ) : null}
        </div>
      </Card>

      {error ? (
        <div className="rounded-[var(--ad-radius-sm)] bg-[var(--ad-critical-bg)] px-4 py-3 text-sm font-medium text-[var(--ad-critical-deep)]">
          {error}
        </div>
      ) : null}

      {/* Chats + thread */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Chat list */}
        <Card className="flex max-h-[600px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--ad-line)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--ad-ink)]">
              Chats{tenant ? ` · ${tenant.business_name}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-[var(--ad-ink)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90"
            >
              {creating ? <X size={12} /> : <Plus size={12} />}
              {creating ? "Cancel" : "New chat"}
            </button>
          </div>

          {/* POST /v3/chats */}
          {creating ? (
            <div className="flex flex-col gap-2 border-b border-[var(--ad-line)] bg-[var(--ad-panel-2)] p-3">
              <input
                value={newParticipants}
                onChange={(e) => setNewParticipants(e.target.value)}
                placeholder="Participants - +15551234567, comma-separated"
                className="h-9 rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 text-[12.5px] focus:border-[var(--ad-accent)] focus:outline-none"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Group name (optional)"
                className="h-9 rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 text-[12.5px] focus:border-[var(--ad-accent)] focus:outline-none"
              />
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="First message (optional)"
                className="h-9 rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 text-[12.5px] focus:border-[var(--ad-accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreate}
                className="h-9 rounded-xl bg-[var(--ad-accent)] text-[12.5px] font-semibold text-white hover:opacity-90"
              >
                Create · POST /v3/chats
              </button>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {chats.map((c) => {
              const active = c.id === chatId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChatId(c.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    active
                      ? "bg-[var(--ad-panel)] shadow-[var(--ad-shadow-card)]"
                      : "hover:bg-[var(--ad-panel-2)]"
                  }`}
                >
                  <DigitAvatar handle={c.participants[0] ?? c.display_name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ad-ink)]">
                      <span className="truncate">{chatTitle(c)}</span>
                      {c.is_group ? <Users size={12} className="shrink-0 text-[var(--ad-muted)]" /> : null}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--ad-muted)]">
                      {c.left ? "You left this chat" : `${c.service} · ${fmtTime(c.updated_at)}`}
                    </span>
                  </span>
                  {c.unread_count > 0 ? (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--ad-critical)] px-1 text-[10px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {!chats.length ? (
              <p className="px-3 py-4 text-sm text-[var(--ad-muted)]">No chats yet - create one above.</p>
            ) : null}
          </div>
        </Card>

        {/* Thread + actions */}
        <Card className="flex max-h-[600px] min-h-[420px] flex-col overflow-hidden">
          {detail ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DigitAvatar handle={detail.participants[0] ?? ""} size={38} />
                  <div className="min-w-0">
                    {renaming ? (
                      <span className="flex items-center gap-1.5">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename()}
                          autoFocus
                          className="h-8 w-48 rounded-lg border border-[var(--ad-accent)] bg-[var(--ad-paper)] px-2 text-[13px] focus:outline-none"
                        />
                        <button type="button" onClick={handleRename} title="Save · PUT /v3/chats/{chatId}" className="text-[var(--ad-positive)]">
                          <Check size={16} />
                        </button>
                        <button type="button" onClick={() => setRenaming(false)} className="text-[var(--ad-muted)]">
                          <X size={16} />
                        </button>
                      </span>
                    ) : (
                      <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">{chatTitle(detail)}</p>
                    )}
                    <p className="text-[11px] text-[var(--ad-muted)]">
                      {detail.participants.map(maskPhone).join(", ")} · {detail.messages.length} message
                      {detail.messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={detail.unread_count ? "pending" : "positive"}>
                  {detail.unread_count ? `${detail.unread_count} unread` : "All read"}
                </StatusBadge>
              </div>

              {/* Endpoint actions */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ad-line)] bg-[var(--ad-panel-2)] px-4 py-2.5">
                <ActionButton
                  icon={<Check size={13} />}
                  label="Mark read"
                  onClick={() => handleSimple("read")}
                  disabled={detail.left}
                />
                <ActionButton
                  icon={<Pencil size={13} />}
                  label="Rename"
                  onClick={() => {
                    setRenameValue(detail.display_name);
                    setRenaming(true);
                  }}
                  disabled={detail.left}
                />
                <ActionButton
                  icon={<Contact size={13} />}
                  label="Share contact card"
                  onClick={() => handleSimple("share_contact_card")}
                  disabled={detail.left}
                />
                <ActionButton
                  icon={<Mic size={13} />}
                  label="Send voice memo"
                  onClick={handleVoiceMemo}
                  disabled={detail.left}
                />
                {detail.is_group ? (
                  <ActionButton
                    icon={<DoorOpen size={13} />}
                    label="Leave group"
                    onClick={() => handleSimple("leave")}
                    disabled={detail.left}
                    danger
                  />
                ) : null}
              </div>

              {/* Messages */}
              <div ref={threadRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_from_me ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[75%] flex-col ${m.is_from_me ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                          m.is_from_me
                            ? "rounded-br-md bg-[var(--ad-slate)] text-white"
                            : "rounded-bl-md border border-[var(--ad-line)] bg-[var(--ad-panel)] text-[var(--ad-ink)]"
                        }`}
                      >
                        {m.kind === "voicememo" ? (
                          <span className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                              <Mic size={13} />
                            </span>
                            <span>
                              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                                Voice memo · {m.duration_seconds}s
                              </span>
                              <span className="block italic opacity-90">“{m.text}”</span>
                            </span>
                          </span>
                        ) : m.kind === "contact_card" ? (
                          <span className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                              <Contact size={13} />
                            </span>
                            <span>
                              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                                Contact card
                              </span>
                              {m.text}
                            </span>
                          </span>
                        ) : (
                          m.text
                        )}
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-[var(--ad-muted)]">
                        {fmtTime(m.sent_at)}
                        {m.is_from_me ? ` · ${m.delivery_status}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {detail.left ? (
                  <p className="py-2 text-center text-[11px] font-medium text-[var(--ad-muted)]">
                    You left this group chat - actions are disabled.
                  </p>
                ) : null}
                {!detail.messages.length ? (
                  <p className="py-6 text-center text-sm text-[var(--ad-muted)]">
                    No messages yet - share the contact card or send a voice memo to start.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--ad-muted)]">
              Pick a chat to open the thread and try the endpoint actions.
            </div>
          )}
        </Card>
      </div>

      {/* API activity log */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--ad-line)] px-4 py-3">
          <Terminal size={14} className="text-[var(--ad-muted)]" />
          <p className="text-[13px] font-semibold text-[var(--ad-ink)]">API activity</p>
          <p className="text-[11px] text-[var(--ad-muted)]">every action above is a real call to the sandbox endpoints</p>
        </div>
        <div className="max-h-[220px] overflow-y-auto p-2 font-mono text-[12px]">
          {log.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-[var(--ad-panel-2)]">
              <span className="w-12 shrink-0 font-bold text-[var(--ad-slate)]">{e.method}</span>
              <span className="min-w-0 flex-1 truncate text-[var(--ad-ink-soft)]">{e.path}</span>
              <span
                className={`shrink-0 font-semibold ${
                  e.status < 300 ? "text-[var(--ad-positive)]" : "text-[var(--ad-critical-deep)]"
                }`}
              >
                {e.status}
              </span>
              <span className="shrink-0 text-[var(--ad-muted)]">{fmtTime(e.at)}</span>
            </div>
          ))}
          {!log.length ? (
            <p className="px-3 py-3 text-sm text-[var(--ad-muted)] [font-family:inherit]">
              No calls yet - switch tenants, open a chat or hit an action.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
