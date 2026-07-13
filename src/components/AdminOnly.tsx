import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

/* Shown when a non-admin account opens a platform-wide (cross-business)
   page. Their own data lives in Overview and Live Assistant. */
export function AdminOnly({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="flex flex-col items-start gap-4 p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
          <ShieldCheck size={20} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--ad-ink)]">
            This section is for platform administrators
          </p>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[var(--ad-muted)]">
            It shows data across every business on the platform. Everything about{" "}
            <em>your</em> business — venues, live conversations, bookings and
            customers — is on your Overview and Live Assistant pages.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-[var(--ad-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
          >
            Go to Overview
          </Link>
          <Link
            href="/dashboard/support"
            className="rounded-full border border-[var(--ad-line)] px-5 py-2.5 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
          >
            Contact support
          </Link>
        </div>
      </Card>
    </>
  );
}
