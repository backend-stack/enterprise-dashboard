import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { decideBooking, getOwnedBusiness } from "@/lib/booking-server";
import { sendBookingEmail } from "@/lib/email";

export const runtime = "nodejs";

/* Owner: approve or deny a pending booking, then email the customer. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let decision: unknown;
  try {
    decision = (await req.json()).decision;
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "denied") {
    return NextResponse.json(
      { error: 'decision must be "approved" or "denied".' },
      { status: 400 }
    );
  }

  const { id } = await params;
  const result = await decideBooking(db, business.id, id, decision);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const statusUrl = `${new URL(req.url).origin}/book/status/${result.booking.statusToken}`;
  await sendBookingEmail(decision, result.booking, business.businessName, statusUrl);

  return NextResponse.json({ ok: true, booking: result.booking });
}
