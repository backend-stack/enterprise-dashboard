import { NextResponse } from "next/server";
import { chatSummary, getChat, updateChat } from "@/lib/linq-sandbox";
import { body, sandboxHandler } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /v3/chats/{chatId} - one chat, messages included. */
export const GET = sandboxHandler((_req, chatId) => {
  const chat = getChat(chatId);
  return NextResponse.json({
    chat: { ...chatSummary(chat), messages: chat.messages },
  });
});

/** PUT /v3/chats/{chatId} - update the chat (rename). */
export const PUT = sandboxHandler(async (req, chatId) => {
  const input = await body(req);
  const chat = updateChat(chatId, {
    display_name: typeof input.display_name === "string" ? input.display_name : undefined,
  });
  return NextResponse.json({ chat: chatSummary(chat) });
});
