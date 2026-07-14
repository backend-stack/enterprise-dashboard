/* Booking domain: shared types plus pure slot/validation logic.
   No server or client imports - used by API routes, public pages and the
   dashboard alike. Dates are YYYY-MM-DD, times HH:mm, in the business's
   local wall-clock. */

export type BookingStatus = "pending" | "approved" | "denied" | "cancelled";

export interface BookingSettings {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  /** Max bookings (pending + approved) per slot. */
  capacityPerSlot: number;
  /** Bookable days of week, 0 = Sunday. */
  daysOpen: number[];
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled: false,
  openTime: "09:00",
  closeTime: "17:00",
  slotMinutes: 30,
  capacityPerSlot: 4,
  daysOpen: [1, 2, 3, 4, 5],
};

export interface Booking {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  partySize: number;
  date: string;
  time: string;
  status: BookingStatus;
  statusToken: string;
  note?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface Slot {
  time: string;
  remaining: number;
}

export interface BookingRequestInput {
  name: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  note: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^\S+@\S+\.\S+$/;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isValidDate(date: string): boolean {
  if (!YMD.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Every slot start time for one day under these settings. */
export function slotTimes(s: BookingSettings): string[] {
  const out: string[] = [];
  if (!HHMM.test(s.openTime) || !HHMM.test(s.closeTime)) return out;
  const step = Math.max(5, s.slotMinutes);
  for (let t = toMinutes(s.openTime); t + step <= toMinutes(s.closeTime); t += step) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    out.push(`${h}:${m}`);
  }
  return out;
}

/** Slots for a date with remaining capacity, given taken counts per HH:mm.
    Empty when the date is invalid, in the past, or the day is closed. When
    `date` is today and `nowTime` is given, slots that have already started
    are excluded. */
export function computeSlots(
  s: BookingSettings,
  date: string,
  today: string,
  takenBySlot: Record<string, number>,
  nowTime?: string
): Slot[] {
  if (!isValidDate(date) || date < today) return [];
  if (!s.daysOpen.includes(dayOfWeek(date))) return [];
  return slotTimes(s)
    .filter((time) => !(date === today && nowTime && toMinutes(time) <= toMinutes(nowTime)))
    .map((time) => ({
      time,
      remaining: Math.max(0, s.capacityPerSlot - (takenBySlot[time] ?? 0)),
    }));
}

/** Reads a `booking` map off a lunaPartners doc, tolerating junk. */
export function parseBookingSettings(v: unknown): BookingSettings {
  const d = DEFAULT_BOOKING_SETTINGS;
  if (!v || typeof v !== "object") return { ...d };
  const o = v as Record<string, unknown>;
  const num = (x: unknown, fallback: number, min: number, max: number) =>
    typeof x === "number" && Number.isFinite(x)
      ? Math.min(max, Math.max(min, Math.round(x)))
      : fallback;
  const time = (x: unknown, fallback: string) =>
    typeof x === "string" && HHMM.test(x) ? x : fallback;
  return {
    enabled: o.enabled === true,
    openTime: time(o.openTime, d.openTime),
    closeTime: time(o.closeTime, d.closeTime),
    slotMinutes: num(o.slotMinutes, d.slotMinutes, 5, 240),
    capacityPerSlot: num(o.capacityPerSlot, d.capacityPerSlot, 1, 500),
    daysOpen: Array.isArray(o.daysOpen)
      ? o.daysOpen.filter((n): n is number => typeof n === "number" && n >= 0 && n <= 6)
      : [...d.daysOpen],
  };
}

export function validateBookingRequest(
  data: Record<string, unknown>,
  s: BookingSettings,
  today: string,
  nowTime?: string
): { ok: true; value: BookingRequestInput } | { ok: false; error: string } {
  const str = (v: unknown, cap: number) =>
    typeof v === "string" ? v.trim().slice(0, cap) : "";
  const name = str(data.name, 200);
  const email = str(data.email, 200);
  const phone = str(data.phone, 40);
  const note = str(data.note, 1000);
  const date = str(data.date, 10);
  const time = str(data.time, 5);
  const partySize =
    typeof data.partySize === "number" ? Math.round(data.partySize) : NaN;

  if (!name) return { ok: false, error: "Name is required." };
  if (!EMAIL.test(email)) return { ok: false, error: "A valid email is required." };
  if (!Number.isFinite(partySize) || partySize < 1 || partySize > 100)
    return { ok: false, error: "Party size must be between 1 and 100." };
  if (!isValidDate(date) || date < today)
    return { ok: false, error: "Pick a valid upcoming date." };
  if (!s.daysOpen.includes(dayOfWeek(date)))
    return { ok: false, error: "That day is not open for bookings." };
  if (!slotTimes(s).includes(time))
    return { ok: false, error: "That time is not an available slot." };
  if (date === today && nowTime && toMinutes(time) <= toMinutes(nowTime))
    return { ok: false, error: "That time has already passed today." };
  return { ok: true, value: { name, email, phone, partySize, date, time, note } };
}
