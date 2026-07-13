import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Support tickets - sends the form as a structured email to the support
   inbox (clo@contextualintelligence.co) via Resend. Every ticket carries a
   generated id plus a category tag in the subject line, so the inbox can be
   filtered/triaged per problem type without any extra tooling. */

const CATEGORIES = [
  "Billing & payments",
  "Venue listing",
  "AI assistant & bookings",
  "Account & sign-in",
  "Technical problem",
  "Something else",
] as const;

const MAX_SUBJECT = 150;
const MAX_MESSAGE = 5000;

function ticketId(): string {
  // Short, human-readable ticket ref, e.g. CI-M9X2K4TQ.
  return `CI-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Support isn't configured yet - add RESEND_API_KEY to .env." },
      { status: 503 }
    );
  }

  // Fail closed: only signed-in accounts may open tickets.
  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  let uid = "";
  let email = "";
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    subject?: string;
    message?: string;
  };
  const category = CATEGORIES.find((c) => c === body.category);
  const subject = (body.subject ?? "").trim().slice(0, MAX_SUBJECT);
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE);
  if (!category || !subject || !message) {
    return NextResponse.json(
      { error: "Pick a category and fill in a subject and message." },
      { status: 400 }
    );
  }

  // Business context makes triage faster - resolved server-side, never trusted
  // from the client.
  let businessName = "";
  let plan = "";
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("lunaPartners")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0].data();
        businessName = typeof d.businessName === "string" ? d.businessName : "";
        plan = typeof d.planChosen === "string" ? d.planChosen : "";
      }
    } catch {
      /* context is optional */
    }
  }

  const id = ticketId();
  const to = process.env.SUPPORT_INBOX || "clo@contextualintelligence.co";
  const from = process.env.RESEND_FROM || "Clo Dashboard <clo@contextualintelligence.co>";

  const text = [
    `Ticket:    ${id}`,
    `Category:  ${category}`,
    `Business:  ${businessName || "-"}`,
    `Plan:      ${plan || "-"}`,
    `Account:   ${email || "-"} (uid ${uid})`,
    ``,
    `Subject:   ${subject}`,
    ``,
    message,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email || undefined,
      subject: `[${id}] [${category}] ${subject}`,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[support] resend failed:", res.status, detail.slice(0, 300));
    return NextResponse.json(
      { error: "Couldn't send your ticket - please try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, ticketId: id, repliesTo: email });
}
