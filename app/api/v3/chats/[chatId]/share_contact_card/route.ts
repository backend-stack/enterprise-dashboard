import { NextResponse } from "next/server";
import { shareContactCard } from "@/lib/linq-sandbox";
import { sandboxHandler, tenantFrom } from "@/lib/linq-sandbox-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /v3/chats/{chatId}/share_contact_card - drop the business's contact
    card into the chat as an outbound message. */
export const POST = sandboxHandler((req, chatId) => {
  const tenant = tenantFrom(req);
  const message = shareContactCard(tenant.id, chatId);
  return NextResponse.json({ message }, { status: 201 });
});
