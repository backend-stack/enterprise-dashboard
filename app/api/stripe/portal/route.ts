import { NextResponse } from "next/server";
import { getStripe, stripeNotConfigured } from "@/lib/stripe";

/* Opens the Stripe customer billing portal. Requires STRIPE_SECRET_KEY and,
   once real customers exist, a customer id looked up from the signed-in
   user's record (STRIPE_DEMO_CUSTOMER_ID works for testing). */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(stripeNotConfigured, { status: 503 });

  const customer = process.env.STRIPE_DEMO_CUSTOMER_ID;
  if (!customer) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer to open the portal for yet — set STRIPE_DEMO_CUSTOMER_ID or wire customer lookup to your user records.",
      },
      { status: 400 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${origin}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
