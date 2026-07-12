import "server-only";
import { getAdminDb, toIso } from "@/lib/firebase-admin";

/* Live vendor data — Luna partners (`lunaPartners`) plus inbound partner
   applications (`partnerApplications`). */

export interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  locations: number | null;
  visitorsPerWeek: number | null;
  avgMonthlySpend: number | null;
  price: number | null;
  venueCount: number;
  approved: boolean;
  isAdmin: boolean;
  stripeConnected: boolean;
  createdAt: string;
}

export interface VendorApplication {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  locations: number;
  weeklyVisitors: number;
  avgSpend: number;
  city: string;
  message: string;
  status: string;
  submittedAt: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function fetchVendors(): Promise<Vendor[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("lunaPartners").limit(200).get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      businessName: str(d.businessName) || "Unknown business",
      email: str(d.email),
      phone: str(d.phoneNumber),
      address: str(d.address),
      locations: numOrNull(d.numOfLocations),
      visitorsPerWeek: numOrNull(d.visitorsPerWeek),
      avgMonthlySpend: numOrNull(d.averageMonthlySpend),
      price: numOrNull(d.price),
      venueCount: d.venueIds && typeof d.venueIds === "object" ? Object.keys(d.venueIds).length : 0,
      approved: d.isApproved === true,
      isAdmin: d.isAdmin === true,
      stripeConnected: Boolean(d.stripeConnectedAccountId),
      createdAt: toIso(d.createdAt),
    };
  });
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export async function fetchVendorApplications(): Promise<VendorApplication[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("partnerApplications").limit(200).get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      businessName: str(d.businessName) || "Unknown business",
      email: str(d.email),
      phone: str(d.phone),
      locations: numOrNull(d.locations) ?? 0,
      weeklyVisitors: numOrNull(d.weeklyVisitors) ?? 0,
      avgSpend: numOrNull(d.avgSpend) ?? 0,
      city: str(d.addressCity),
      message: str(d.message),
      status: str(d.status) || "new",
      submittedAt: toIso(d.submittedAt),
    };
  });
  rows.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return rows;
}
