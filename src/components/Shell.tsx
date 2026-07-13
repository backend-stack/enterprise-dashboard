"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";

/* The dashboard frame: sidebar + sticky topbar + scrolling content.

   Also the auth gate: with Firebase configured, unauthenticated visitors are
   sent to /signin; in demo mode (no keys yet) everyone passes through. */
export function Shell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { user, business, loading, demoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!demoMode && !loading && !user) router.replace("/signin");
  }, [demoMode, loading, user, router]);

  if (!demoMode && (loading || !user)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--ad-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] px-4 py-6 shadow-[var(--ad-shadow-card)] sm:px-8 sm:py-8">
          {business && !business.approved ? (
            <div
              className="mb-6 flex items-center gap-3 rounded-[var(--ad-radius-sm)] px-4 py-3.5 text-sm text-white shadow-[0_10px_24px_-12px_rgba(224,97,14,0.7)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--ad-orange) 0%, var(--ad-orange-deep) 100%)",
              }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Clock size={14} />
              </span>
              <span className="leading-snug">
                <strong className="font-semibold">{business.businessName}</strong>{" "}
                is pending approval — our team reviews new business profiles
                within 1–2 business days. You already have full dashboard access.
              </span>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
