import { BookingRequestForm } from "@/components/booking/BookingRequestForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/* Public booking page - the link a business shares with its customers. */
export default async function BookPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ad-panel)] p-4">
      <BookingRequestForm businessId={businessId} />
    </main>
  );
}
