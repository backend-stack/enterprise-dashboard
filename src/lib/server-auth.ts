import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, isPlatformAdmin } from "@/lib/firebase-admin";

/* Server-side viewer resolution for dashboard pages.

   The client keeps a `__session` cookie holding the Firebase ID token
   (refreshed by the auth context). Server components verify it here so
   platform-wide data is only ever RENDERED for platform admins - business
   accounts and anonymous requests never receive other tenants' data in the
   HTML/RSC payload. */

export type Viewer =
  | { kind: "user"; uid: string; isAdmin: boolean }
  | { kind: "anonymous" }
  | { kind: "unconfigured" }; // Firebase not set up (local demo) - no real data exists

export async function getViewer(): Promise<Viewer> {
  const auth = getAdminAuth();
  if (!auth) return { kind: "unconfigured" };

  const token = (await cookies()).get("__session")?.value;
  if (!token) return { kind: "anonymous" };

  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      kind: "user",
      uid: decoded.uid,
      isAdmin: await isPlatformAdmin(decoded.uid),
    };
  } catch {
    return { kind: "anonymous" };
  }
}
