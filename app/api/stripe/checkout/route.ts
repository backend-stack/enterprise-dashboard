import { NextResponse } from "next/server";
import { getStripe, initiationFeePriceId, priceIdForPlan, stripeNotConfigured } from "@/lib/stripe";

/* Creates a Stripe Checkout session for a subscription upgrade.
   Requires STRIPE_SECRET_KEY + STRIPE_PRICE_* env vars. The one-time
   initiation fee (STRIPE_PRICE_INITIATION) rides on the first invoice. */
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

  const initiation = initiationFeePriceId();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      { price, quantity: 1 },
      // One-time (non-recurring) price — billed once with the first invoice.
      ...(initiation ? [{ price: initiation, quantity: 1 }] : []),
    ],
    success_url: `${origin}/dashboard/billing?status=success`,
    cancel_url: `${origin}/dashboard/billing?status=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
