"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase";

/* App-wide auth state.

   With Firebase keys present this is a thin wrapper over firebase/auth.
   Without keys (demo mode) every visitor is treated as a signed-in demo
   account so the whole dashboard is browsable UI-first. */

export interface DashUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  demo: boolean;
}

/** Business profile linked to the account (from `lunaPartners`). */
export interface BusinessProfile {
  id: string;
  businessName: string;
  approved: boolean;
  venueCount: number;
  plan: string | null;
  stripeConnected: boolean;
}

interface AuthContextValue {
  user: DashUser | null;
  business: BusinessProfile | null;
  loading: boolean;
  demoMode: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Get a fresh ID token for calling authenticated API routes. */
  getToken: () => Promise<string | null>;
  /** Re-fetch the business profile (e.g. right after registering one). */
  refreshBusiness: () => Promise<void>;
}

const DEMO_USER: DashUser = {
  uid: "demo",
  name: "Avery Stone",
  email: "avery@acme.co",
  photoURL: null,
  demo: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toDashUser(u: User): DashUser {
  return {
    uid: u.uid,
    name: u.displayName || u.email?.split("@")[0] || "Account",
    email: u.email || "",
    photoURL: u.photoURL,
    demo: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(
    firebaseEnabled ? null : DEMO_USER
  );
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  const getToken = async (): Promise<string | null> => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  };

  const refreshBusiness = async () => {
    const token = await getToken();
    if (!token) {
      setBusiness(null);
      return;
    }
    try {
      const res = await fetch("/api/business/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBusiness(res.ok ? (data.business ?? null) : null);
    } catch {
      setBusiness(null);
    }
  };

  useEffect(() => {
    if (!firebaseEnabled) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? toDashUser(u) : null);
      setLoading(false);
      if (u) void refreshBusiness();
      else setBusiness(null);
    });
    // refreshBusiness is stable in practice (no deps beyond firebase auth).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireAuth = () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error(
        "Firebase is not configured yet — add NEXT_PUBLIC_FIREBASE_* keys to .env"
      );
    }
    return auth;
  };

  const value: AuthContextValue = {
    user,
    business,
    loading,
    demoMode: !firebaseEnabled,
    getToken,
    refreshBusiness,
    signInEmail: async (email, password) => {
      await signInWithEmailAndPassword(requireAuth(), email, password);
    },
    signUpEmail: async (name, email, password) => {
      const cred = await createUserWithEmailAndPassword(
        requireAuth(),
        email,
        password
      );
      if (name) await updateProfile(cred.user, { displayName: name });
    },
    signInGoogle: async () => {
      await signInWithPopup(requireAuth(), new GoogleAuthProvider());
    },
    signOut: async () => {
      if (firebaseEnabled) await fbSignOut(requireAuth());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
