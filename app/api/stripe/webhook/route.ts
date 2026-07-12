import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

/* Stripe webhook receiver — verifies the signature with
   STRIPE_WEBHOOK_SECRET and acknowledges subscription lifecycle events.
   Extend the switch below to sync subscription state to your database. */
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
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      // TODO: persist subscription state for the matching user.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
