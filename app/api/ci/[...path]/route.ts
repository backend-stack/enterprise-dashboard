import { NextResponse } from "next/server";
import { getAdminAuth, isPlatformAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Server-side proxy to the Contextual Intelligence Business Dashboard API.

   Auth model (least privilege, fail closed):
   - Every caller must present a valid Firebase ID token. The only exception
     is local development with Firebase entirely unconfigured.
   - Regular users: their OWN ID token is forwarded upstream, so the CI API's
     owner model decides which tenants they can see (403 otherwise). The
     all-tenant service token is never used on their behalf.
   - Platform admins (admin/{uid} doc or users/{uid}.isAdmin): requests are
     forwarded with the service token, granting the full tenant list.
   Only the documented read-only GET paths are allowed. */

const ALLOWED = /^tenants(\/[\w-]+\/(data|stats|customers))?$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const base = process.env.CI_API_BASE_URL?.replace(/\/$/, "");
  const serviceToken = process.env.CI_API_TOKEN;
  if (!base || !serviceToken) {
    return NextResponse.json(
      { error: "not_configured", message: "Set CI_API_BASE_URL and CI_API_TOKEN in .env." },
      { status: 503 }
    );
  }

  const { path } = await params;
  const joined = (path ?? []).join("/");
  if (!ALLOWED.test(joined)) {
    return NextResponse.json({ error: "Unknown path." }, { status: 404 });
  }

  // Fail closed: a valid Firebase ID token is required. The sole carve-out
  // is local development with Firebase entirely unconfigured.
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = getAdminAuth();

  let uid: string | null = null;
  if (auth && idToken) {
    try {
      uid = (await auth.verifyIdToken(idToken)).uid;
    } catch {
      uid = null;
    }
  }

  const devBypass = !auth && process.env.NODE_ENV === "development";
  if (!uid && !devBypass) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Least privilege upstream: admins get the service token; everyone else is
  // proxied with their own ID token so the CI API enforces tenant ownership.
  let upstreamToken = serviceToken;
  if (uid && !(await isPlatformAdmin(uid))) {
    upstreamToken = idToken;
  }

  try {
    const upstream = await fetch(`${base}/api/v1/${joined}`, {
      headers: { Authorization: `Bearer ${upstreamToken}` },
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
