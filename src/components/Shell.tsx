"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";

/* The dashboard frame — enterprise layout: full-height sidebar flush left,
   slim breadcrumb topbar, and content cards sitting directly on the cool
   canvas with a soft brand-gradient wash behind the page title.

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
    <div className="flex h-screen overflow-hidden bg-[var(--ad-cream)]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />

        <main className="relative min-h-0 flex-1 overflow-y-auto">
          {/* Soft brand wash behind the page header, like the reference. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-44"
            style={{
              background:
                "linear-gradient(180deg, rgba(254,127,45,0.10) 0%, rgba(35,61,77,0.04) 45%, transparent 100%)",
            }}
          />
          <div className="relative px-4 py-6 sm:px-8 sm:py-8">
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
          </div>
        </main>
      </div>
    </div>
  );
}
