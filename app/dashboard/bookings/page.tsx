import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server-auth";
import { BookingsManager } from "@/components/booking/BookingsManager";

export const dynamic = "force-dynamic";

/* Bookings - reservation requests from the public booking page, with
   approve/deny and the business's slot settings. */
export default async function BookingsPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");
  return <BookingsManager />;
}
