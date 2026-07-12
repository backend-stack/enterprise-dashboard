/* Sample analytics data — stands in for Firestore / Stripe / POS feeds while
   the dashboard is reviewed UI-first. Every page reads from here so swapping
   in live data later is a single-file change. */

export interface DayPoint {
  date: string; // YYYY-MM-DD
  label: string; // Mon, Tue …
  messages: number;
  conversions: number;
  visitors: number;
  revenue: number; // cents
}

export const WEEK: DayPoint[] = [
  { date: "2026-07-06", label: "Mon", messages: 1642, conversions: 118, visitors: 1130, revenue: 512400 },
  { date: "2026-07-07", label: "Tue", messages: 1489, conversions: 96, visitors: 1042, revenue: 448200 },
  { date: "2026-07-08", label: "Wed", messages: 1811, conversions: 141, visitors: 1287, revenue: 603900 },
  { date: "2026-07-09", label: "Thu", messages: 1730, conversions: 133, visitors: 1214, revenue: 571100 },
  { date: "2026-07-10", label: "Fri", messages: 2094, conversions: 187, visitors: 1546, revenue: 782500 },
  { date: "2026-07-11", label: "Sat", messages: 2361, conversions: 224, visitors: 1893, revenue: 918700 },
  { date: "2026-07-12", label: "Sun", messages: 1355, conversions: 107, visitors: 802, revenue: 390200 },
];

export const TOTALS = {
  messages: WEEK.reduce((s, d) => s + d.messages, 0),
  conversions: WEEK.reduce((s, d) => s + d.conversions, 0),
  visitors: WEEK.reduce((s, d) => s + d.visitors, 0),
  revenue: WEEK.reduce((s, d) => s + d.revenue, 0),
};

export const DELTAS = {
  messages: 12.4,
  conversions: 8.1,
  visitors: 5.6,
  revenue: 14.9,
};

/* Store foot traffic by hour (today). */
export interface HourPoint {
  label: string;
  visitors: number;
  walkIns: number; // entered after seeing a campaign / message
}

export const HOURS: HourPoint[] = [
  { label: "9a", visitors: 42, walkIns: 8 },
  { label: "10a", visitors: 74, walkIns: 16 },
  { label: "11a", visitors: 103, walkIns: 27 },
  { label: "12p", visitors: 156, walkIns: 44 },
  { label: "1p", visitors: 148, walkIns: 39 },
  { label: "2p", visitors: 117, walkIns: 25 },
  { label: "3p", visitors: 96, walkIns: 21 },
  { label: "4p", visitors: 121, walkIns: 33 },
  { label: "5p", visitors: 167, walkIns: 51 },
  { label: "6p", visitors: 189, walkIns: 62 },
  { label: "7p", visitors: 143, walkIns: 40 },
  { label: "8p", visitors: 78, walkIns: 17 },
];

/* Conversion funnel — message → store visit → purchase. */
export interface FunnelStage {
  label: string;
  value: number;
}

export const FUNNEL: FunnelStage[] = [
  { label: "Messages delivered", value: 12482 },
  { label: "Opened", value: 8916 },
  { label: "Clicked / replied", value: 4207 },
  { label: "Visited store", value: 2318 },
  { label: "Purchased", value: 1006 },
];

/* Store locations. */
export interface StoreLocation {
  id: string;
  name: string;
  city: string;
  visitors: number;
  conversions: number;
  revenue: number; // cents
  trend: number; // % week over week
}

export const LOCATIONS: StoreLocation[] = [
  { id: "st-01", name: "Flagship — 5th Ave", city: "New York, NY", visitors: 2841, conversions: 402, revenue: 1428800, trend: 11.2 },
  { id: "st-02", name: "SoMa District", city: "San Francisco, CA", visitors: 1988, conversions: 261, revenue: 972300, trend: 6.4 },
  { id: "st-03", name: "Magnificent Mile", city: "Chicago, IL", visitors: 1642, conversions: 199, revenue: 745900, trend: -2.1 },
  { id: "st-04", name: "Buckhead Village", city: "Atlanta, GA", visitors: 1247, conversions: 168, revenue: 588400, trend: 4.8 },
  { id: "st-05", name: "South Congress", city: "Austin, TX", visitors: 1196, conversions: 176, revenue: 491600, trend: 9.3 },
];

/* Recent conversations (messages page). */
export interface Conversation {
  id: string;
  customer: string;
  channel: "SMS" | "WhatsApp" | "Email" | "In-app";
  preview: string;
  time: string;
  status: "replied" | "open" | "converted";
}

export const CONVERSATIONS: Conversation[] = [
  { id: "c-01", customer: "Maya Delgado", channel: "SMS", preview: "Is the summer line in-store at 5th Ave yet?", time: "2m ago", status: "open" },
  { id: "c-02", customer: "Jordan Lee", channel: "WhatsApp", preview: "Thanks! Just picked up the jacket — love it.", time: "18m ago", status: "converted" },
  { id: "c-03", customer: "Priya Raman", channel: "In-app", preview: "Can I reserve a fitting-room slot for 6pm?", time: "41m ago", status: "replied" },
  { id: "c-04", customer: "Sam Okafor", channel: "Email", preview: "Does the loyalty discount stack with the promo?", time: "1h ago", status: "open" },
  { id: "c-05", customer: "Elena Petrova", channel: "SMS", preview: "Reserved! See you Saturday at the SoMa store.", time: "2h ago", status: "converted" },
  { id: "c-06", customer: "Marcus Webb", channel: "WhatsApp", preview: "What time do you close on Sundays?", time: "3h ago", status: "replied" },
];

