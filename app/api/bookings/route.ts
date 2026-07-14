import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { getOwnedBusiness, listBookings } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Owner: everything the dashboard Bookings page needs in one call. */
export async function GET(req: Request) {
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
  const bookings = await listBookings(db, business.id);
  return NextResponse.json({
    business: { id: business.id, name: business.businessName },
    settings: business.settings,
    bookings,
  });
}
