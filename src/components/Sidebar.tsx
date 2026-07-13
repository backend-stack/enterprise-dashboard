"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  TrendingUp,
  Store,
  Footprints,
  Users,
  CreditCard,
  Settings,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

const SIDEBAR_COLLAPSED_KEY = "dash:sidebarCollapsed";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  badge?: number;
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: 3 },
  { label: "iMessage Agent", href: "/dashboard/imessage", icon: MessageCircle },
  { label: "Live Assistant", href: "/dashboard/assistant", icon: Radio },
  { label: "Conversions", href: "/dashboard/conversions", icon: TrendingUp },
  { label: "Store Traffic", href: "/dashboard/store", icon: Footprints },
  { label: "Vendors", href: "/dashboard/vendors", icon: Store },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

/* Brand mark — a bolt glyph on an ink tile + wordmark. */
function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const tile = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--ad-ink)] shadow-[var(--ad-shadow-card)]">
      <Zap size={18} className="text-white" fill="currentColor" strokeWidth={0} />
    </span>
  );
  if (collapsed) return <div className="flex justify-center px-0">{tile}</div>;
  return (
    <div className="flex items-center gap-3 px-1">
      {tile}
      <div className="flex flex-col">
        <span className="ad-display text-[17px] font-semibold leading-tight text-[var(--ad-ink)]">
          Pulse
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ad-muted)]">
          Enterprise
        </span>
      </div>
    </div>
  );
}

/* Brand + nav + help — shared between the desktop rail and mobile drawer. */
function SidebarPanel({
  pathname,
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rowBase = `group relative flex items-center rounded-xl text-[14px] transition-all duration-200 ${
    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3.5 py-2.5"
  }`;
  const activeCls =
    "bg-[var(--ad-navy)] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(35,61,77,0.75)]";
  const idleCls =
    "font-medium text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]";

  return (
    <>
      <div
        className={`flex items-center pb-5 ${collapsed ? "flex-col gap-3 px-2" : "justify-between px-4"}`}
      >
        <BrandMark collapsed={collapsed} />
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        ) : null}
      </div>

      <div className={`mb-4 h-px bg-[var(--ad-line)] ${collapsed ? "mx-2" : "mx-4"}`} />

      <nav
        className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:thin] ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {collapsed ? null : (
          <p className="mb-1 px-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ad-muted)]">
            Menu
          </p>
        )}
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={`${rowBase} ${active ? activeCls : idleCls}`}
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.2 : 1.8}
                className={
                  active
                    ? "text-white"
                    : "text-[var(--ad-muted)] transition-colors group-hover:text-[var(--ad-ink-soft)]"
                }
              />
              {collapsed ? null : <span className="flex-1">{label}</span>}
              {badge ? (
                collapsed ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--ad-orange)]" />
                ) : (
                  <span
                    className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-[var(--ad-orange)] text-white"
                    }`}
                  >
                    {badge}
                  </span>
                )
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto pt-4 ${collapsed ? "px-2" : "px-3"}`}>
        <div className="mx-1 mb-3 h-px bg-[var(--ad-line)]" />
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          title={collapsed ? "Help & support" : undefined}
          className={`${rowBase} ${idleCls}`}
        >
          <LifeBuoy
            size={19}
            strokeWidth={1.8}
            className="text-[var(--ad-muted)] transition-colors group-hover:text-[var(--ad-ink-soft)]"
          />
          {collapsed ? null : <span>Help & support</span>}
        </Link>
      </div>
    </>
  );
}

/* The nav rail. On `lg+` a static column; below `lg` a slide-over drawer. */
export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Close the mobile drawer on navigation so it never lingers over a new page.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Desktop: static rail — collapses to an icon-only column. */}
      <aside
        className={`hidden shrink-0 flex-col rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] py-6 shadow-[var(--ad-shadow-card)] transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        <SidebarPanel
          pathname={pathname}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </aside>

      {/* Mobile: slide-over drawer + scrim */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={onClose}
          className={`absolute inset-0 bg-[rgba(20,21,26,0.4)] backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[270px] max-w-[82%] flex-col border-r border-[var(--ad-line)] bg-[var(--ad-paper)] py-6 shadow-[var(--ad-shadow-float)] transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarPanel pathname={pathname} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
