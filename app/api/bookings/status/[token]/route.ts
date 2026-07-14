import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { findBookingByToken, getBusinessById } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Public: booking status by unguessable token. Returns a public-safe subset
   only - never email, phone or document ids. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }
  const { token } = await params;
  const booking = await findBookingByToken(db, token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  const business = await getBusinessById(db, booking.businessId);
  return NextResponse.json({
    businessName: business?.businessName ?? "",
    booking: {
      name: booking.name,
      partySize: booking.partySize,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      note: booking.note ?? null,
    },
  });
}
