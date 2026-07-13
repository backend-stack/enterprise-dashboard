import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, toIso } from "@/lib/firebase-admin";

/* Live platform analytics for the main dashboard pages — users, events,
   RSVPs, venues and messaging volume, all read via the Admin SDK. */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/* ── Users ─────────────────────────────────────────────────────────────── */

export interface UserStats {
  total: number;
  approved: number;
  pending: number;
  newThisWeek: number;
}

export interface SignupPoint {
  date: string; // YYYY-MM-DD
  label: string; // Mon…
  signups: number;
  approved: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  instagram: string;
  status: string;
  score: number;
  joined: string;
}

export async function fetchUserStats(): Promise<UserStats | null> {
  const db = getAdminDb();
  if (!db) return null;
  const users = db.collection("users");
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 86400_000);
  const [total, approved, pending, newWeek] = await Promise.all([
    users.count().get(),
    users.where("status", "==", "approved").count().get(),
    users.where("status", "==", "pending").count().get(),
    users.where("joined", ">=", weekAgo).count().get(),
  ]);
  return {
    total: total.data().count,
    approved: approved.data().count,
    pending: pending.data().count,
    newThisWeek: newWeek.data().count,
  };
}

/** Signups per day over the trailing `days`, split by approval status. */
export async function fetchSignupsByDay(days = 7): Promise<SignupPoint[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const snap = await db
    .collection("users")
    .where("joined", ">=", Timestamp.fromDate(start))
    .select("joined", "status")
    .limit(5000)
    .get();

  const buckets = new Map<string, SignupPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      signups: 0,
      approved: 0,
    });
  }
  snap.docs.forEach((doc) => {
    const d = doc.data();
    const iso = toIso(d.joined).slice(0, 10);
    const b = buckets.get(iso);
    if (!b) return;
    b.signups += 1;
    if (str(d.status) === "approved") b.approved += 1;
  });
  return [...buckets.values()];
}

export async function fetchRecentUsers(limit = 50): Promise<PlatformUser[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("users")
    .orderBy("joined", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    const name = [str(d.first_name), str(d.last_name)].filter(Boolean).join(" ");
    return {
      id: doc.id,
      name: name || "Unnamed user",
      instagram: str(d.instagram),
      status: str(d.status) || "unknown",
      score: num(d.score),
      joined: toIso(d.joined),
    };
  });
}

/* ── Events & RSVPs ────────────────────────────────────────────────────── */

export interface PlatformEvent {
  id: string;
  name: string;
  venue: string;
  address: string;
  startsAt: string;
  capacity: number;
  going: number;
  pending: number;
  priceCents: number | null;
  published: boolean;
}

export interface Rsvp {
  id: string;
  name: string;
  event: string;
  status: string;
  appliedAt: string;
}

export async function fetchEvents(): Promise<PlatformEvent[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("partyEvents").limit(100).get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: str(d.name) || "Untitled event",
      venue: str(d.venue),
      address: str(d.address),
      startsAt: toIso(d.startsAt),
      capacity: num(d.capacity),
      going: num(d.goingCount),
      pending: num(d.pendingCount),
      priceCents: typeof d.priceCents === "number" ? d.priceCents : null,
      published: d.published === true,
    };
  });
  rows.sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
  return rows;
}

export async function fetchRsvps(limit = 100): Promise<Rsvp[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("partyRSVPs").limit(limit).get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    const ts = typeof d.appliedAt === "number" ? d.appliedAt : 0;
    return {
      id: doc.id,
      name: str(d.name) || "Unknown",
      event: str(d.event),
      status: str(d.status) || "pending",
      appliedAt: ts ? new Date(ts * 1000).toISOString() : toIso(d.appliedAt),
    };
  });
  rows.sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
  return rows;
}

/* ── Activity (adminLogs) ──────────────────────────────────────────────── */

export interface PlatformActivity {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export async function fetchActivity(limit = 8): Promise<PlatformActivity[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("adminLogs")
    .orderBy("at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      actor: str(d.adminName) || "Admin",
      action: str(d.action),
      target: str(d.targetName),
      at: toIso(d.at),
    };
  });
}

/* ── Venues (eventsV2 + venueLikes) ────────────────────────────────────── */

export interface VenueEngagement {
  id: string;
  name: string;
  category: string;
  location: string;
  likes: number;
  /** False when the venue was removed from eventsV2 but still has likes. */
  live: boolean;
}

export async function fetchVenueEngagement(): Promise<{
  venues: VenueEngagement[];
  totalLikes: number;
  categories: Record<string, number>;
} | null> {
  const db = getAdminDb();
  if (!db) return null;
  const [venueSnap, likeSnap] = await Promise.all([
    db.collection("eventsV2").limit(300).get(),
    db.collection("venueLikes").limit(500).get(),
  ]);

  const likes = new Map<string, number>();
  let totalLikes = 0;
  likeSnap.docs.forEach((d) => {
    const n = num(d.data().likeCount);
    likes.set(d.id, n);
    totalLikes += n;
  });

  const categories: Record<string, number> = {};
  const liveIds = new Set(venueSnap.docs.map((d) => d.id));
  const venues: VenueEngagement[] = venueSnap.docs.map((doc) => {
    const d = doc.data();
    const category = str(d.dropdownValue) || str(d.chosen_type) || "uncategorised";
    categories[category] = (categories[category] ?? 0) + 1;
    return {
      id: doc.id,
      name: str(d.name) || "Unnamed venue",
      category,
      location: str(d.location),
      likes: likes.get(doc.id) ?? 0,
      live: true,
    };
  });

  // Likes for venues no longer in eventsV2 are still real engagement —
  // surface them as removed venues instead of silently dropping the counts.
  likeSnap.docs.forEach((d) => {
    if (liveIds.has(d.id)) return;
    const data = d.data();
    const n = num(data.likeCount);
    if (n <= 0) return;
    venues.push({
      id: d.id,
      name: str(data.name) || "Removed venue",
      category: str(data.category) || "unlisted",
      location: "",
      likes: n,
      live: false,
    });
  });

  venues.sort((a, b) => b.likes - a.likes);
  return { venues, totalLikes, categories };
}

/* ── Messaging volume by day (agentMemories + smsLog) ──────────────────── */

export interface MessagePoint {
  date: string;
  label: string;
  inbound: number; // customer texts to the agent
  outbound: number; // platform sends
}

export async function fetchMessagingByDay(days = 14): Promise<MessagePoint[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const [memSnap, smsSnap] = await Promise.all([
    db.collection("agentMemories").select("ts", "kind").limit(2000).get(),
    db.collection("smsLog").select("createdAt").limit(2000).get(),
  ]);

  const buckets = new Map<string, MessagePoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      inbound: 0,
      outbound: 0,
    });
  }
  memSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.kind === "insight") return;
    const ts = typeof d.ts === "number" ? d.ts : parseFloat(str(d.ts)) || 0;
    if (!ts) return;
    const key = new Date(ts * 1000).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) b.inbound += 1;
  });
  smsSnap.docs.forEach((doc) => {
    const key = toIso(doc.data().createdAt).slice(0, 10);
    const b = buckets.get(key);
    if (b) b.outbound += 1;
  });
  return [...buckets.values()];
}
