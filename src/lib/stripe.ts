import Stripe from "stripe";

/* Server-side Stripe client. Returns null until STRIPE_SECRET_KEY lands in
   .env - API routes translate that into a friendly 503 so the UI can show
   "add your keys" instead of crashing. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const stripeNotConfigured = {
  error:
    "Stripe isn't configured yet - add STRIPE_SECRET_KEY (and the price IDs) to .env, then restart the server.",
};

/** Map plan ids to Stripe Price IDs supplied via env. */
export function priceIdForPlan(plan: string): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[plan];
}

/** One-time $2,000 initiation fee (a non-recurring Stripe Price), added to
    the first invoice of every self-serve subscription. */
export function initiationFeePriceId(): string | undefined {
  return process.env.STRIPE_PRICE_INITIATION;
}
