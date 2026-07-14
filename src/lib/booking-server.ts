import "server-only";
import { randomUUID } from "crypto";
import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import {
  parseBookingSettings,
  type Booking,
  type BookingRequestInput,
  type BookingSettings,
} from "@/lib/booking";

/* Firestore access for bookings. All queries use equality/`in` filters only
   (no orderBy) so no composite indexes are needed - lists are sorted in
   memory. Capacity is enforced inside transactions. */

export interface BookingBusiness {
  id: string;
  businessName: string;
  settings: BookingSettings;
}

/* The business's wall-clock. BOOKING_TZ (IANA name) pins it for deployments
   whose server timezone differs from the business's; unset = server local. */
function bookingTimeZone(): string | undefined {
  return process.env.BOOKING_TZ || undefined;
}

export function todayStr(): string {
  // en-CA formats as YYYY-MM-DD.
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: bookingTimeZone() });
  } catch {
    return new Date().toLocaleDateString("en-CA");
  }
}

/** "HH:mm" now, in the business's wall-clock. */
export function nowStr(): string {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: bookingTimeZone(),
    });
  } catch {
    return new Date().toLocaleTimeString("en-GB", {
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export function newStatusToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

function docToBusiness(doc: DocumentSnapshot): BookingBusiness {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    businessName: typeof d.businessName === "string" ? d.businessName : "",
    settings: parseBookingSettings(d.booking),
  };
}

export async function getBusinessById(
  db: Firestore,
  businessId: string
): Promise<BookingBusiness | null> {
  const doc = await db.collection("lunaPartners").doc(businessId).get();
  return doc.exists ? docToBusiness(doc) : null;
}

export async function getOwnedBusiness(
  db: Firestore,
  uid: string
): Promise<BookingBusiness | null> {
  const snap = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  return snap.empty ? null : docToBusiness(snap.docs[0]);
}

export function docToBooking(doc: DocumentSnapshot): Booking {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    businessId: String(d.businessId ?? ""),
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    phone: d.phone ? String(d.phone) : undefined,
    partySize: typeof d.partySize === "number" ? d.partySize : 1,
    date: String(d.date ?? ""),
    time: String(d.time ?? ""),
    status: (d.status ?? "pending") as Booking["status"],
    statusToken: String(d.statusToken ?? ""),
    note: d.note ? String(d.note) : undefined,
    createdAt: String(d.createdAt ?? ""),
    decidedAt: d.decidedAt ? String(d.decidedAt) : undefined,
  };
}

/** pending + approved counts per HH:mm for one business + date. */
export async function takenBySlot(
  db: Firestore,
  businessId: string,
  date: string
): Promise<Record<string, number>> {
  const snap = await db
    .collection("bookings")
    .where("businessId", "==", businessId)
    .where("date", "==", date)
    .where("status", "in", ["pending", "approved"])
    .get();
  const out: Record<string, number> = {};
  for (const d of snap.docs) {
    const t = String(d.data().time ?? "");
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

/** Creates a pending booking; capacity re-checked inside the transaction so
    two customers can't both take the last spot. */
export async function createBooking(
  db: Firestore,
  business: BookingBusiness,
  input: BookingRequestInput
): Promise<
  { ok: true; booking: Booking } | { ok: false; error: string; status: number }
> {
  const ref = db.collection("bookings").doc();
  try {
    const booking = await db.runTransaction(async (t) => {
      const taken = await t.get(
        db
          .collection("bookings")
          .where("businessId", "==", business.id)
          .where("date", "==", input.date)
          .where("time", "==", input.time)
          .where("status", "in", ["pending", "approved"])
      );
      if (taken.size >= business.settings.capacityPerSlot) {
        throw new Error("SLOT_FULL");
      }
      const data = {
        businessId: business.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        partySize: input.partySize,
        date: input.date,
        time: input.time,
        note: input.note || null,
        status: "pending",
        statusToken: newStatusToken(),
        createdAt: new Date().toISOString(),
        decidedAt: null,
      };
      t.create(ref, data);
      return data;
    });
    return {
      ok: true,
      booking: {
        id: ref.id,
        businessId: booking.businessId,
        name: booking.name,
        email: booking.email,
        phone: booking.phone ?? undefined,
        partySize: booking.partySize,
        date: booking.date,
        time: booking.time,
        status: "pending",
        statusToken: booking.statusToken,
        note: booking.note ?? undefined,
        createdAt: booking.createdAt,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return {
        ok: false,
        error: "That slot just filled up - please pick another time.",
        status: 409,
      };
    }
    throw err;
  }
}

/** Approve/deny a pending booking. On approve, approved-count is re-checked
    against current capacity (the owner may have lowered it). */
export async function decideBooking(
  db: Firestore,
  businessId: string,
  bookingId: string,
  decision: "approved" | "denied"
): Promise<
  { ok: true; booking: Booking } | { ok: false; error: string; status: number }
> {
  const ref = db.collection("bookings").doc(bookingId);
  try {
    const decided = await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      const d = doc.data();
      if (!doc.exists || d?.businessId !== businessId) throw new Error("NOT_FOUND");
      if (d?.status !== "pending") throw new Error("ALREADY_DECIDED");
      if (decision === "approved") {
        const [approved, bizDoc] = await Promise.all([
          t.get(
            db
              .collection("bookings")
              .where("businessId", "==", businessId)
              .where("date", "==", d.date)
              .where("time", "==", d.time)
              .where("status", "==", "approved")
          ),
          t.get(db.collection("lunaPartners").doc(businessId)),
        ]);
        const cap = parseBookingSettings(bizDoc.data()?.booking).capacityPerSlot;
        if (approved.size >= cap) throw new Error("SLOT_FULL");
      }
      const decidedAt = new Date().toISOString();
      t.update(ref, { status: decision, decidedAt });
      return { doc, decidedAt };
    });
    const booking = docToBooking(decided.doc);
    booking.status = decision;
    booking.decidedAt = decided.decidedAt;
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Booking not found.", status: 404 };
    }
    if (err instanceof Error && err.message === "ALREADY_DECIDED") {
      return { ok: false, error: "This booking was already decided.", status: 409 };
    }
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return {
        ok: false,
        error: "That slot already has a full set of approved bookings.",
        status: 409,
      };
    }
    throw err;
  }
}

export async function listBookings(
  db: Firestore,
  businessId: string
): Promise<Booking[]> {
  const snap = await db
    .collection("bookings")
    .where("businessId", "==", businessId)
    .get();
  // Sorted in memory to avoid a composite index; newest requests first.
  return snap.docs
    .map(docToBooking)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 500);
}

export async function findBookingByToken(
  db: Firestore,
  token: string
): Promise<Booking | null> {
  if (!token || token.length < 20) return null;
  const snap = await db
    .collection("bookings")
    .where("statusToken", "==", token)
    .limit(1)
    .get();
  return snap.empty ? null : docToBooking(snap.docs[0]);
}
