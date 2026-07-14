import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncInvoicesFromStripe, storeInvoice, toStoredInvoice } from "@/lib/invoices";

export const runtime = "nodejs";

/* Stripe webhook receiver - verifies the signature with
   STRIPE_WEBHOOK_SECRET, then mirrors billing state into Firestore:

   - checkout.session.completed → saves stripeCustomerId (+ planChosen) on
     the partner profile and backfills that customer's invoices, so the
     first invoice is stored even if invoice.paid raced ahead of us.
   - invoice.paid / invoice.payment_failed → upserts the invoice (with its
     Stripe-hosted PDF link) under lunaPartners/{id}/invoices. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const db = getAdminDb();

  switch (event.type) {
    case "checkout.session.completed": {
      if (!db) break;
      const session = event.data.object;
      const partnerId = session.client_reference_id ?? session.metadata?.partnerId;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!partnerId || !customerId) break;

      const plan = session.metadata?.plan;
      await db
        .collection("lunaPartners")
        .doc(partnerId)
        .set(
          {
            stripeCustomerId: customerId,
            ...(plan ? { planChosen: plan } : {}),
          },
          { merge: true }
        );
      // Backfill: the first invoice.paid may have arrived before the
      // customer id was linked to the profile.
      await syncInvoicesFromStripe(db, partnerId, stripe, customerId).catch(
        () => undefined
      );
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      if (!db) break;
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const snap = await db
        .collection("lunaPartners")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();
      const partner = snap.docs[0];
      // Unknown customer: checkout.session.completed hasn't landed yet;
      // its backfill will pick this invoice up.
      if (!partner) break;

      await storeInvoice(db, partner.id, toStoredInvoice(invoice));
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
