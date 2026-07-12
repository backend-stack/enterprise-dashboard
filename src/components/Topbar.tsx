"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";

/* Top bar — global search + notifications + the signed-in account. */
export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, business, demoMode, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 rounded-[var(--ad-radius-lg)] border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 shadow-[var(--ad-shadow-card)] sm:gap-4 sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)] lg:hidden"
      >
        <Menu size={18} />
      </button>

      <label className="relative flex h-10 w-full max-w-md items-center">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 text-[var(--ad-muted)]"
        />
        <input
          type="text"
          placeholder="Search customers, campaigns, stores…"
          className="h-full w-full rounded-full border border-[var(--ad-line)] bg-[var(--ad-panel)] pl-10 pr-4 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-ink-soft)] focus:outline-none sm:pr-16"
        />
        <kbd className="absolute right-3 hidden rounded-md border border-[var(--ad-line)] bg-[var(--ad-paper)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--ad-muted)] sm:block">
          ⌘K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {demoMode ? (
          <span className="hidden rounded-full bg-[var(--ad-orange-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--ad-orange)] md:block">
            Demo data
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--ad-orange)]" />
        </button>
        <span className="hidden flex-col items-end sm:flex">
          <span className="text-sm font-medium leading-tight text-[var(--ad-ink-soft)]">
            {business?.businessName ?? user?.name ?? "Account"}
          </span>
          {business ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ad-muted)]">
              Business account
            </span>
          ) : null}
        </span>
        <Avatar name={business?.businessName ?? user?.name ?? "?"} size={36} />
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
