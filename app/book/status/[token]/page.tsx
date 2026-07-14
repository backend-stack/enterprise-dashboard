import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { getAdminDb } from "@/lib/firebase-admin";
import { findBookingByToken, getBusinessById } from "@/lib/booking-server";
import { formatDay } from "@/lib/format";
import type { BookingStatus } from "@/lib/booking";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/* Public status page - the link customers get on screen and by email.
   Live status of one booking; refresh to see decision updates. */

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "pending",
  approved: "positive",
  denied: "negative",
  cancelled: "neutral",
};

const HEADLINE: Record<BookingStatus, string> = {
  pending: "Your request is waiting for a decision",
  approved: "You're booked!",
  denied: "This request couldn't be accommodated",
  cancelled: "This booking was cancelled",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ad-panel)] p-4">
      <Card className="w-full max-w-md p-8">{children}</Card>
    </main>
  );
}

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getAdminDb();
  const booking = db ? await findBookingByToken(db, token) : null;
  const business = db && booking ? await getBusinessById(db, booking.businessId) : null;

  if (!db || !booking) {
    return (
      <Frame>
        <p className="text-sm font-semibold text-[var(--ad-ink)]">
          Booking not found
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          This status link is invalid or no longer available. Please check the
          link from your confirmation email.
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
        <CalendarCheck size={20} />
      </span>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight text-[var(--ad-ink)]">
          {HEADLINE[booking.status]}
        </h1>
        <StatusBadge tone={TONE[booking.status]}>{booking.status}</StatusBadge>
      </div>
      <dl className="mt-5 space-y-2.5 text-sm">
        {business?.businessName ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ad-muted)]">Business</dt>
            <dd className="font-medium text-[var(--ad-ink)]">{business.businessName}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">Name</dt>
          <dd className="font-medium text-[var(--ad-ink)]">{booking.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">When</dt>
          <dd className="font-medium text-[var(--ad-ink)]">
            {formatDay(booking.date)} at {booking.time}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">Party size</dt>
          <dd className="font-medium text-[var(--ad-ink)]">{booking.partySize}</dd>
        </div>
      </dl>
      {booking.status === "pending" ? (
        <p className="mt-5 text-xs leading-relaxed text-[var(--ad-muted)]">
          We'll email you when a decision is made. This page always shows the
          live status.
        </p>
      ) : null}
    </Frame>
  );
}
