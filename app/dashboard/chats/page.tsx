import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server-auth";
import { MessagesInbox } from "@/components/dashboard/MessagesInbox";

/* Messages - every conversation the agent is having, across every tenant,
   unified in one live inbox. Read straight from the Contextual Intelligence
   tenants API via the /api/ci proxy. Rendered full-bleed: the negative
   margins cancel the shell's content padding so the inbox fills the whole
   main panel like a real messaging app. */
export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");

  return (
    <div className="-mx-4 -my-6 h-[calc(100dvh-57px)] sm:-mx-8 sm:-my-8 lg:h-[calc(100dvh-104px)]">
      <MessagesInbox />
    </div>
  );
}
