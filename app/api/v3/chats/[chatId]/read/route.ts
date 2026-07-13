import { NextResponse } from "next/server";
import { chatSummary, markChatRead } from "@/lib/linq-sandbox";
import { sandboxHandler } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /v3/chats/{chatId}/read - mark every message in the chat as read. */
export const POST = sandboxHandler((_req, chatId) => {
  const chat = markChatRead(chatId);
  return NextResponse.json({ chat: chatSummary(chat) });
});
