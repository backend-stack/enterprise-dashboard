"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  TrendingUp,
  Store,
  Footprints,
  Users,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";

const SIDEBAR_COLLAPSED_KEY = "dash:sidebarCollapsed";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  badge?: number;
}

/** Platform-wide (cross-business) sections - admins only. */
const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: 3 },
  { label: "iMessage Agent", href: "/dashboard/imessage", icon: MessageCircle },
  { label: "Chats API", href: "/dashboard/chats", icon: MessagesSquare },
  { label: "Conversions", href: "/dashboard/conversions", icon: TrendingUp },
  { label: "Store Traffic", href: "/dashboard/store", icon: Footprints },
  { label: "Vendors", href: "/dashboard/vendors", icon: Store },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

/** What a business account sees - its own data plus what the agent sends. */
const BUSINESS_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "iMessage Agent", href: "/dashboard/imessage", icon: MessageCircle },
  { label: "Chats API", href: "/dashboard/chats", icon: MessagesSquare },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

/* Brand mark - the Contextual Intelligence pixel mark on an ink tile. */
function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const tile = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ad-ink)] shadow-[var(--ad-shadow-card)]">
      <Image
        src="/logo/ci/ci-mark.png"
        alt="Contextual Intelligence"
        width={80}
        height={80}
        className="h-6 w-6 invert"
      />
    </span>
  );
  if (collapsed) return <div className="flex justify-center px-0">{tile}</div>;
  return (
    <div className="flex items-center gap-3 px-1">
      {tile}
      <div className="flex flex-col">
        <span className="ad-display text-[14px] font-semibold leading-tight text-[var(--ad-ink)]">
          Contextual Intelligence
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ad-muted)]">
          for Partners
        </span>
      </div>
    </div>
  );
}

/* Brand + search + nav + upgrade card - shared between rail and drawer. */
function SidebarPanel({
  pathname,
  nav,
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  pathname: string;
  nav: NavItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rowBase = `group relative flex items-center rounded-xl text-[13.5px] transition-all duration-200 ${
    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
  }`;
  const activeCls = "bg-[var(--ad-panel)] font-semibold text-[var(--ad-ink)]";
  const idleCls =
    "font-medium text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel-2)] hover:text-[var(--ad-ink)]";

  return (
    <>
      <div
        className={`flex items-center pb-4 ${collapsed ? "flex-col gap-3 px-2" : "justify-between px-4"}`}
      >
        <BrandMark collapsed={collapsed} />
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        ) : null}
      </div>

      {/* Global search - lives in the sidebar like the reference. */}
      {collapsed ? (
        <div className="mb-4 h-px bg-[var(--ad-line)] mx-2" />
      ) : (
        <div className="mb-4 px-3">
          <label className="relative flex h-10 items-center">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 text-[var(--ad-muted)]"
            />
            <input
              type="text"
              placeholder="Search anything…"
              className="h-full w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel-2)] pl-9 pr-12 text-[13px] text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-accent)] focus:outline-none"
            />
            <kbd className="absolute right-2.5 rounded-lg border border-[var(--ad-line)] bg-[var(--ad-paper)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ad-muted)]">
              ⌘K
            </kbd>
          </label>
        </div>
      )}

      <nav
        className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:thin] ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {collapsed ? null : (
          <p className="mb-1.5 px-3 text-[11px] font-semibold text-[var(--ad-muted)]">
            Main Menu
          </p>
        )}
        {nav.map(({ label, href, icon: Icon, badge }) => {
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
                size={18}
                strokeWidth={active ? 2.2 : 1.8}
                className={
                  active
                    ? "text-[var(--ad-ink)]"
                    : "text-[var(--ad-muted)] transition-colors group-hover:text-[var(--ad-ink-soft)]"
                }
              />
              {collapsed ? null : <span className="flex-1">{label}</span>}
              {badge ? (
                collapsed ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--ad-negative)]" />
                ) : (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--ad-negative)] px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto pt-3 ${collapsed ? "px-2" : "px-3"}`}>
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          title={collapsed ? "Invite member" : undefined}
          className={`${rowBase} ${idleCls}`}
        >
          <UserPlus
            size={18}
            strokeWidth={1.8}
            className="text-[var(--ad-muted)] transition-colors group-hover:text-[var(--ad-ink-soft)]"
          />
          {collapsed ? null : <span>Invite member</span>}
        </Link>

        {/* Upgrade card - dark tile pinned above the account row. */}
        {collapsed ? null : (
          <div className="mt-3 rounded-2xl bg-[var(--ad-ink)] p-4 text-white">
            <span className="inline-block rounded-lg bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
              Upgrade
            </span>
            <p className="mt-2 text-[12.5px] leading-snug text-white/85">
              Get more features with the premium plan.
            </p>
            <Link
              href="/dashboard/billing"
              onClick={onNavigate}
              className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-white text-[12.5px] font-semibold text-[var(--ad-ink)] transition-opacity hover:opacity-90"
            >
              <Sparkles size={13} />
              Upgrade Now
            </Link>
          </div>
        )}

        <AccountBlock collapsed={collapsed} />
      </div>
    </>
  );
}

/* Signed-in account - avatar, name, role line and sign-out, pinned to the
   sidebar bottom like the reference design. */
function AccountBlock({ collapsed }: { collapsed: boolean }) {
  const { user, business, isAdmin, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  const roleLine = business
    ? business.businessName
    : isAdmin
      ? "Administrator"
      : "Member";

  if (collapsed) {
    return (
      <div className="mt-3 flex justify-center border-t border-[var(--ad-line)] pt-3">
        <Avatar name={business?.businessName ?? user?.name ?? "?"} size={34} />
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-[var(--ad-line)] px-2 pt-3.5">
      <Avatar name={business?.businessName ?? user?.name ?? "?"} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--ad-ink)]">
          {user?.name ?? "Account"}
        </p>
        <p className="truncate text-[11px] text-[var(--ad-muted)]">{roleLine}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
      >
        <LogOut size={15} />
      </button>
    </div>
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
  const { isAdmin } = useAuth();
  const nav = isAdmin ? ADMIN_NAV : BUSINESS_NAV;
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
      {/* Desktop: static rail - collapses to an icon-only column. */}
      <aside
        className={`hidden h-full shrink-0 flex-col rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] py-6 shadow-[var(--ad-shadow-card)] transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <SidebarPanel
          pathname={pathname}
          nav={nav}
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
          className={`absolute left-0 top-0 flex h-full w-[280px] max-w-[85%] flex-col overflow-y-auto rounded-r-[var(--ad-radius-lg)] border-r border-[var(--ad-line)] bg-[var(--ad-paper)] py-6 shadow-[var(--ad-shadow-float)] transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarPanel pathname={pathname} nav={nav} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
