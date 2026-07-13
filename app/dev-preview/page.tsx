/* TEMPORARY preview of the Lines thread UI with live Linq data — delete after review. */
import { Bot } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchLinqChats, fetchLinqLines, fetchLinqMessages } from "@/lib/linq";
import { maskPhone } from "@/components/dashboard/AgentBubble";

export const dynamic = "force-dynamic";

function fmtTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDaySep(iso: string): string {
  const d = new Date(iso);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function DigitAvatar({ handle, size = 36 }: { handle: string; size?: number }) {
  const digits = handle.replace(/\D/g, "").slice(-2) || "??";
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-slate-bg)] font-semibold text-[var(--ad-slate)]" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {digits}
    </span>
  );
}
function AgentAvatar({ size = 28 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ad-slate)] text-white" style={{ width: size, height: size }}>
      <Bot size={size * 0.55} />
    </span>
  );
}

export default async function Preview() {
  const lines = (await fetchLinqLines()) ?? [];
  const line = lines[1]?.phoneNumber ?? lines[0]?.phoneNumber ?? "";
  const chats = (await fetchLinqChats(line)) ?? [];
  const chat = chats[0] ?? null;
  const messages = chat ? ((await fetchLinqMessages(chat.id)) ?? []) : [];

  return (
    <div className="min-h-screen bg-[var(--ad-cream)] p-8">
      <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex max-h-[640px] flex-col gap-1 overflow-y-auto rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel-2)] p-2">
          {chats.slice(0, 10).map((c, idx) => (
            <div key={c.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${idx === 0 ? "bg-[var(--ad-paper)] shadow-[var(--ad-shadow-card)]" : ""}`}>
              <DigitAvatar handle={c.participants[0] ?? c.displayName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[var(--ad-ink)]">
                  {c.participants.map(maskPhone).join(", ") || c.displayName}
                </span>
                <span className="block truncate text-[11px] text-[var(--ad-muted)]">{c.service ?? "-"}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex max-h-[640px] flex-col rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)]">
          {chat ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DigitAvatar handle={chat.participants[0] ?? ""} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ad-ink)]">
                      {chat.participants.map(maskPhone).join(", ")}
                    </p>
                    <p className="text-[11px] text-[var(--ad-muted)]">via {line} · {chat.service ?? "-"} · {messages.length} messages</p>
                  </div>
                </div>
                <StatusBadge tone="positive">healthy</StatusBadge>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
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
                      <div className={`flex items-end gap-2 ${m.fromMe ? "justify-end" : "justify-start"}`}>
                        {!m.fromMe ? <DigitAvatar handle={chat.participants[0] ?? ""} size={28} /> : null}
                        <div className={`flex max-w-[72%] flex-col ${m.fromMe ? "items-end" : "items-start"}`}>
                          <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${m.fromMe ? "rounded-br-md bg-[var(--ad-slate)] text-white" : "rounded-bl-md border border-[var(--ad-line)] bg-[var(--ad-panel)] text-[var(--ad-ink)]"}`}>
                            {m.text || "…"}
                          </div>
                          <span className="mt-1 px-1 text-[10px] text-[var(--ad-muted)]">
                            {fmtTime(m.at)}{m.fromMe && m.deliveryStatus ? ` · ${m.deliveryStatus}` : ""}
                          </span>
                        </div>
                        {m.fromMe ? <AgentAvatar /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="p-8 text-sm text-[var(--ad-muted)]">No chats.</p>
          )}
        </div>
      </div>
    </div>
  );
}
