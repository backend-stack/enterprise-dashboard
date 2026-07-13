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

/** One bubble in a conversation view. */
export interface ThreadMessage {
  id: string;
  from: "customer" | "agent" | "insight";
  text: string;
  at: string; // ISO
  /** Delivery status for agent messages (from smsLog). */
  status?: string;
}

/** Full conversation for one phone: customer texts (agentMemories episodes),
    agent insights, and outbound platform sends (smsLog), merged by time. */
export async function fetchThreadMessages(phone: string): Promise<ThreadMessage[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const [memSnap, smsSnap] = await Promise.all([
    db.collection("agentMemories").where("key", "==", phone).limit(500).get(),
    db.collection("smsLog").where("to", "==", phone).limit(500).get(),
  ]);

  const msgs: ThreadMessage[] = [];

  memSnap.docs.forEach((d) => {
    const data = d.data();
    const ts = typeof data.ts === "number" ? data.ts : parseFloat(str(data.ts)) || 0;
    msgs.push({
      id: d.id,
      from: data.kind === "insight" ? "insight" : "customer",
      text: str(data.text),
      at: ts ? new Date(ts * 1000).toISOString() : "",
    });
  });

  smsSnap.docs.forEach((d) => {
    const data = d.data();
    msgs.push({
      id: d.id,
      from: "agent",
      text: str(data.body),
      at: toIso(data.createdAt),
      status: str(data.status) || "unknown",
    });
  });

  msgs.sort((a, b) => (a.at < b.at ? -1 : 1));
  return msgs;
}

/** Every thread's messages in one shot (2 Firestore reads total), keyed by
    phone — lets the inbox switch conversations instantly client-side. */
export async function fetchAllThreadMessages(): Promise<Record<string, ThreadMessage[]> | null> {
  const db = getAdminDb();
  if (!db) return null;

  const [memSnap, smsSnap] = await Promise.all([
    db.collection("agentMemories").limit(1000).get(),
    db.collection("smsLog").limit(1000).get(),
  ]);

  const byPhone: Record<string, ThreadMessage[]> = {};
  const push = (phone: string, msg: ThreadMessage) => {
    (byPhone[phone] ??= []).push(msg);
  };

  memSnap.docs.forEach((d) => {
    const data = d.data();
    const phone = str(data.key);
    if (!phone) return;
    const ts = typeof data.ts === "number" ? data.ts : parseFloat(str(data.ts)) || 0;
    push(phone, {
      id: d.id,
      from: data.kind === "insight" ? "insight" : "customer",
      text: str(data.text),
      at: ts ? new Date(ts * 1000).toISOString() : "",
    });
  });

  smsSnap.docs.forEach((d) => {
    const data = d.data();
    const phone = str(data.to);
    if (!phone) return;
    push(phone, {
      id: d.id,
      from: "agent",
      text: str(data.body),
      at: toIso(data.createdAt),
      status: str(data.status) || "unknown",
    });
  });

  for (const msgs of Object.values(byPhone)) {
    msgs.sort((a, b) => (a.at < b.at ? -1 : 1));
  }
  return byPhone;
}

/** One distinct outbound message (grouped by body) — "what is being sent". */
export interface SmsCampaign {
  body: string;
  kind: string;
  recipients: number;
  statuses: Record<string, number>;
  firstAt: string;
  lastAt: string;
  /** Masked sample of recipient numbers (up to 6). */
  sampleTo: string[];
}

/** Groups the smsLog into distinct messages so the dashboard can show the
    exact text going out, how many people got it, and how delivery went. */
export async function fetchSmsCampaigns(limit = 400): Promise<SmsCampaign[] | null> {
  const log = await fetchSmsLog(limit);
  if (!log) return null;

  const groups = new Map<string, SmsCampaign>();
  for (const entry of log) {
    const key = entry.body.trim();
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = {
        body: entry.body,
        kind: entry.kind,
        recipients: 0,
        statuses: {},
        firstAt: entry.createdAt,
        lastAt: entry.createdAt,
        sampleTo: [],
      };
      groups.set(key, g);
    }
    g.recipients += 1;
    g.statuses[entry.status] = (g.statuses[entry.status] ?? 0) + 1;
    if (entry.createdAt && (!g.firstAt || entry.createdAt < g.firstAt)) g.firstAt = entry.createdAt;
    if (entry.createdAt > g.lastAt) g.lastAt = entry.createdAt;
    if (entry.to && g.sampleTo.length < 6) g.sampleTo.push(entry.to);
  }

  return [...groups.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
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
