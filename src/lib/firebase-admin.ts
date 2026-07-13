import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/* Server-side Firestore via the Admin SDK - used by the Vendors and iMessage
   pages to read live data. Credentials come from the FIREBASE_* (non-public)
   env vars; returns null until they're set so pages can render a friendly
   "not configured" state instead of crashing. */

function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        // .env stores the key single-line with literal \n escapes.
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    })
  );
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

/** Platform admins: an `admin/{uid}` doc or `users/{uid}.isAdmin === true`.
    Only these accounts may see platform-wide (cross-business) data. */
export async function isPlatformAdmin(uid: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    const [adminDoc, userDoc] = await Promise.all([
      db.collection("admin").doc(uid).get(),
      db.collection("users").doc(uid).get(),
    ]);
    return adminDoc.exists || userDoc.data()?.isAdmin === true;
  } catch {
    return false;
  }
}

/** Verifies a client ID token from an Authorization: Bearer header.
    Returns the uid, or null when the token is missing/invalid. */
export async function verifyBearer(req: Request): Promise<string | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Firestore Timestamp | ISO string | epoch seconds → display-ready ISO string. */
export function toIso(v: unknown): string {
  if (!v) return "";
  const t = v as { toDate?: () => Date };
  if (typeof t?.toDate === "function") return t.toDate().toISOString();
  if (typeof v === "string") return v;
  if (typeof v === "number") return new Date(v * 1000).toISOString();
  return "";
}
