import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard, LifeBuoy } from "lucide-react";
import { getViewer } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { BusinessOverview } from "@/components/dashboard/BusinessOverview";
import { AdminOverview } from "@/components/dashboard/AdminOverview";

/* Overview - the live assistant feed, four numbers front and center:
   Messages, Missed phone calls, Requests and Special Bookings. Businesses
   see their own tenant; admins see every tenant aggregated. */
export const dynamic = "force-dynamic";

function QuickLink({
  href,
  icon,
  title,
  blurb,
  fg = "var(--ad-ink)",
  bg = "var(--ad-panel)",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  fg?: string;
  bg?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[var(--ad-radius-card)] border border-[var(--ad-line)] bg-[var(--ad-paper)] p-6 shadow-[var(--ad-shadow-card)] transition-colors hover:bg-[var(--ad-panel-2)]"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: bg, color: fg }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--ad-ink)]">{title}</span>
        <span className="block truncate text-xs text-[var(--ad-muted)]">{blurb}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-[var(--ad-muted)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default async function OverviewPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");

  // Business / non-admin accounts: only their own data, never platform-wide.
  if (viewer.kind === "user" && !viewer.isAdmin) {
    return (
      <>
        <BusinessOverview />
        <div className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2">
          <QuickLink
            href="/dashboard/support"
            icon={<LifeBuoy size={19} />}
            title="Support"
            blurb="Open a ticket - billing, listings, assistant or anything else"
          />
          <QuickLink
            href="/dashboard/billing"
            icon={<CreditCard size={19} />}
            title="Billing"
            blurb="Plan, invoices and payment method"
          />
        </div>
      </>
    );
  }

  // Admins: the same assistant overview, aggregated across every location.
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Live from your assistant - messages, missed calls, requests and special bookings across all locations."
      />
      <AdminOverview />
    </>
  );
}
