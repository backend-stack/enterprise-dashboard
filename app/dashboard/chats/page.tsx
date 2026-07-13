import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatSandbox } from "@/components/dashboard/ChatSandbox";

/* Chats API sandbox - dummy tenant accounts exercising the full Linq v3
   chats surface (create / list / get / update / read / leave /
   share_contact_card / voicememo) against the in-memory mock at /api/v3.
   Nothing here sends real messages. */
export const dynamic = "force-dynamic";

export default async function ChatsSandboxPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/signin");

  return (
    <>
      <PageHeader
        title="Chats API"
        subtitle="Dummy tenant accounts mimicking the Linq v3 chats API - try every endpoint without sending a real message."
      />
      <ChatSandbox />
    </>
  );
}
