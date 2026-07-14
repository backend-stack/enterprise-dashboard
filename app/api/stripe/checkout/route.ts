import { NextResponse } from "next/server";
import { getStripe, initiationFeePriceId, priceIdForPlan, stripeNotConfigured } from "@/lib/stripe";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";

/* Creates a Stripe Checkout session for a subscription upgrade.
   Requires STRIPE_SECRET_KEY + STRIPE_PRICE_* env vars. The one-time
   initiation fee (STRIPE_PRICE_INITIATION) rides on the first invoice.

   The session is tied back to the signed-in partner (client_reference_id +
   metadata) so the webhook can store the Stripe customer and mirror every
   invoice onto the profile. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(stripeNotConfigured, { status: 503 });

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  const price = plan ? priceIdForPlan(plan) : undefined;
  if (!price) {
    return NextResponse.json(
      { error: `No Stripe price configured for plan "${plan}".` },
      { status: 400 }
    );
  }

  // Resolve the caller's partner profile (best effort - checkout still works
  // in keyless demo setups, it just isn't linked to a profile).
  let partnerId: string | undefined;
  let customerId: string | undefined;
  let customerEmail: string | undefined;
  const db = getAdminDb();
  const uid = await verifyBearer(req);
  if (db && uid) {
    const snap = await db
      .collection("lunaPartners")
      .where("firebaseUid", "==", uid)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (doc) {
      partnerId = doc.id;
      const d = doc.data();
      if (typeof d.stripeCustomerId === "string") customerId = d.stripeCustomerId;
      else if (typeof d.email === "string") customerEmail = d.email;
    }
  }

  const initiation = initiationFeePriceId();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      { price, quantity: 1 },
      // One-time (non-recurring) price - billed once with the first invoice.
      ...(initiation ? [{ price: initiation, quantity: 1 }] : []),
    ],
    ...(customerId ? { customer: customerId } : {}),
    ...(!customerId && customerEmail ? { customer_email: customerEmail } : {}),
    ...(partnerId
      ? {
          client_reference_id: partnerId,
          metadata: { partnerId, plan: plan ?? "" },
          subscription_data: { metadata: { partnerId } },
        }
      : {}),
    success_url: `${origin}/dashboard/billing?status=success`,
    cancel_url: `${origin}/dashboard/billing?status=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
