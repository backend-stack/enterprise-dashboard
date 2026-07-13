import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Server-side proxy to the Contextual Intelligence Business Dashboard API.

   The CI service token grants access to ALL tenants, so it must never reach
   the browser — the dashboard client calls this route with the signed-in
   user's Firebase ID token, and we forward the request with the service
   token attached. Only the documented read-only GET paths are allowed. */

const ALLOWED = /^tenants(\/[\w-]+\/(data|stats|customers))?$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const base = process.env.CI_API_BASE_URL?.replace(/\/$/, "");
  const token = process.env.CI_API_TOKEN;
  if (!base || !token) {
    return NextResponse.json(
      { error: "not_configured", message: "Set CI_API_BASE_URL and CI_API_TOKEN in .env." },
      { status: 503 }
    );
  }

  // Require a signed-in dashboard user whenever Firebase auth is active.
  if (process.env.FIREBASE_PROJECT_ID) {
    const uid = await verifyBearer(req);
    if (!uid) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  }

  const { path } = await params;
  const joined = (path ?? []).join("/");
  if (!ALLOWED.test(joined)) {
    return NextResponse.json({ error: "Unknown path." }, { status: 404 });
  }

  try {
    const upstream = await fetch(`${base}/api/v1/${joined}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the CI API." },
      { status: 502 }
    );
  }
}
