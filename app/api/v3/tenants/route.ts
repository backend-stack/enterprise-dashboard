import { NextResponse } from "next/server";
import { listTenants } from "@/lib/linq-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /v3/tenants - the dummy tenant accounts available in the sandbox. */
export async function GET() {
  return NextResponse.json({ tenants: listTenants() });
}
