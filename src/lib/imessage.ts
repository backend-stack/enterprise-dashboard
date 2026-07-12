import "server-only";
import { getAdminDb, toIso } from "@/lib/firebase-admin";

/* Live iMessage-agent data.

   `agentMemories` — every text the iMessage/SMS agent has exchanged, keyed by
   the customer's phone number (kind "episode" = a message in the thread).
   `contactProfiles` — phone → display name, filled in as the agent learns.
   `smsLog` — outbound SMS/iMessage delivery log with per-message status. */

export interface AgentThread {
  phone: string;
  name: string | null;
  messageCount: number;
  lastText: string;
  lastAt: string;
}

export interface SmsLogEntry {
  id: string;
  to: string | null;
  body: string;
  kind: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface IMessageStats {
  totalMemories: number;
  uniquePhones: number;
  smsTotal: number;
  smsByStatus: Record<string, number>;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function fetchAgentThreads(): Promise<AgentThread[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const [memSnap, contactSnap] = await Promise.all([
    db.collection("agentMemories").limit(1000).get(),
    db.collection("contactProfiles").limit(500).get(),
  ]);

  const names = new Map<string, string>();
  contactSnap.docs.forEach((d) => {
    const n = str(d.data().name);
    if (n) names.set(d.id, n);
  });

  // Group memories into per-phone threads, keeping the latest text on top.
  const threads = new Map<string, AgentThread>();
  for (const doc of memSnap.docs) {
    const d = doc.data();
    const phone = str(d.key);
    if (!phone) continue;
    const ts = typeof d.ts === "number" ? d.ts : parseFloat(str(d.ts)) || 0;
    const at = ts ? new Date(ts * 1000).toISOString() : "";
    const existing = threads.get(phone);
    if (!existing) {
      threads.set(phone, {
        phone,
        name: names.get(phone) ?? null,
        messageCount: 1,
        lastText: str(d.text),
        lastAt: at,
      });
    } else {
      existing.messageCount += 1;
      if (at > existing.lastAt) {
        existing.lastAt = at;
        existing.lastText = str(d.text);
      }
    }
  }

  return [...threads.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export async function fetchSmsLog(limit = 50): Promise<SmsLogEntry[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("smsLog")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      to: str(d.to) || null,
      body: str(d.body),
      kind: str(d.kind),
      status: str(d.status) || "unknown",
      error: str(d.error) || null,
      createdAt: toIso(d.createdAt),
    };
  });
}

export async function fetchIMessageStats(): Promise<IMessageStats | null> {
  const db = getAdminDb();
  if (!db) return null;
  const [memCount, smsSnap] = await Promise.all([
    db.collection("agentMemories").count().get(),
    db.collection("smsLog").limit(1000).get(),
  ]);

  const phones = new Set<string>();
  const memSnap = await db.collection("agentMemories").select("key").limit(1000).get();
  memSnap.docs.forEach((d) => {
    const k = str(d.data().key);
    if (k) phones.add(k);
  });

  const smsByStatus: Record<string, number> = {};
  smsSnap.docs.forEach((d) => {
    const s = str(d.data().status) || "unknown";
    smsByStatus[s] = (smsByStatus[s] ?? 0) + 1;
  });

  return {
    totalMemories: memCount.data().count,
    uniquePhones: phones.size,
    smsTotal: smsSnap.size,
    smsByStatus,
  };
}
