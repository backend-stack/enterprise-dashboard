import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { parseBookingSettings } from "@/lib/booking";
import { getOwnedBusiness } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Owner: replace the `booking` settings map on the business doc. The body is
   run through parseBookingSettings so junk fields are repaired, not stored. */
export async function PUT(req: Request) {
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
  const business = await getOwnedBusiness(db, uid);
  if (!business) {
    return NextResponse.json({ error: "No business profile." }, { status: 404 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const settings = parseBookingSettings(data);
  await db.collection("lunaPartners").doc(business.id).update({
    booking: settings,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, settings });
}
