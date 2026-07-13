import { NextResponse } from "next/server";
import { sendVoiceMemo } from "@/lib/linq-sandbox";
import { body, sandboxHandler, tenantFrom } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /v3/chats/{chatId}/voicememo - send a voice memo (duration +
    transcript stand in for real audio in the sandbox). */
export const POST = sandboxHandler(async (req, chatId) => {
  const tenant = tenantFrom(req);
  const input = await body(req);
  const message = sendVoiceMemo(tenant.id, chatId, {
    duration_seconds:
      typeof input.duration_seconds === "number" ? input.duration_seconds : undefined,
    transcript: typeof input.transcript === "string" ? input.transcript : undefined,
  });
  return NextResponse.json({ message }, { status: 201 });
});
