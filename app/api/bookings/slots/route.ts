import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeSlots } from "@/lib/booking";
import { getBusinessById, nowStr, takenBySlot, todayStr } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Public: available slots for a business + date. Powers /book/[businessId]. */
export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const business = await getBusinessById(db, businessId);
  if (!business || !business.settings.enabled) {
    return NextResponse.json(
      { error: "This business is not accepting bookings." },
      { status: 404 }
    );
  }

  const slots = date
    ? computeSlots(
        business.settings,
        date,
        todayStr(),
        await takenBySlot(db, businessId, date),
        nowStr()
      )
    : [];

  return NextResponse.json({
    business: { id: business.id, name: business.businessName },
    settings: {
      slotMinutes: business.settings.slotMinutes,
      daysOpen: business.settings.daysOpen,
    },
    slots,
  });
}
