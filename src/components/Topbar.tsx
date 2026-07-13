"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  LayoutDashboard,
  Mail,
  Menu,
  Share2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* Slim breadcrumb topbar - Dashboard / <Section> on the left, an icon
   cluster with count badges plus a working Share button (copies the current
   URL) on the right. Search lives in the sidebar, like the reference. */

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

function IconButton({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--ad-negative)] px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 sm:gap-4 sm:px-6 lg:rounded-[var(--ad-radius-lg)] lg:border lg:shadow-[var(--ad-shadow-card)]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)] lg:hidden"
      >
        <Menu size={17} />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
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

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        {demoMode ? (
          <span className="mr-1 hidden rounded-full bg-[var(--ad-orange-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--ad-orange)] md:block">
            Demo data
          </span>
        ) : null}
        <div className="hidden items-center gap-1 sm:flex">
          <IconButton label="Inbox" badge={3}>
            <Mail size={16} />
          </IconButton>
          <IconButton label="Calendar">
            <CalendarDays size={16} />
          </IconButton>
          <IconButton label="Notifications" badge={16}>
            <Bell size={16} />
          </IconButton>
          <IconButton label="Saved">
            <Bookmark size={16} />
          </IconButton>
        </div>
        <span className="mx-1 hidden h-5 w-px bg-[var(--ad-line-strong)] sm:block" />
        <button
          type="button"
          onClick={share}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--ad-line)] px-3.5 text-[13px] font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
        >
          {copied ? <Check size={14} className="text-[var(--ad-positive)]" /> : <Share2 size={14} />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    </header>
  );
}
