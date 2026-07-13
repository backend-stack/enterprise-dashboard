"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Footprints,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ACTIVITY } from "@/lib/mock-data";

/* Slim breadcrumb topbar - Dashboard / <Section> on the left, a working
   icon cluster on the right: Calendar (month popover), Notifications
   (activity panel, badge clears on read), Bookmark (saves the current
   page, localStorage), and Share (copies the URL). Search lives in the
   sidebar, like the reference. */

const SECTION_LABELS: Record<string, string> = {
  messages: "Messages",
  imessage: "iMessage Agent",
  support: "Support",
  conversions: "Conversions",
  store: "Store Traffic",
  vendors: "Vendors",
  customers: "Customers",
  billing: "Billing",
  settings: "Settings",
};

const BOOKMARKS_KEY = "dash:bookmarks";

interface SavedPage {
  path: string;
  label: string;
}

function IconButton({
  label,
  badge,
  active = false,
  onClick,
  children,
}: {
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-[var(--ad-panel)] text-[var(--ad-ink)]"
          : "text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
      }`}
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--ad-negative)] px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/* Anchored dropdown panel; closing on outside clicks is handled by the
   Topbar's document-level pointerdown listener, so every other button in
   the bar stays tappable while a panel is open. */
function Popover({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute right-0 top-11 z-50 w-80 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-paper)] shadow-[var(--ad-shadow-float)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ad-line)] px-4 py-3">
        <p className="text-[13px] font-semibold text-[var(--ad-ink)]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/* Current-month mini calendar with today highlighted. */
function MiniCalendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = new Date();

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const isToday = (day: number) =>
    day === today.getDate() &&
    cursor.getMonth() === today.getMonth() &&
    cursor.getFullYear() === today.getFullYear();

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--ad-ink)]">
          {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}${i}`} className="py-1 text-[10px] font-semibold text-[var(--ad-muted)]">
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`e${i}`} />
          ) : (
            <span
              key={day}
              className={`flex h-8 items-center justify-center rounded-lg text-[12px] ${
                isToday(day)
                  ? "bg-[var(--ad-slate)] font-bold text-white"
                  : "text-[var(--ad-ink-soft)]"
              }`}
            >
              {day}
            </span>
          )
        )}
      </div>
    </div>
  );
}

const KIND_ICON: Record<string, React.ReactNode> = {
  message: <MessageSquare size={14} />,
  conversion: <TrendingUp size={14} />,
  visit: <Footprints size={14} />,
  billing: <CreditCard size={14} />,
};

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { demoMode } = useAuth();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<"calendar" | "notifications" | "bookmarks" | null>(null);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [bookmarks, setBookmarks] = useState<SavedPage[]>([]);
  const loaded = useRef(false);
  const clusterRef = useRef<HTMLDivElement | null>(null);

  // Close any open panel when clicking/tapping outside the icon cluster.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!clusterRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const section = SECTION_LABELS[pathname.split("/")[2] ?? ""];

  // Bookmarks persist per browser.
  useEffect(() => {
    try {
      setBookmarks(JSON.parse(window.localStorage.getItem(BOOKMARKS_KEY) ?? "[]"));
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      /* ignore */
    }
  }, [bookmarks]);

  const bookmarked = bookmarks.some((b) => b.path === pathname);
  const toggleBookmark = () => {
    setBookmarks((prev) =>
      prev.some((b) => b.path === pathname)
        ? prev.filter((b) => b.path !== pathname)
        : [...prev, { path: pathname, label: section ?? "Overview" }]
    );
    setOpen("bookmarks");
  };

  // Close any popover when navigating.
  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const toggle = (panel: "calendar" | "notifications" | "bookmarks") =>
    setOpen((prev) => (prev === panel ? null : panel));

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
          <span className="mr-1 hidden rounded-full bg-[var(--ad-slate-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--ad-slate)] md:block">
            Demo data
          </span>
        ) : null}
        <div ref={clusterRef} className="relative hidden items-center gap-1 sm:flex">
          {/* Calendar popover */}
          <div className="relative">
            <IconButton
              label="Calendar"
              active={open === "calendar"}
              onClick={() => toggle("calendar")}
            >
              <CalendarDays size={16} />
            </IconButton>
            {open === "calendar" ? (
              <Popover title="Calendar">
                <MiniCalendar />
              </Popover>
            ) : null}
          </div>

          {/* Notifications popover */}
          <div className="relative">
            <IconButton
              label="Notifications"
              badge={notificationsRead ? undefined : ACTIVITY.length}
              active={open === "notifications"}
              onClick={() => {
                toggle("notifications");
                setNotificationsRead(true);
              }}
            >
              <Bell size={16} />
            </IconButton>
            {open === "notifications" ? (
              <Popover
                title="Notifications"
                action={
                  <span className="text-[11px] text-[var(--ad-muted)]">
                    {ACTIVITY.length} recent
                  </span>
                }
              >
                <ul className="max-h-80 overflow-y-auto p-2">
                  {ACTIVITY.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--ad-panel-2)]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-panel)] text-[var(--ad-ink)]">
                        {KIND_ICON[a.kind] ?? <Bell size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[var(--ad-ink)]">
                          {a.text}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--ad-muted)]">
                          {a.detail} · {a.time}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Popover>
            ) : null}
          </div>

          {/* Bookmark current page + saved list */}
          <div className="relative">
            <IconButton
              label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
              active={open === "bookmarks"}
              onClick={toggleBookmark}
            >
              <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
            </IconButton>
            {open === "bookmarks" ? (
              <Popover
                title="Saved pages"
                action={
                  <span className="text-[11px] text-[var(--ad-muted)]">
                    {bookmarked ? "Saved" : "Removed"}
                  </span>
                }
              >
                {bookmarks.length ? (
                  <ul className="max-h-64 overflow-y-auto p-2">
                    {bookmarks.map((b) => (
                      <li key={b.path}>
                        <Link
                          href={b.path}
                          onClick={() => setOpen(null)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[var(--ad-ink)] hover:bg-[var(--ad-panel-2)]"
                        >
                          <Bookmark size={13} className="shrink-0 text-[var(--ad-muted)]" />
                          <span className="min-w-0 flex-1 truncate">{b.label}</span>
                          <span className="truncate text-[11px] font-normal text-[var(--ad-muted)]">
                            {b.path.replace("/dashboard", "") || "/"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-5 text-sm text-[var(--ad-muted)]">
                    No saved pages yet - tap the bookmark on any page to pin it here.
                  </p>
                )}
              </Popover>
            ) : null}
          </div>
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
