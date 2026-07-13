import { NextResponse } from "next/server";
import { chatSummary, markChatRead } from "@/lib/linq-sandbox";
import { sandboxHandler, tenantFrom } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /v3/chats/{chatId}/read - mark every message in the chat as read. */
export const POST = sandboxHandler((req, chatId) => {
  const tenant = tenantFrom(req);
  const chat = markChatRead(tenant.id, chatId);
  return NextResponse.json({ chat: chatSummary(chat) });
});
