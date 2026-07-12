import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Returns the signed-in user's business profile from `lunaPartners`,
   or { business: null } when the account isn't a business. */
export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ business: null });

  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const snap = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();

  if (snap.empty) return NextResponse.json({ business: null });

  const doc = snap.docs[0];
  const d = doc.data();
  return NextResponse.json({
    business: {
      id: doc.id,
      businessName: typeof d.businessName === "string" ? d.businessName : "",
      approved: d.isApproved === true,
      venueCount:
        d.venueIds && typeof d.venueIds === "object"
          ? Object.keys(d.venueIds).length
          : 0,
      plan: typeof d.planChosen === "string" ? d.planChosen : null,
      stripeConnected: Boolean(d.stripeConnectedAccountId),
    },
  });
}
