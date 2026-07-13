import { NextResponse } from "next/server";
import { SandboxError, chatSummary, createChat, listChats } from "@/lib/linq-sandbox";
import { body, tenantFrom } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /v3/chats - list all chats on the tenant's line, newest first. */
export async function GET(req: Request) {
  try {
    const tenant = tenantFrom(req);
    return NextResponse.json({
      chats: listChats(tenant.id).map(chatSummary),
      next_cursor: null,
    });
  } catch (err) {
    if (err instanceof SandboxError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

/** POST /v3/chats - create a new chat (optionally with a first message). */
export async function POST(req: Request) {
  try {
    const tenant = tenantFrom(req);
    const input = await body(req);
    const chat = createChat(tenant.id, {
      participants: Array.isArray(input.participants)
        ? (input.participants as string[])
        : [],
      display_name: typeof input.display_name === "string" ? input.display_name : undefined,
      message: typeof input.message === "string" ? input.message : undefined,
    });
    return NextResponse.json({ chat: chatSummary(chat) }, { status: 201 });
  } catch (err) {
    if (err instanceof SandboxError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
