import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { readStoredInvoices, syncInvoicesFromStripe } from "@/lib/invoices";

export const runtime = "nodejs";

/* The signed-in partner's invoices, newest-first.

   Source of truth is Stripe; every read re-syncs the mirror stored under
   lunaPartners/{id}/invoices so the dashboard keeps its own copy (and keeps
   working from cache if Stripe is briefly unreachable). Each row carries
   the Stripe-hosted PDF link for the Download button. */
export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) {
    // Keyless local review - the page falls back to its demo table.
    return NextResponse.json({ invoices: [], configured: false });
  }

  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const snap = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  const partner = snap.docs[0];
  if (!partner) return NextResponse.json({ invoices: [], configured: true });

  const stripe = getStripe();
  const customerId = partner.data().stripeCustomerId;

  if (stripe && typeof customerId === "string" && customerId) {
    try {
      const invoices = await syncInvoicesFromStripe(db, partner.id, stripe, customerId);
      return NextResponse.json({ invoices, configured: true });
    } catch {
      // fall through to the mirrored copy
    }
  }

  const invoices = await readStoredInvoices(db, partner.id);
  return NextResponse.json({ invoices, configured: true });
}
