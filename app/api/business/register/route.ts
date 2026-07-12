import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Creates the business profile for a freshly signed-up account.

   Called right after Firebase email/password signup with the user's ID token.
   Writes a `lunaPartners` doc in the exact shape the existing Luna platform
   uses (same fields as the vendors created via the mobile/web flows), so new
   dashboard signups appear alongside existing vendors everywhere. Also mirrors
   the submission into `partnerApplications` so the existing admin review
   queue picks it up. */

const MAX = { text: 200, message: 2000 };

function str(v: unknown, cap: number): string {
  return typeof v === "string" ? v.trim().slice(0, cap) : "";
}

function numOrNull(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(v.replace(/[^\d.]/g, ""))
        : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server is not configured for Firebase yet." },
      { status: 503 }
    );
  }

  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const businessName = str(data.businessName, MAX.text);
  const email = str(data.email, MAX.text);
  const phone = str(data.phone, MAX.text);
  const address = str(data.address, MAX.text);
  const bookingLink = str(data.bookingLink, MAX.text);
  const message = str(data.message, MAX.message);
  const locations = numOrNull(data.locations);
  const visitorsPerWeek = numOrNull(data.visitorsPerWeek);
  const avgMonthlySpend = numOrNull(data.avgMonthlySpend);

  if (!businessName) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "Business address is required." }, { status: 400 });
  }

  // One business profile per account — re-registering just returns the
  // existing profile instead of duplicating it.
  const existing = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json({ ok: true, id: existing.docs[0].id, existed: true });
  }

  const now = new Date().toISOString();
  const doc = await db.collection("lunaPartners").add({
    businessName,
    email,
    phoneNumber: phone,
    address,
    message,
    bookingLink,
    numOfLocations: locations,
    visitorsPerWeek,
    averageMonthlySpend: avgMonthlySpend,
    price: null,
    planChosen: null,
    isApproved: false,
    isAdmin: false,
    isNewUser: true,
    firebaseUid: uid,
    venueIds: {},
    stripeConnectedAccountId: null,
    createdAt: now,
    updatedAt: now,
    createdVia: "dashboard-signup",
  });

  // Mirror into the existing admin review queue (best-effort).
  try {
    await db.collection("partnerApplications").add({
      businessName,
      email,
      phone,
      locations: locations ?? 1,
      weeklyVisitors: visitorsPerWeek ?? 0,
      avgSpend: avgMonthlySpend ?? 0,
      addressCity: address,
      message,
      status: "new",
      createdVia: "dashboard-signup",
      submittedAt: new Date(),
    });
  } catch (err) {
    console.error("[business/register] application mirror failed:", err);
  }

  return NextResponse.json({ ok: true, id: doc.id });
}
