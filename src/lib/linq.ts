import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/* Linq Partner API (api.linqapp.com) - read-side client for the iMessage
   screen: the account's phone lines, the chats on a line, and the messages
   in a chat. Server-only: LINQ_API_KEY never reaches the browser.

   Endpoints (per the v3 OpenAPI spec):
     GET /v3/phone_numbers                 → lines on the account
     GET /v3/chats?from={line}&limit=&cursor=
     GET /v3/chats/{chatId}/messages?limit=&cursor=
*/

const API = "https://api.linqapp.com/api/partner/v3";

export interface LinqLine {
  id: string;
  phoneNumber: string;
  health: string; // HEALTHY | AT_RISK | CRITICAL | …
}

export interface LinqChat {
  id: string;
  displayName: string;
  /** Participants other than the line itself (E.164 or email). */
  participants: string[];
  isGroup: boolean;
  service: string | null;
  health: string;
  updatedAt: string;
}

export interface LinqMessage {
  id: string;
  fromMe: boolean;
  text: string;
  mediaCount: number;
  service: string | null;
  deliveryStatus: string;
  at: string; // sent_at or created_at ISO
}

export function linqConfigured(): boolean {
  return Boolean(process.env.LINQ_API_KEY);
}

function normalizeLine(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

/** The shared demo line every business sees today (LINQ_BUSINESS_LINE),
    normalized to E.164 — admins see every line, businesses only this one. */
export function businessLine(): string {
  return normalizeLine(process.env.LINQ_BUSINESS_LINE ?? "");
}

/** The line a specific business may read. Businesses will get their own
    numbers later: a `linqLine` field on their lunaPartners profile wins as
    soon as it's set; until then everyone falls back to the shared demo line
    from LINQ_BUSINESS_LINE. Returns "" when neither is configured. */
export async function resolveBusinessLine(uid: string): Promise<string> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("lunaPartners")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();
      const own = snap.empty ? "" : normalizeLine(String(snap.docs[0].data().linqLine ?? ""));
      if (own) return own;
    } catch {
      /* fall through to the shared demo line */
    }
  }
  return businessLine();
}

async function linqGet(path: string): Promise<Record<string, unknown> | null> {
  const key = process.env.LINQ_API_KEY;
  if (!key) return null;
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[linq] GET ${path} -> ${res.status}`, (await res.text()).slice(0, 300));
    return null;
  }
  return (await res.json()) as Record<string, unknown>;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function fetchLinqLines(): Promise<LinqLine[] | null> {
  const json = await linqGet("/v3/phone_numbers");
  if (!json) return null;
  const list = Array.isArray(json.phone_numbers) ? json.phone_numbers : [];
  return list
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const health = (r.health_status ?? r.reputation) as Record<string, unknown> | undefined;
      return {
        id: str(r.id),
        phoneNumber: str(r.phone_number),
        health: str(health?.status) || "UNKNOWN",
      };
    })
    .filter((l) => l.phoneNumber);
}

/** Chats on one line (or across all lines when `line` is omitted), newest
    activity first. Follows pagination up to `maxPages` pages of 100. */
export async function fetchLinqChats(
  line?: string,
  maxPages = 2
): Promise<LinqChat[] | null> {
  const chats: LinqChat[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    if (line) params.set("from", line);
    params.set("limit", "100");
    if (cursor) params.set("cursor", cursor);

    const json = await linqGet(`/v3/chats?${params.toString()}`);
    if (!json) return page === 0 ? null : chats;

    const list = Array.isArray(json.chats) ? json.chats : [];
    for (const raw of list) {
      const r = raw as Record<string, unknown>;
      const handles = Array.isArray(r.handles) ? r.handles : [];
      const others = handles
        .map((h) => h as Record<string, unknown>)
        .filter((h) => h.is_me !== true)
        .map((h) => str(h.handle))
        .filter(Boolean);
      const health = r.health_status as Record<string, unknown> | undefined;
      chats.push({
        id: str(r.id),
        displayName: str(r.display_name),
        participants: others,
        isGroup: r.is_group === true,
        service: str(r.service) || null,
        health: str(health?.status) || "HEALTHY",
        updatedAt: str(r.updated_at),
      });
    }

    cursor = typeof json.next_cursor === "string" ? json.next_cursor : null;
    if (!cursor) break;
  }

  chats.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  return chats;
}

/** All messages in a chat, oldest first, following pagination up to
    `maxPages` pages of 100. */
export async function fetchLinqMessages(
  chatId: string,
  maxPages = 3
): Promise<LinqMessage[] | null> {
  const out: LinqMessage[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);

    const json = await linqGet(
      `/v3/chats/${encodeURIComponent(chatId)}/messages?${params.toString()}`
    );
    if (!json) return page === 0 ? null : out;

    const list = Array.isArray(json.messages) ? json.messages : [];
    for (const raw of list) {
      const r = raw as Record<string, unknown>;
      const parts = Array.isArray(r.parts) ? r.parts : [];
      const texts: string[] = [];
      let mediaCount = 0;
      for (const p of parts) {
        const part = p as Record<string, unknown>;
        const type = str(part.type);
        if (type === "text" && str(part.value)) texts.push(str(part.value));
        else if (type === "media") mediaCount++;
        else if (type === "link" && str(part.url)) texts.push(str(part.url));
      }
      out.push({
        id: str(r.id),
        fromMe: r.is_from_me === true,
        text: texts.join("\n"),
        mediaCount,
        service: str(r.service) || null,
        deliveryStatus: str(r.delivery_status),
        at: str(r.sent_at) || str(r.created_at),
      });
    }

    cursor = typeof json.next_cursor === "string" ? json.next_cursor : null;
    if (!cursor) break;
  }

  out.sort((a, b) => (a.at > b.at ? 1 : -1));
  return out;
}
