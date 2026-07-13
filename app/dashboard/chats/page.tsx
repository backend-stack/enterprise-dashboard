import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessagesInbox } from "@/components/dashboard/MessagesInbox";

/* Messages - every conversation the agent is having, across every tenant,
   unified in one live inbox. Read straight from the Contextual Intelligence
   tenants API via the /api/ci proxy. */
export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="All conversations across your lines, live from the agent."
      />
      <MessagesInbox />
    </>
  );
}