/* Customers table. */
export interface Customer {
  id: string;
  name: string;
  email: string;
  segment: "VIP" | "Repeat" | "New";
  visits: number;
  spend: number; // cents
  lastSeen: string;
}

export const CUSTOMERS: Customer[] = [
  { id: "u-01", name: "Maya Delgado", email: "maya@example.com", segment: "VIP", visits: 24, spend: 412600, lastSeen: "Today" },
  { id: "u-02", name: "Jordan Lee", email: "jordan@example.com", segment: "Repeat", visits: 11, spend: 168900, lastSeen: "Today" },
  { id: "u-03", name: "Priya Raman", email: "priya@example.com", segment: "VIP", visits: 31, spend: 587200, lastSeen: "Yesterday" },
  { id: "u-04", name: "Sam Okafor", email: "sam@example.com", segment: "New", visits: 2, spend: 21800, lastSeen: "Yesterday" },
  { id: "u-05", name: "Elena Petrova", email: "elena@example.com", segment: "Repeat", visits: 8, spend: 96400, lastSeen: "Jul 10" },
  { id: "u-06", name: "Marcus Webb", email: "marcus@example.com", segment: "New", visits: 1, spend: 7900, lastSeen: "Jul 9" },
  { id: "u-07", name: "Aisha Bello", email: "aisha@example.com", segment: "VIP", visits: 19, spend: 342100, lastSeen: "Jul 9" },
];

/* Recent payments (overview + billing). */
export interface Payment {
  id: string;
  customer: string;
  amount: number; // cents
  method: string;
  status: "paid" | "pending" | "refunded";
  date: string;
}

export const PAYMENTS: Payment[] = [
  { id: "pay-9821", customer: "Priya Raman", amount: 32900, method: "Visa •• 4242", status: "paid", date: "Today, 4:12 PM" },
  { id: "pay-9820", customer: "Jordan Lee", amount: 18400, method: "Apple Pay", status: "paid", date: "Today, 2:03 PM" },
  { id: "pay-9819", customer: "Maya Delgado", amount: 54100, method: "Amex •• 1005", status: "pending", date: "Today, 11:47 AM" },
  { id: "pay-9818", customer: "Elena Petrova", amount: 9600, method: "Visa •• 8210", status: "paid", date: "Yesterday" },
  { id: "pay-9817", customer: "Marcus Webb", amount: 7900, method: "Mastercard •• 3377", status: "refunded", date: "Yesterday" },
];

/* Activity feed. */
export interface ActivityItem {
  id: string;
  text: string;
  detail: string;
  time: string;
  kind: "message" | "conversion" | "visit" | "billing";
}

export const ACTIVITY: ActivityItem[] = [
  { id: "a-01", text: "Campaign “Summer Drop” sent", detail: "2,180 messages · SMS + WhatsApp", time: "12m ago", kind: "message" },
  { id: "a-02", text: "Jordan Lee converted", detail: "$184.00 · Flagship — 5th Ave", time: "2h ago", kind: "conversion" },
  { id: "a-03", text: "Foot-traffic spike detected", detail: "+38% vs. usual · SoMa District", time: "3h ago", kind: "visit" },
  { id: "a-04", text: "Invoice paid", detail: "Growth plan · $299.00", time: "6h ago", kind: "billing" },
  { id: "a-05", text: "Campaign “VIP Preview” scheduled", detail: "840 recipients · Saturday 10 AM", time: "8h ago", kind: "message" },
];

/* Billing plans. */
export interface Plan {
  id: string;
  name: string;
  price: number; // cents / month
  blurb: string;
  features: string[];
  current?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 9900,
    blurb: "For a single storefront getting going.",
    features: ["1 store location", "5,000 messages / mo", "Basic analytics", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 29900,
    blurb: "For growing teams with multiple locations.",
    features: ["Up to 10 locations", "50,000 messages / mo", "Conversion funnels", "Priority support"],
    current: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99900,
    blurb: "Advanced controls, SSO and dedicated support.",
    features: ["Unlimited locations", "Unlimited messages", "Custom reports & API", "Dedicated CSM"],
  },
];

export interface Invoice {
  id: string;
  period: string;
  amount: number;
  status: "paid" | "due";
}

export const INVOICES: Invoice[] = [
  { id: "INV-2026-007", period: "Jul 2026", amount: 29900, status: "due" },
  { id: "INV-2026-006", period: "Jun 2026", amount: 29900, status: "paid" },
  { id: "INV-2026-005", period: "May 2026", amount: 29900, status: "paid" },
  { id: "INV-2026-004", period: "Apr 2026", amount: 29900, status: "paid" },
];
