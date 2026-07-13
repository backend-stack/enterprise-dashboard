"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";

/* The dashboard frame - enterprise layout: full-height sidebar flush left,
   slim breadcrumb topbar, and content cards on a clean white canvas.

   Also the auth gate: with Firebase configured, unauthenticated visitors are
   sent to /signin; in demo mode (no keys yet) everyone passes through. */
export function Shell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { user, business, loading, demoMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The Messages inbox is a full-height workspace; keep the approval notice
  // off that tab so it doesn't crowd the conversation view.
  const hideApprovalNotice = pathname.startsWith("/dashboard/chats");

  useEffect(() => {
    if (!demoMode && !loading && !user) router.replace("/login");
  }, [demoMode, loading, user, router]);

  if (!demoMode && (loading || !user)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--ad-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--ad-cream)] lg:gap-4 lg:p-4">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:gap-4">
        <Topbar onMenuClick={() => setNavOpen(true)} />

        <main className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--ad-paper)] lg:rounded-[var(--ad-radius-lg)]">
          <div className="relative px-4 py-6 sm:px-8 sm:py-8">
            {business && !business.approved && !hideApprovalNotice ? (
              <div
                className="mb-6 flex items-center gap-3 rounded-[var(--ad-radius-sm)] px-4 py-3.5 text-sm text-white shadow-[0_10px_24px_-12px_rgba(35,61,77,0.7)]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ad-slate) 0%, var(--ad-slate-deep) 100%)",
                }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Clock size={14} />
                </span>
                <span className="leading-snug">
                  <strong className="font-semibold">{business.businessName}</strong>{" "}
                  is pending approval - our team reviews new business profiles
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
