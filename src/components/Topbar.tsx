"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, ChevronRight, LayoutDashboard, Menu, Search, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* Slim breadcrumb topbar — Dashboard / <Section>, global search, alerts and
   a working Share button (copies the current URL). The account block lives
   at the bottom of the sidebar, like the reference design. */

const SECTION_LABELS: Record<string, string> = {
  messages: "Messages",
  imessage: "iMessage Agent",
  assistant: "Live Assistant",
  conversions: "Conversions",
  store: "Store Traffic",
  vendors: "Vendors",
  customers: "Customers",
  billing: "Billing",
  settings: "Settings",
};

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { demoMode } = useAuth();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const section = SECTION_LABELS[pathname.split("/")[2] ?? ""];

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)] lg:hidden"
      >
        <Menu size={17} />
      </button>

      {/* Breadcrumb */}
      <nav className="hidden items-center gap-1.5 text-sm md:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-medium text-[var(--ad-ink-soft)] hover:text-[var(--ad-ink)]"
        >
          <LayoutDashboard size={15} className="text-[var(--ad-muted)]" />
          Dashboard
        </Link>
        {section ? (
          <>
            <ChevronRight size={14} className="text-[var(--ad-muted)]" />
            <span className="font-semibold text-[var(--ad-ink)]">{section}</span>
          </>
        ) : null}
      </nav>

      {/* Search */}
      <label className="relative ml-auto flex h-9 w-full max-w-xs items-center">
        <Search size={15} className="pointer-events-none absolute left-3 text-[var(--ad-muted)]" />
        <input
          type="text"
          placeholder="Search anything…"
          className="h-full w-full rounded-lg border border-[var(--ad-line)] bg-[var(--ad-panel)] pl-9 pr-12 text-[13px] text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
        />
        <kbd className="absolute right-2.5 hidden rounded-md border border-[var(--ad-line)] bg-[var(--ad-paper)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ad-muted)] sm:block">
          ⌘K
        </kbd>
      </label>

      <div className="flex shrink-0 items-center gap-2">
        {demoMode ? (
          <span className="hidden rounded-full bg-[var(--ad-orange-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--ad-orange)] md:block">
            Demo data
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--ad-orange)]" />
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--ad-line)] px-3.5 text-[13px] font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
        >
          {copied ? <Check size={14} className="text-[var(--ad-positive)]" /> : <Share2 size={14} />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    </header>
  );
}
