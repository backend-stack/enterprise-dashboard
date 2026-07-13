import { NextResponse } from "next/server";
import { getViewer } from "@/lib/server-auth";
import {
  fetchLinqChats,
  fetchLinqLines,
  fetchLinqMessages,
  linqConfigured,
  resolveBusinessLine,
  type LinqLine,
} from "@/lib/linq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Live snapshot for the iMessage "Lines" module: the account's lines, the
   chats on the requested line, and the messages in the requested chat -
   polled by the dashboard so threads update without a page reload.

   Same visibility rules as the page itself: admins may read any line;
   a business is always pinned to its own line (any ?line= is ignored),
   and may only read chats that live on that line. */
export async function GET(req: Request) {
  if (!linqConfigured()) {
    return NextResponse.json({ error: "Linq is not configured." }, { status: 503 });
  }

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const adminView = !(viewer.kind === "user" && !viewer.isAdmin);

  const url = new URL(req.url);
  let line = url.searchParams.get("line") ?? "";
  const chatId = url.searchParams.get("chat") ?? "";

  let lines: LinqLine[] | null = null;
  if (adminView) {
    lines = await fetchLinqLines().catch(() => null);
    if (line && !lines?.some((l) => l.phoneNumber === line)) line = "";
    if (!line) line = lines?.[0]?.phoneNumber ?? "";
  } else {
    const bizLine = await resolveBusinessLine(viewer.uid);
    if (!bizLine) {
      return NextResponse.json({ error: "No line assigned." }, { status: 403 });
    }
    const all = await fetchLinqLines().catch(() => null);
    const match = all?.find((l) => l.phoneNumber === bizLine);
    lines = match ? [match] : [{ id: bizLine, phoneNumber: bizLine, health: "UNKNOWN" }];
    line = bizLine;
  }

  const chats = line ? await fetchLinqChats(line).catch(() => null) : null;
  // Only serve messages for a chat that actually lives on this line.
  const chat = chatId ? (chats?.find((c) => c.id === chatId) ?? null) : null;
  const messages = chat ? await fetchLinqMessages(chat.id).catch(() => null) : null;

  return NextResponse.json({
    lines,
    line,
    chats,
    messages,
    at: new Date().toISOString(),
  });
}
