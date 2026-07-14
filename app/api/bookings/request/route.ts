import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateBookingRequest } from "@/lib/booking";
import { createBooking, getBusinessById, todayStr } from "@/lib/booking-server";
import { sendBookingEmail } from "@/lib/email";

export const runtime = "nodejs";

/* Public: submit a reservation request. Creates a pending booking (capacity
   checked in a transaction) and emails the customer their status link. */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const businessId = typeof data.businessId === "string" ? data.businessId : "";
  const business = businessId ? await getBusinessById(db, businessId) : null;
  if (!business || !business.settings.enabled) {
    return NextResponse.json(
      { error: "This business is not accepting bookings." },
      { status: 404 }
    );
  }

  const v = validateBookingRequest(data, business.settings, todayStr());
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const result = await createBooking(db, business, v.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const statusUrl = `${new URL(req.url).origin}/book/status/${result.booking.statusToken}`;
  await sendBookingEmail("received", result.booking, business.businessName, statusUrl);

  return NextResponse.json({
    ok: true,
    statusToken: result.booking.statusToken,
    statusUrl,
  });
}
