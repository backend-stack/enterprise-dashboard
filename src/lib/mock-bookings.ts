import {
  type Booking,
  type BookingSettings,
} from "@/lib/booking";

/* Demo-mode bookings - keeps /dashboard/bookings fully browsable without
   Firebase, like the rest of the dashboard's sample data. Dates are computed
   relative to "now" so the page always shows plausible upcoming bookings. */

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
}

export const MOCK_BOOKING_SETTINGS: BookingSettings = {
  enabled: true,
  openTime: "09:00",
  closeTime: "17:00",
  slotMinutes: 30,
  capacityPerSlot: 4,
  daysOpen: [1, 2, 3, 4, 5],
};

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "bk-01",
    businessId: "demo",
    name: "Priya Raman",
    email: "priya@example.com",
    phone: "+1 555 0114",
    partySize: 2,
    date: day(1),
    time: "18:00",
    status: "pending",
    statusToken: "demo-token-priya",
    note: "Window seat if possible",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bk-02",
    businessId: "demo",
    name: "Marcus Chen",
    email: "marcus@example.com",
    partySize: 6,
    date: day(2),
    time: "12:30",
    status: "pending",
    statusToken: "demo-token-marcus",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bk-03",
    businessId: "demo",
    name: "Elena Petrova",
    email: "elena@example.com",
    partySize: 4,
    date: day(1),
    time: "13:00",
    status: "approved",
    statusToken: "demo-token-elena",
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  },
  {
    id: "bk-04",
    businessId: "demo",
    name: "Jordan Fox",
    email: "jordan@example.com",
    partySize: 3,
    date: day(3),
    time: "10:30",
    status: "approved",
    statusToken: "demo-token-jordan",
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  },
];
