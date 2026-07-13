"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarDays,
  Flag,
  Gauge,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Kpi } from "@/components/dashboard/Kpi";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { maskPhone } from "@/components/dashboard/AgentBubble";
import { useAuth } from "@/lib/auth-context";
import type { CiCustomer, CiData, CiStats, CiTenant } from "@/lib/ci";

/* Live Assistant — the Contextual Intelligence business feed, polled every
   4s per the API docs. All calls go through /api/ci/* so the service token
   stays server-side. */

const POLL_MS = 4000;

function fmtUnix(sec?: number): string {
  if (!sec) return "—";
  return new Date(sec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtTime(sec?: number): string {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function AssistantPage() {
  const { getToken } = useAuth();
  const [tenants, setTenants] = useState<CiTenant[] | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [data, setData] = useState<CiData | null>(null);
  const [stats, setStats] = useState<CiStats | null>(null);
  const [customers, setCustomers] = useState<CiCustomer[] | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unconfigured" | "error">("loading");
  const [lastSync, setLastSync] = useState<string>("");
  const pickedThread = useRef(false);

  const api = useCallback(
    async (path: string) => {
      const token = await getToken();
      const res = await fetch(`/api/ci/${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (res.status === 503) throw new Error("unconfigured");
      if (!res.ok) throw new Error(`api ${res.status}`);
      return res.json();
    },
    [getToken]
  );

  // Load the tenant list once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const json = await api("tenants");
        if (!alive) return;
        const list: CiTenant[] = json.tenants ?? [];
        setTenants(list);
        setTenantId(list[0]?.id ?? null);
        setState(list.length ? "ready" : "error");
      } catch (err) {
        if (!alive) return;
        setState(err instanceof Error && err.message === "unconfigured" ? "unconfigured" : "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  // Poll data + stats every 4s; customers on a slower cadence.
  useEffect(() => {
    if (!tenantId) return;
    let alive = true;
    let tick = 0;

    const poll = async () => {
      try {
        const [d, s] = await Promise.all([
          api(`tenants/${tenantId}/data`),
          api(`tenants/${tenantId}/stats`),
        ]);
        if (!alive) return;
        setData(d);
        setStats(s);
        setLastSync(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
        if (tick % 5 === 0) {
          const c = await api(`tenants/${tenantId}/customers`);
          if (alive) setCustomers(c.customers ?? c ?? []);
        }
        tick++;
      } catch {
        /* transient poll failure — keep last good data */
      }
    };

    pickedThread.current = false;
    setData(null);
    setStats(null);
    setCustomers(null);
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tenantId, api]);

  // Group messages into threads by customer phone, newest activity first.
  const threads = useMemo(() => {
    const byPhone = new Map<string, { phone: string; last: number; preview: string; count: number }>();
    (data?.messages ?? []).forEach((m) => {
      const t = byPhone.get(m.customer_phone);
      if (!t) {
        byPhone.set(m.customer_phone, {
          phone: m.customer_phone,
          last: m.created_at,
          preview: m.text,
          count: 1,
        });
      } else {
        t.count++;
        if (m.created_at > t.last) {
          t.last = m.created_at;
          t.preview = m.text;
        }
      }
    });
    return [...byPhone.values()].sort((a, b) => b.last - a.last);
  }, [data?.messages]);

  // Auto-select the busiest thread once per tenant.
  useEffect(() => {
    if (!pickedThread.current && threads.length) {
      setActivePhone(threads[0].phone);
      pickedThread.current = true;
    }
  }, [threads]);

  const conversation = useMemo(
    () =>
      (data?.messages ?? [])
        .filter((m) => m.customer_phone === activePhone)
        .sort((a, b) => a.created_at - b.created_at),
    [data?.messages, activePhone]
  );

  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    (customers ?? []).forEach((c) => {
      if (c.name) map.set(c.phone, c.name);
    });
    return map;
  }, [customers]);

  /* ── Setup / error states ────────────────────────────────────────────── */

  if (state === "unconfigured") {
    return (
      <>
        <PageHeader title="Live Assistant" subtitle="Real-time feed from the Contextual Intelligence API." />
        <Card className="p-8">
          <p className="text-sm font-semibold text-[var(--ad-ink)]">Awaiting API keys</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ad-muted)]">
            Add the credentials from your Contextual Intelligence API handout to{" "}
            <code className="rounded bg-[var(--ad-panel)] px-1 py-0.5">.env</code>:{" "}
            <code className="rounded bg-[var(--ad-panel)] px-1 py-0.5">CI_API_BASE_URL</code> and{" "}
            <code className="rounded bg-[var(--ad-panel)] px-1 py-0.5">CI_API_TOKEN</code>, then restart
            the server. The token stays server-side — the dashboard proxies every call.
          </p>
        </Card>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <PageHeader title="Live Assistant" subtitle="Real-time feed from the Contextual Intelligence API." />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">
          Couldn&apos;t load tenants from the CI API — check the base URL, token, and that your
          account is listed as an owner of at least one tenant.
        </Card>
      </>
    );
  }

  const activeTenant = tenants?.find((t) => t.id === tenantId) ?? null;

  return (
    <>
      <PageHeader
        title="Live Assistant"
        subtitle={
          activeTenant
            ? `${activeTenant.name}${activeTenant.neighborhood ? ` · ${activeTenant.neighborhood}` : ""} · live feed`
            : "Real-time feed from the Contextual Intelligence API."
        }
        action={
          <div className="flex items-center gap-3">
            {tenants && tenants.length > 1 ? (
              <select
                value={tenantId ?? ""}
                onChange={(e) => setTenantId(e.target.value)}
                className="h-10 rounded-full border border-[var(--ad-line)] bg-[var(--ad-paper)] px-4 text-sm font-medium text-[var(--ad-ink)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="flex items-center gap-2 rounded-full border border-[var(--ad-line)] px-3.5 py-2 text-xs font-medium text-[var(--ad-ink-soft)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ad-positive)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ad-positive)]" />
              </span>
              Live{lastSync ? ` · ${lastSync}` : ""}
            </span>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<MessageSquare size={16} />}
          label="Conversations"
          value={stats ? String(stats.conversations ?? 0) : "…"}
          tone="navy"
          emphasis
        />
        <Kpi
          icon={<CalendarDays size={16} />}
          label="Bookings"
          value={stats ? String(stats.bookings ?? 0) : "…"}
          tone="orange"
        />
        <Kpi
          icon={<TrendingUp size={16} />}
          label="Conversion rate"
          value={stats?.conversion_rate != null ? `${Math.round(stats.conversion_rate * 100)}%` : "…"}
          tone="navy"
        />
        <Kpi
          icon={<Flag size={16} />}
          label="Open inquiries"
          value={stats ? String(stats.inquiries ?? 0) : "…"}
          tone="orange"
        />
      </div>

      {/* Secondary stat strip */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-xs text-[var(--ad-ink-soft)]">
          <span className="flex items-center gap-1.5">
            <Gauge size={13} className="text-[var(--ad-muted)]" />
            Reply time p50{" "}
            <strong className="text-[var(--ad-ink)]">
              {stats?.latency?.p50_ms != null ? `${(stats.latency.p50_ms / 1000).toFixed(1)}s` : "—"}
            </strong>{" "}
            · p95{" "}
            <strong className="text-[var(--ad-ink)]">
              {stats?.latency?.p95_ms != null ? `${(stats.latency.p95_ms / 1000).toFixed(1)}s` : "—"}
            </strong>
          </span>
          <span>
            7-day messages <strong className="text-[var(--ad-ink)]">{stats?.messages_7d ?? "—"}</strong>
          </span>
          <span>
            7-day customers <strong className="text-[var(--ad-ink)]">{stats?.customers_7d ?? "—"}</strong>
          </span>
          <span>
            Today: <strong className="text-[var(--ad-ink)]">{stats?.today?.inbound ?? 0}</strong> inbound ·{" "}
            <strong className="text-[var(--ad-ink)]">{stats?.today?.reply ?? 0}</strong> replies ·{" "}
            <strong className="text-[var(--ad-ink)]">{stats?.today?.block ?? 0}</strong> blocked ·{" "}
            <strong className="text-[var(--ad-ink)]">{stats?.today?.missed_call ?? 0}</strong> missed-call
            texts
          </span>
        </div>
      </Card>

      {/* Conversations inbox */}
      <div className="mt-4 sm:mt-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-[520px]">
            {/* Threads */}
            <div className="flex w-full max-w-[290px] shrink-0 flex-col border-r border-[var(--ad-line)]">
              <div className="border-b border-[var(--ad-line)] px-5 py-3.5">
                <h3 className="text-[15px] font-semibold text-[var(--ad-ink)]">Conversations</h3>
                <p className="text-xs text-[var(--ad-muted)]">
                  {threads.length} active · updates every 4s
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {threads.map((t) => {
                  const active = t.phone === activePhone;
                  const name = customerName.get(t.phone);
                  return (
                    <button
                      key={t.phone}
                      type="button"
                      onClick={() => setActivePhone(t.phone)}
                      className={`flex w-full items-start gap-3 border-b border-[var(--ad-line)] px-4 py-3 text-left transition-colors ${
                        active ? "bg-[var(--ad-navy-bg)]" : "hover:bg-[var(--ad-panel-2)]"
                      }`}
                    >
                      <Avatar name={name ?? t.phone.slice(-2)} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                            {name ?? maskPhone(t.phone)}
                          </p>
                          <span className="shrink-0 text-[10px] text-[var(--ad-muted)]">
                            {fmtTime(t.last)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-[var(--ad-muted)]">{t.preview}</p>
                      </div>
                    </button>
                  );
                })}
                {!threads.length ? (
                  <p className="px-4 py-6 text-center text-xs text-[var(--ad-muted)]">
                    {data ? "No conversations yet." : "Loading…"}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Conversation */}
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--ad-panel-2)]">
              {activePhone ? (
                <>
                  <div className="flex items-center gap-3 border-b border-[var(--ad-line)] bg-[var(--ad-paper)] px-6 py-3">
                    <Avatar name={customerName.get(activePhone) ?? activePhone.slice(-2)} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                        {customerName.get(activePhone) ?? maskPhone(activePhone)}
                      </p>
                      <p className="text-xs text-[var(--ad-muted)]">{maskPhone(activePhone)}</p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--ad-navy-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--ad-navy)]">
                      <Bot size={13} />
                      Assistant
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-5">
                    {conversation.map((m, i) => (
                      <div
                        key={`${m.created_at}-${i}`}
                        className={`flex ${m.role === "assistant" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-[72%]">
                          <div
                            className={
                              m.role === "assistant"
                                ? "rounded-2xl rounded-br-md bg-[#0b84fe] px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-[var(--ad-shadow-card)]"
                                : "rounded-2xl rounded-bl-md border border-[var(--ad-line)] bg-[var(--ad-paper)] px-4 py-2.5 text-[13px] leading-relaxed text-[var(--ad-ink)] shadow-[var(--ad-shadow-card)]"
                            }
                          >
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          </div>
                          <p
                            className={`mt-1 text-[10px] text-[var(--ad-muted)] ${
                              m.role === "assistant" ? "text-right" : ""
                            }`}
                          >
                            {m.role === "assistant" ? "Assistant · " : ""}
                            {fmtUnix(m.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!conversation.length ? (
                      <p className="py-8 text-center text-sm text-[var(--ad-muted)]">
                        No messages in this thread yet.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-[var(--ad-muted)]">
                  {data ? "Select a conversation." : "Loading live feed…"}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Reservations + inquiries */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr] sm:mt-6 sm:gap-6">
        <Card className="min-w-0 p-1.5">
          <CardHeader title="Reservations" accent="var(--ad-navy)" />
          {data?.reservations?.length ? (
            <DataTable headers={["Guest", "Party", "Date", "Time", "Status"]}>
              {data.reservations.map((r, i) => (
                <Tr key={`${r.name}-${i}`}>
                  <Td className="font-medium text-[var(--ad-ink)]">{r.name}</Td>
                  <Td>{r.party_size}</Td>
                  <Td className="whitespace-nowrap">{r.date}</Td>
                  <Td className="whitespace-nowrap">{r.time}</Td>
                  <Td>
                    <StatusBadge tone={r.status === "confirmed" ? "positive" : "negative"}>
                      {r.status}
                    </StatusBadge>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-5 pb-6 pt-1 text-sm text-[var(--ad-muted)]">
              {data ? "No reservations yet." : "Loading…"}
            </p>
          )}
        </Card>

        <Card className="min-w-0 p-1.5">
          <CardHeader title="Flagged for the team" accent="var(--ad-orange)" />
          <div className="flex flex-col gap-2.5 px-4 pb-5 pt-1">
            {(data?.inquiries ?? []).map((q, i) => (
              <div
                key={i}
                className="rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 py-3"
              >
                <p className="text-[13px] leading-relaxed text-[var(--ad-ink)]">
                  {q.text ?? q.request ?? JSON.stringify(q)}
                </p>
                <p className="mt-1.5 text-[11px] text-[var(--ad-muted)]">
                  {q.customer_phone ? `${maskPhone(String(q.customer_phone))} · ` : ""}
                  {fmtUnix(typeof q.created_at === "number" ? q.created_at : undefined)}
                </p>
              </div>
            ))}
            {!data?.inquiries?.length ? (
              <p className="px-1 py-3 text-sm text-[var(--ad-muted)]">
                {data ? "Nothing flagged right now." : "Loading…"}
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Customers */}
      <div className="mt-4 sm:mt-6">
        <Card className="p-1.5">
          <CardHeader
            title="Customers"
            accent="var(--ad-navy)"
            action={
              customers ? (
                <span className="rounded-full border border-[var(--ad-line)] px-3 py-1 text-xs text-[var(--ad-ink-soft)]">
                  {customers.length} known
                </span>
              ) : undefined
            }
          />
          {customers?.length ? (
            <DataTable headers={["Customer", "Messages", "First seen", "Last seen", "Consent"]}>
              {customers.map((c) => (
                <Tr key={c.phone}>
                  <Td className="font-medium text-[var(--ad-ink)]">
                    <span className="flex items-center gap-3">
                      <Avatar name={c.name ?? c.phone.slice(-2)} size={30} />
                      <span>
                        {c.name ?? maskPhone(c.phone)}
                        {c.name ? (
                          <span className="block text-xs font-normal text-[var(--ad-muted)]">
                            {maskPhone(c.phone)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Td>
                  <Td>{c.messages ?? 0}</Td>
                  <Td className="whitespace-nowrap">{fmtUnix(c.first_seen)}</Td>
                  <Td className="whitespace-nowrap">{fmtUnix(c.last_seen)}</Td>
                  <Td>
                    <StatusBadge tone={c.consent === "stopped" ? "negative" : "positive"}>
                      {c.consent ?? "ok"}
                    </StatusBadge>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          ) : (
            <p className="px-5 pb-6 pt-1 text-sm text-[var(--ad-muted)]">
              {customers ? "No customers yet." : "Loading…"}
            </p>
          )}
        </Card>
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-[var(--ad-muted)]">
        <Phone size={11} />
        Missed-call text-backs stay at zero until the telephony integration launches — the counter is
        already wired and lights up automatically.
      </p>
    </>
  );
}
