import { Bot } from "lucide-react";

/* Blue outbound iMessage bubble, labeled as the Clo Agent. No hooks - safe
   in both server and client components. */
export function AgentBubble({ text, caption }: { text: string; caption?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[72%]">
        <p className="mb-1 flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ad-navy)]">
          <Bot size={11} /> Clo Agent
        </p>
        <div className="rounded-2xl rounded-br-md bg-[#0b84fe] px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-[var(--ad-shadow-card)]">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
        {caption ? (
          <p className="mt-1 text-right text-[10px] text-[var(--ad-muted)]">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}

/* Delivery-status display shared by the inbox and campaign cards. */
export const STATUS_INFO: Record<
  string,
  { label: string; tone: "positive" | "orange" | "negative" | "neutral" }
> = {
  sent: { label: "Sent", tone: "positive" },
  delivered: { label: "Delivered", tone: "positive" },
  skipped_nophone: { label: "Skipped - no phone on file", tone: "orange" },
  skipped_noconfig: { label: "Skipped - SMS sending not configured", tone: "orange" },
  failed: { label: "Failed", tone: "negative" },
  error: { label: "Error", tone: "negative" },
};

export function statusInfo(status: string) {
  return STATUS_INFO[status] ?? { label: status.replace(/_/g, " "), tone: "neutral" as const };
}

/** Mask the middle digits so full numbers aren't splashed across the UI. */
export function maskPhone(phone: string): string {
  return phone.replace(/(\+?\d{1,2})\d+(\d{4})$/, "$1•••$2");
}
