import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/* Firebase client bootstrap.

   All config comes from NEXT_PUBLIC_FIREBASE_* env vars. Until keys are added
   to .env the app runs in "demo mode": `firebaseEnabled` is false, auth is
   skipped entirely, and the dashboard renders with sample data so the UI can
   be reviewed without any credentials. */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}
