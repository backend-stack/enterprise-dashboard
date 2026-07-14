import "server-only";
import { formatDay } from "@/lib/format";
import type { Booking } from "@/lib/booking";

/* Transactional booking emails via the Resend REST API (plain fetch, no SDK).
   Without RESEND_API_KEY every send is a logged no-op so bookings keep
   working - the same graceful degradation as running without Firebase keys.
   Failures are logged and never block the booking flow. */

export type BookingEmailKind = "received" | "approved" | "denied";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function template(
  kind: BookingEmailKind,
  booking: Booking,
  businessName: string,
  statusUrl: string
): { subject: string; html: string } {
  const when = `${formatDay(booking.date)} at ${booking.time}`;
  const biz = esc(businessName);
  const name = esc(booking.name);
  const line =
    kind === "received"
      ? `We received your reservation request for <strong>${when}</strong> (party of ${booking.partySize}). We'll email you as soon as ${biz} makes a decision.`
      : kind === "approved"
        ? `Your reservation for <strong>${when}</strong> (party of ${booking.partySize}) is confirmed. See you there!`
        : `Unfortunately ${biz} couldn't accommodate your reservation for <strong>${when}</strong>. You're welcome to request a different time.`;
  const subject =
    kind === "received"
      ? `Reservation request received - ${businessName}`
      : kind === "approved"
        ? `Reservation confirmed - ${businessName}`
        : `Reservation update - ${businessName}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1b20">
      <h2 style="margin:0 0 16px">${biz}</h2>
      <p style="margin:0 0 12px">Hi ${name},</p>
      <p style="margin:0 0 16px;line-height:1.55">${line}</p>
      <p style="margin:0 0 24px">
        <a href="${statusUrl}" style="display:inline-block;background:#1a1b20;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">
          View booking status
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#6b6e76">Or copy this link: ${statusUrl}</p>
    </div>`;
  return { subject, html };
}

export async function sendBookingEmail(
  kind: BookingEmailKind,
  booking: Booking,
  businessName: string,
  statusUrl: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[email] RESEND_API_KEY not set - skipping "${kind}" email to ${booking.email}`
    );
    return;
  }
  const { subject, html } = template(kind, booking, businessName, statusUrl);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.BOOKING_EMAIL_FROM ?? "Bookings <onboarding@resend.dev>",
        to: [booking.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[email] resend failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[email] resend error:", err);
  }
}
