# Booking & Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public booking page where customers reserve time slots; requests land as pending in a new dashboard Bookings page where the owner approves/denies; customers track status via a unique link and get transactional emails via Resend.

**Architecture:** A pure domain module (`src/lib/booking.ts`) holds types, slot math, and validation — unit-tested with vitest. A server-only module (`src/lib/booking-server.ts`) wraps Firestore (admin SDK) including transactional capacity checks. Six API routes follow the existing `verifyBearer`/`getAdminDb` pattern. Public pages live under `/book`, the owner UI at `/dashboard/bookings` with a demo-mode fallback like the rest of the app.

**Tech Stack:** Next.js 15 (App Router, `runtime = "nodejs"` routes), Firebase Admin SDK (Firestore), Resend REST API via `fetch` (no SDK dependency), Tailwind v4 with the app's `--ad-*` CSS vars, vitest (new devDependency).

**Spec:** `docs/superpowers/specs/2026-07-14-booking-reservations-design.md`

## Global Constraints

- Branch: `feature/booking-reservations`. Commit after every task.
- Existing Firestore project only — new top-level `bookings` collection; settings stored in a `booking` map on the business's `lunaPartners/{id}` doc. No new database.
- All server data access via API routes + `src/lib` helpers (admin SDK), never client-side Firestore.
- Booking statuses: exactly `"pending" | "approved" | "denied" | "cancelled"`.
- Dates are `YYYY-MM-DD` strings; times are `HH:mm` 24-hour strings; stored timestamps are ISO strings (matches `lunaPartners.createdAt` convention).
- Email degrades gracefully: without `RESEND_API_KEY`, sends are logged no-ops and bookings still work.
- Firestore queries on `bookings` use only equality/`in` filters (no `orderBy` with `where`) so no composite indexes are required; sort in memory.
- In Next 15, `params` in pages and route handlers is a `Promise` — always `await params`.
- UI must reuse existing primitives: `Card`/`CardHeader`, `PageHeader`, `StatusBadge`, `--ad-*` CSS variables, `lucide-react` icons.
- `npm run typecheck` and `npm run lint` must pass at every commit.

---

### Task 1: Vitest setup + booking domain module (pure logic, TDD)

**Files:**
- Modify: `package.json` (add vitest devDependency + `test` script)
- Create: `src/lib/booking.ts`
- Test: `src/lib/booking.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports).
- Produces (used by every later task):
  - `type BookingStatus = "pending" | "approved" | "denied" | "cancelled"`
  - `interface BookingSettings { enabled: boolean; openTime: string; closeTime: string; slotMinutes: number; capacityPerSlot: number; daysOpen: number[] }`
  - `const DEFAULT_BOOKING_SETTINGS: BookingSettings`
  - `interface Booking { id: string; businessId: string; name: string; email: string; phone?: string; partySize: number; date: string; time: string; status: BookingStatus; statusToken: string; note?: string; createdAt: string; decidedAt?: string }`
  - `interface Slot { time: string; remaining: number }`
  - `interface BookingRequestInput { name: string; email: string; phone: string; partySize: number; date: string; time: string; note: string }`
  - `toMinutes(hhmm: string): number`
  - `isValidDate(date: string): boolean`
  - `dayOfWeek(date: string): number`
  - `slotTimes(s: BookingSettings): string[]`
  - `computeSlots(s: BookingSettings, date: string, today: string, takenBySlot: Record<string, number>): Slot[]`
  - `parseBookingSettings(v: unknown): BookingSettings`
  - `validateBookingRequest(data: Record<string, unknown>, s: BookingSettings, today: string): { ok: true; value: BookingRequestInput } | { ok: false; error: string }`

- [ ] **Step 1: Install vitest and add the test script**

```bash
npm install -D vitest
```

Then in `package.json` add to `"scripts"` (after `"typecheck"`):

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/booking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKING_SETTINGS,
  computeSlots,
  isValidDate,
  parseBookingSettings,
  slotTimes,
  toMinutes,
  validateBookingRequest,
  type BookingSettings,
} from "./booking";

// Mon 2026-07-20 .. Sun 2026-07-26 — a known week for daysOpen tests.
const MONDAY = "2026-07-20";
const SUNDAY = "2026-07-26";
const TODAY = "2026-07-14";

const SETTINGS: BookingSettings = {
  enabled: true,
  openTime: "10:00",
  closeTime: "12:00",
  slotMinutes: 30,
  capacityPerSlot: 2,
  daysOpen: [1, 2, 3, 4, 5],
};

describe("toMinutes", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("10:30")).toBe(630);
    expect(toMinutes("23:59")).toBe(1439);
  });
});

describe("isValidDate", () => {
  it("accepts real YYYY-MM-DD dates", () => {
    expect(isValidDate("2026-07-14")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false); // 2026 not a leap year
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("garbage")).toBe(false);
    expect(isValidDate("2026-7-4")).toBe(false);
  });
});

describe("slotTimes", () => {
  it("generates slot starts from open to close, exclusive of close", () => {
    expect(slotTimes(SETTINGS)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });
  it("returns [] when open/close are malformed", () => {
    expect(slotTimes({ ...SETTINGS, openTime: "25:00" })).toEqual([]);
  });
});

describe("computeSlots", () => {
  it("subtracts taken counts and clamps at zero", () => {
    const slots = computeSlots(SETTINGS, MONDAY, TODAY, { "10:00": 1, "10:30": 5 });
    expect(slots).toEqual([
      { time: "10:00", remaining: 1 },
      { time: "10:30", remaining: 0 },
      { time: "11:00", remaining: 2 },
      { time: "11:30", remaining: 2 },
    ]);
  });
  it("is empty for closed days, past dates, and invalid dates", () => {
    expect(computeSlots(SETTINGS, SUNDAY, TODAY, {})).toEqual([]);
    expect(computeSlots(SETTINGS, "2026-07-01", TODAY, {})).toEqual([]);
    expect(computeSlots(SETTINGS, "nope", TODAY, {})).toEqual([]);
  });
});

describe("parseBookingSettings", () => {
  it("returns defaults for junk", () => {
    expect(parseBookingSettings(null)).toEqual(DEFAULT_BOOKING_SETTINGS);
    expect(parseBookingSettings("x")).toEqual(DEFAULT_BOOKING_SETTINGS);
  });
  it("keeps valid fields and repairs invalid ones", () => {
    const parsed = parseBookingSettings({
      enabled: true,
      openTime: "08:00",
      closeTime: "99:99",
      slotMinutes: 45,
      capacityPerSlot: -3,
      daysOpen: [0, 6, 9],
    });
    expect(parsed.enabled).toBe(true);
    expect(parsed.openTime).toBe("08:00");
    expect(parsed.closeTime).toBe(DEFAULT_BOOKING_SETTINGS.closeTime);
    expect(parsed.slotMinutes).toBe(45);
    expect(parsed.capacityPerSlot).toBe(1); // clamped to min
    expect(parsed.daysOpen).toEqual([0, 6]);
  });
});

describe("validateBookingRequest", () => {
  const good = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+1 555 0100",
    partySize: 2,
    date: MONDAY,
    time: "10:30",
    note: "window seat",
  };
  it("accepts a valid request and trims strings", () => {
    const r = validateBookingRequest({ ...good, name: "  Ada Lovelace  " }, SETTINGS, TODAY);
    expect(r).toEqual({ ok: true, value: good });
  });
  it("rejects missing name, bad email, bad party size", () => {
    expect(validateBookingRequest({ ...good, name: "" }, SETTINGS, TODAY).ok).toBe(false);
    expect(validateBookingRequest({ ...good, email: "nope" }, SETTINGS, TODAY).ok).toBe(false);
    expect(validateBookingRequest({ ...good, partySize: 0 }, SETTINGS, TODAY).ok).toBe(false);
    expect(validateBookingRequest({ ...good, partySize: "2" }, SETTINGS, TODAY).ok).toBe(false);
  });
  it("rejects past dates, closed days, and off-grid times", () => {
    expect(validateBookingRequest({ ...good, date: "2026-07-01" }, SETTINGS, TODAY).ok).toBe(false);
    expect(validateBookingRequest({ ...good, date: SUNDAY }, SETTINGS, TODAY).ok).toBe(false);
    expect(validateBookingRequest({ ...good, time: "10:15" }, SETTINGS, TODAY).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/booking.test.ts`
Expected: FAIL — `Cannot find module './booking'` (or similar resolution error).

- [ ] **Step 4: Implement the domain module**

Create `src/lib/booking.ts`:

```ts
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
    Empty when the date is invalid, in the past, or the day is closed. */
export function computeSlots(
  s: BookingSettings,
  date: string,
  today: string,
  takenBySlot: Record<string, number>
): Slot[] {
  if (!isValidDate(date) || date < today) return [];
  if (!s.daysOpen.includes(dayOfWeek(date))) return [];
  return slotTimes(s).map((time) => ({
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
  today: string
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
  return { ok: true, value: { name, email, phone, partySize, date, time, note } };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/booking.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add package.json package-lock.json src/lib/booking.ts src/lib/booking.test.ts
git commit -m "feat: booking domain module with slot math and validation (vitest)"
```

---

### Task 2: Firestore server helpers (`booking-server.ts`)

**Files:**
- Create: `src/lib/booking-server.ts`

**Interfaces:**
- Consumes (Task 1): `Booking`, `BookingRequestInput`, `BookingSettings`, `parseBookingSettings` from `@/lib/booking`; `getAdminDb` pattern from `@/lib/firebase-admin` (callers pass the `Firestore` in).
- Produces (used by Tasks 4, 5, 7):
  - `interface BookingBusiness { id: string; businessName: string; settings: BookingSettings }`
  - `todayStr(): string` — `YYYY-MM-DD` for "today"
  - `newStatusToken(): string`
  - `getBusinessById(db: Firestore, businessId: string): Promise<BookingBusiness | null>`
  - `getOwnedBusiness(db: Firestore, uid: string): Promise<BookingBusiness | null>`
  - `docToBooking(doc: DocumentSnapshot): Booking`
  - `takenBySlot(db: Firestore, businessId: string, date: string): Promise<Record<string, number>>`
  - `createBooking(db, business: BookingBusiness, input: BookingRequestInput): Promise<{ ok: true; booking: Booking } | { ok: false; error: string; status: number }>`
  - `decideBooking(db, businessId: string, bookingId: string, decision: "approved" | "denied"): Promise<{ ok: true; booking: Booking } | { ok: false; error: string; status: number }>`
  - `listBookings(db: Firestore, businessId: string): Promise<Booking[]>`
  - `findBookingByToken(db: Firestore, token: string): Promise<Booking | null>`

- [ ] **Step 1: Implement the module**

Create `src/lib/booking-server.ts`:

```ts
import "server-only";
import { randomUUID } from "crypto";
import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import {
  parseBookingSettings,
  type Booking,
  type BookingRequestInput,
  type BookingSettings,
} from "@/lib/booking";

/* Firestore access for bookings. All queries use equality/`in` filters only
   (no orderBy) so no composite indexes are needed - lists are sorted in
   memory. Capacity is enforced inside transactions. */

export interface BookingBusiness {
  id: string;
  businessName: string;
  settings: BookingSettings;
}

export function todayStr(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA");
}

export function newStatusToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

function docToBusiness(doc: DocumentSnapshot): BookingBusiness {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    businessName: typeof d.businessName === "string" ? d.businessName : "",
    settings: parseBookingSettings(d.booking),
  };
}

export async function getBusinessById(
  db: Firestore,
  businessId: string
): Promise<BookingBusiness | null> {
  const doc = await db.collection("lunaPartners").doc(businessId).get();
  return doc.exists ? docToBusiness(doc) : null;
}

export async function getOwnedBusiness(
  db: Firestore,
  uid: string
): Promise<BookingBusiness | null> {
  const snap = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  return snap.empty ? null : docToBusiness(snap.docs[0]);
}

export function docToBooking(doc: DocumentSnapshot): Booking {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    businessId: String(d.businessId ?? ""),
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    phone: d.phone ? String(d.phone) : undefined,
    partySize: typeof d.partySize === "number" ? d.partySize : 1,
    date: String(d.date ?? ""),
    time: String(d.time ?? ""),
    status: (d.status ?? "pending") as Booking["status"],
    statusToken: String(d.statusToken ?? ""),
    note: d.note ? String(d.note) : undefined,
    createdAt: String(d.createdAt ?? ""),
    decidedAt: d.decidedAt ? String(d.decidedAt) : undefined,
  };
}

/** pending + approved counts per HH:mm for one business + date. */
export async function takenBySlot(
  db: Firestore,
  businessId: string,
  date: string
): Promise<Record<string, number>> {
  const snap = await db
    .collection("bookings")
    .where("businessId", "==", businessId)
    .where("date", "==", date)
    .where("status", "in", ["pending", "approved"])
    .get();
  const out: Record<string, number> = {};
  for (const d of snap.docs) {
    const t = String(d.data().time ?? "");
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

/** Creates a pending booking; capacity re-checked inside the transaction so
    two customers can't both take the last spot. */
export async function createBooking(
  db: Firestore,
  business: BookingBusiness,
  input: BookingRequestInput
): Promise<
  { ok: true; booking: Booking } | { ok: false; error: string; status: number }
> {
  const ref = db.collection("bookings").doc();
  try {
    const booking = await db.runTransaction(async (t) => {
      const taken = await t.get(
        db
          .collection("bookings")
          .where("businessId", "==", business.id)
          .where("date", "==", input.date)
          .where("time", "==", input.time)
          .where("status", "in", ["pending", "approved"])
      );
      if (taken.size >= business.settings.capacityPerSlot) {
        throw new Error("SLOT_FULL");
      }
      const data = {
        businessId: business.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        partySize: input.partySize,
        date: input.date,
        time: input.time,
        note: input.note || null,
        status: "pending",
        statusToken: newStatusToken(),
        createdAt: new Date().toISOString(),
        decidedAt: null,
      };
      t.create(ref, data);
      return data;
    });
    return {
      ok: true,
      booking: {
        id: ref.id,
        businessId: booking.businessId,
        name: booking.name,
        email: booking.email,
        phone: booking.phone ?? undefined,
        partySize: booking.partySize,
        date: booking.date,
        time: booking.time,
        status: "pending",
        statusToken: booking.statusToken,
        note: booking.note ?? undefined,
        createdAt: booking.createdAt,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return {
        ok: false,
        error: "That slot just filled up - please pick another time.",
        status: 409,
      };
    }
    throw err;
  }
}

/** Approve/deny a pending booking. On approve, approved-count is re-checked
    against current capacity (the owner may have lowered it). */
export async function decideBooking(
  db: Firestore,
  businessId: string,
  bookingId: string,
  decision: "approved" | "denied"
): Promise<
  { ok: true; booking: Booking } | { ok: false; error: string; status: number }
> {
  const ref = db.collection("bookings").doc(bookingId);
  try {
    const decided = await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      const d = doc.data();
      if (!doc.exists || d?.businessId !== businessId) throw new Error("NOT_FOUND");
      if (d?.status !== "pending") throw new Error("ALREADY_DECIDED");
      if (decision === "approved") {
        const [approved, bizDoc] = await Promise.all([
          t.get(
            db
              .collection("bookings")
              .where("businessId", "==", businessId)
              .where("date", "==", d.date)
              .where("time", "==", d.time)
              .where("status", "==", "approved")
          ),
          t.get(db.collection("lunaPartners").doc(businessId)),
        ]);
        const cap = parseBookingSettings(bizDoc.data()?.booking).capacityPerSlot;
        if (approved.size >= cap) throw new Error("SLOT_FULL");
      }
      const decidedAt = new Date().toISOString();
      t.update(ref, { status: decision, decidedAt });
      return { doc, decidedAt };
    });
    const booking = docToBooking(decided.doc);
    booking.status = decision;
    booking.decidedAt = decided.decidedAt;
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Booking not found.", status: 404 };
    }
    if (err instanceof Error && err.message === "ALREADY_DECIDED") {
      return { ok: false, error: "This booking was already decided.", status: 409 };
    }
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return {
        ok: false,
        error: "That slot already has a full set of approved bookings.",
        status: 409,
      };
    }
    throw err;
  }
}

export async function listBookings(
  db: Firestore,
  businessId: string
): Promise<Booking[]> {
  const snap = await db
    .collection("bookings")
    .where("businessId", "==", businessId)
    .get();
  // Sorted in memory to avoid a composite index; newest requests first.
  return snap.docs
    .map(docToBooking)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 500);
}

export async function findBookingByToken(
  db: Firestore,
  token: string
): Promise<Booking | null> {
  if (!token || token.length < 20) return null;
  const snap = await db
    .collection("bookings")
    .where("statusToken", "==", token)
    .limit(1)
    .get();
  return snap.empty ? null : docToBooking(snap.docs[0]);
}
```

- [ ] **Step 2: Verify typecheck and existing tests still pass**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean; all Task 1 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking-server.ts
git commit -m "feat: Firestore booking helpers with transactional capacity checks"
```

---

### Task 3: Email module (Resend REST, graceful no-key fallback)

**Files:**
- Create: `src/lib/email.ts`

**Interfaces:**
- Consumes (Task 1): `Booking` from `@/lib/booking`; `formatDay` from `@/lib/format` (existing: `formatDay(iso: string): string`).
- Produces (used by Tasks 4 and 7):
  - `type BookingEmailKind = "received" | "approved" | "denied"`
  - `sendBookingEmail(kind: BookingEmailKind, booking: Booking, businessName: string, statusUrl: string): Promise<void>` — never throws.
- Env vars: `RESEND_API_KEY` (optional), `BOOKING_EMAIL_FROM` (optional, defaults to Resend's onboarding sender).

- [ ] **Step 1: Implement the module**

Create `src/lib/email.ts`:

```ts
import "server-only";
import { formatDay } from "@/lib/format";
import type { Booking } from "@/lib/booking";

/* Transactional booking emails via the Resend REST API (plain fetch, no SDK).
   Without RESEND_API_KEY every send is a logged no-op so bookings keep
   working - the same graceful degradation as running without Firebase keys.
   Failures are logged and never block the booking flow. */

export type BookingEmailKind = "received" | "approved" | "denied";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function template(
  kind: BookingEmailKind,
  booking: Booking,
  businessName: string,
  statusUrl: string
): { subject: string; html: string } {
  const when = `${formatDay(booking.date)} at ${booking.time}`;
  const biz = esc(businessName);
  const name = esc(booking.name);
  const line =
    kind === "received"
      ? `We received your reservation request for <strong>${when}</strong> (party of ${booking.partySize}). We'll email you as soon as ${biz} makes a decision.`
      : kind === "approved"
        ? `Your reservation for <strong>${when}</strong> (party of ${booking.partySize}) is confirmed. See you there!`
        : `Unfortunately ${biz} couldn't accommodate your reservation for <strong>${when}</strong>. You're welcome to request a different time.`;
  const subject =
    kind === "received"
      ? `Reservation request received - ${businessName}`
      : kind === "approved"
        ? `Reservation confirmed - ${businessName}`
        : `Reservation update - ${businessName}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1b20">
      <h2 style="margin:0 0 16px">${biz}</h2>
      <p style="margin:0 0 12px">Hi ${name},</p>
      <p style="margin:0 0 16px;line-height:1.55">${line}</p>
      <p style="margin:0 0 24px">
        <a href="${statusUrl}" style="display:inline-block;background:#1a1b20;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">
          View booking status
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#6b6e76">Or copy this link: ${statusUrl}</p>
    </div>`;
  return { subject, html };
}

export async function sendBookingEmail(
  kind: BookingEmailKind,
  booking: Booking,
  businessName: string,
  statusUrl: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[email] RESEND_API_KEY not set - skipping "${kind}" email to ${booking.email}`
    );
    return;
  }
  const { subject, html } = template(kind, booking, businessName, statusUrl);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.BOOKING_EMAIL_FROM ?? "Bookings <onboarding@resend.dev>",
        to: [booking.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[email] resend failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[email] resend error:", err);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: booking transactional emails via Resend with no-key fallback"
```

---

### Task 4: Public API routes — slots + request

**Files:**
- Create: `app/api/bookings/slots/route.ts`
- Create: `app/api/bookings/request/route.ts`

**Interfaces:**
- Consumes: `getAdminDb` from `@/lib/firebase-admin`; `computeSlots`, `validateBookingRequest` (Task 1); `getBusinessById`, `takenBySlot`, `createBooking`, `todayStr` (Task 2); `sendBookingEmail` (Task 3).
- Produces (consumed by the public pages in Task 6):
  - `GET /api/bookings/slots?businessId=X&date=YYYY-MM-DD` → `200 { business: { id, name }, settings: { slotMinutes, daysOpen }, slots: Array<{ time, remaining }> }`; `slots` is `[]` when `date` is omitted. `404` when unknown business or bookings disabled, `400` missing businessId, `503` no Firebase.
  - `POST /api/bookings/request` body `{ businessId, name, email, phone?, partySize, date, time, note? }` → `200 { ok: true, statusToken, statusUrl }`; `409` slot full; `400` validation; `404`/`503` as above.

- [ ] **Step 1: Implement the slots route**

Create `app/api/bookings/slots/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeSlots } from "@/lib/booking";
import { getBusinessById, takenBySlot, todayStr } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Public: available slots for a business + date. Powers /book/[businessId]. */
export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const business = await getBusinessById(db, businessId);
  if (!business || !business.settings.enabled) {
    return NextResponse.json(
      { error: "This business is not accepting bookings." },
      { status: 404 }
    );
  }

  const slots = date
    ? computeSlots(
        business.settings,
        date,
        todayStr(),
        await takenBySlot(db, businessId, date)
      )
    : [];

  return NextResponse.json({
    business: { id: business.id, name: business.businessName },
    settings: {
      slotMinutes: business.settings.slotMinutes,
      daysOpen: business.settings.daysOpen,
    },
    slots,
  });
}
```

- [ ] **Step 2: Implement the request route**

Create `app/api/bookings/request/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateBookingRequest } from "@/lib/booking";
import { createBooking, getBusinessById, todayStr } from "@/lib/booking-server";
import { sendBookingEmail } from "@/lib/email";

export const runtime = "nodejs";

/* Public: submit a reservation request. Creates a pending booking (capacity
   checked in a transaction) and emails the customer their status link. */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const businessId = typeof data.businessId === "string" ? data.businessId : "";
  const business = businessId ? await getBusinessById(db, businessId) : null;
  if (!business || !business.settings.enabled) {
    return NextResponse.json(
      { error: "This business is not accepting bookings." },
      { status: 404 }
    );
  }

  const v = validateBookingRequest(data, business.settings, todayStr());
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const result = await createBooking(db, business, v.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const statusUrl = `${new URL(req.url).origin}/book/status/${result.booking.statusToken}`;
  await sendBookingEmail("received", result.booking, business.businessName, statusUrl);

  return NextResponse.json({
    ok: true,
    statusToken: result.booking.statusToken,
    statusUrl,
  });
}
```

- [ ] **Step 3: Typecheck and smoke-test the 503 path**

Run: `npm run typecheck`
Expected: clean.

Then (dev server without Firebase keys returns the graceful 503):

```bash
npm run dev &
sleep 8
curl -s "http://localhost:3000/api/bookings/slots?businessId=x" | head -c 200
kill %1
```

Expected output contains: `{"error":"Bookings are not available right now."}` (or, with real Firebase keys configured, a 404 "not accepting bookings" for the fake id — both prove the route is wired).

- [ ] **Step 4: Commit**

```bash
git add app/api/bookings/slots/route.ts app/api/bookings/request/route.ts
git commit -m "feat: public booking APIs - slot availability and request submission"
```

---

### Task 5: Status lookup — API route + public status page

**Files:**
- Create: `app/api/bookings/status/[token]/route.ts`
- Create: `app/book/status/[token]/page.tsx`

**Interfaces:**
- Consumes: `getAdminDb`; `findBookingByToken`, `getBusinessById` (Task 2); `Card`, `StatusBadge` (existing UI); `formatDay` (existing).
- Produces:
  - `GET /api/bookings/status/[token]` → `200 { booking: { name, partySize, date, time, status, note }, businessName }` or `404`. (Public-safe subset — no email/phone/ids.)
  - Page `/book/status/[token]` — server-rendered status card.

- [ ] **Step 1: Implement the status API route**

Create `app/api/bookings/status/[token]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { findBookingByToken, getBusinessById } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Public: booking status by unguessable token. Returns a public-safe subset
   only - never email, phone or document ids. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Bookings are not available right now." },
      { status: 503 }
    );
  }
  const { token } = await params;
  const booking = await findBookingByToken(db, token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  const business = await getBusinessById(db, booking.businessId);
  return NextResponse.json({
    businessName: business?.businessName ?? "",
    booking: {
      name: booking.name,
      partySize: booking.partySize,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      note: booking.note ?? null,
    },
  });
}
```

- [ ] **Step 2: Implement the status page**

Create `app/book/status/[token]/page.tsx`:

```tsx
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { getAdminDb } from "@/lib/firebase-admin";
import { findBookingByToken, getBusinessById } from "@/lib/booking-server";
import { formatDay } from "@/lib/format";
import type { BookingStatus } from "@/lib/booking";

export const dynamic = "force-dynamic";

/* Public status page - the link customers get on screen and by email.
   Live status of one booking; refresh to see decision updates. */

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "pending",
  approved: "positive",
  denied: "negative",
  cancelled: "neutral",
};

const HEADLINE: Record<BookingStatus, string> = {
  pending: "Your request is waiting for a decision",
  approved: "You're booked!",
  denied: "This request couldn't be accommodated",
  cancelled: "This booking was cancelled",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ad-panel)] p-4">
      <Card className="w-full max-w-md p-8">{children}</Card>
    </main>
  );
}

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getAdminDb();
  const booking = db ? await findBookingByToken(db, token) : null;
  const business = db && booking ? await getBusinessById(db, booking.businessId) : null;

  if (!db || !booking) {
    return (
      <Frame>
        <p className="text-sm font-semibold text-[var(--ad-ink)]">
          Booking not found
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          This status link is invalid or no longer available. Please check the
          link from your confirmation email.
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
        <CalendarCheck size={20} />
      </span>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight text-[var(--ad-ink)]">
          {HEADLINE[booking.status]}
        </h1>
        <StatusBadge tone={TONE[booking.status]}>{booking.status}</StatusBadge>
      </div>
      <dl className="mt-5 space-y-2.5 text-sm">
        {business?.businessName ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ad-muted)]">Business</dt>
            <dd className="font-medium text-[var(--ad-ink)]">{business.businessName}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">Name</dt>
          <dd className="font-medium text-[var(--ad-ink)]">{booking.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">When</dt>
          <dd className="font-medium text-[var(--ad-ink)]">
            {formatDay(booking.date)} at {booking.time}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ad-muted)]">Party size</dt>
          <dd className="font-medium text-[var(--ad-ink)]">{booking.partySize}</dd>
        </div>
      </dl>
      {booking.status === "pending" ? (
        <p className="mt-5 text-xs leading-relaxed text-[var(--ad-muted)]">
          We'll email you when a decision is made. This page always shows the
          live status.
        </p>
      ) : null}
    </Frame>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add app/api/bookings/status app/book/status
git commit -m "feat: booking status API and public status page"
```

---

### Task 6: Public booking page + request form

**Files:**
- Create: `src/components/booking/BookingRequestForm.tsx`
- Create: `app/book/[businessId]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/bookings/slots`, `POST /api/bookings/request` (Task 4 response shapes); `Card` (existing); `Slot` type (Task 1).
- Produces: page `/book/[businessId]` — date picker → slot grid → detail form → success panel with status link.

- [ ] **Step 1: Implement the form component**

Create `src/components/booking/BookingRequestForm.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Slot } from "@/lib/booking";

/* Public reservation form. Fetches availability per date from the slots API,
   posts the request, then shows the status link. No auth - customers use it. */

interface SlotsResponse {
  business: { id: string; name: string };
  settings: { slotMinutes: number; daysOpen: number[] };
  slots: Slot[];
}

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3.5 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-accent)] focus:outline-none";

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function BookingRequestForm({ businessId }: { businessId: string }) {
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusUrl, setStatusUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const loadSlots = useCallback(
    async (d: string) => {
      setLoadingSlots(true);
      setTime("");
      try {
        const qs = new URLSearchParams({ businessId, ...(d ? { date: d } : {}) });
        const res = await fetch(`/api/bookings/slots?${qs}`);
        if (!res.ok) {
          setUnavailable(true);
          return;
        }
        const data: SlotsResponse = await res.json();
        setBusinessName(data.business.name);
        setSlots(data.slots);
      } catch {
        setUnavailable(true);
      } finally {
        setLoadingSlots(false);
      }
    },
    [businessId]
  );

  // Initial load fetches the business name (empty date - no slots yet).
  useEffect(() => {
    void loadSlots("");
  }, [loadSlots]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, email, phone, partySize, date, time, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        if (res.status === 409) void loadSlots(date); // slot filled - refresh grid
        return;
      }
      setStatusUrl(data.statusUrl);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(statusUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (unavailable) {
    return (
      <Card className="w-full max-w-lg p-8">
        <p className="text-sm font-semibold text-[var(--ad-ink)]">
          Bookings unavailable
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          This business isn&apos;t accepting online reservations right now.
        </p>
      </Card>
    );
  }

  if (statusUrl) {
    return (
      <Card className="w-full max-w-lg p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-positive-bg)] text-[var(--ad-positive)]">
          <Check size={20} />
        </span>
        <h2 className="mt-4 text-lg font-bold tracking-tight text-[var(--ad-ink)]">
          Request sent!
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ad-muted)]">
          {businessName} will approve or deny your reservation. We emailed your
          status link to {email} - you can also track it here:
        </p>
        <div className="mt-4 flex items-center gap-2">
          <a
            href={statusUrl}
            className="min-w-0 flex-1 truncate rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel-2)] px-3.5 py-2.5 text-xs text-[var(--ad-ink-soft)]"
          >
            {statusUrl}
          </a>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy status link"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ad-line)] text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
        <CalendarCheck size={20} />
      </span>
      <h1 className="mt-4 text-lg font-bold tracking-tight text-[var(--ad-ink)]">
        {businessName ? `Reserve a spot at ${businessName}` : "Reserve a spot"}
      </h1>
      <p className="mt-1 text-sm text-[var(--ad-muted)]">
        Pick a date and time - your request is confirmed once the business
        approves it.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
            Date
          </span>
          <input
            type="date"
            required
            min={todayLocal()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) void loadSlots(e.target.value);
            }}
            className={inputCls}
          />
        </label>

        {date ? (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Time
            </span>
            {loadingSlots ? (
              <p className="text-sm text-[var(--ad-muted)]">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[var(--ad-muted)]">
                No times available on this date - try another day.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={s.remaining === 0}
                    onClick={() => setTime(s.time)}
                    className={`h-10 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                      time === s.time
                        ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                        : "border-[var(--ad-line)] text-[var(--ad-ink-soft)] hover:bg-[var(--ad-panel)]"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Your name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Party size
            </span>
            <input
              type="number"
              required
              min={1}
              max={100}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
              Phone (optional)
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything the business should know"
            className="w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3.5 py-2.5 text-sm text-[var(--ad-ink)] placeholder:text-[var(--ad-muted)] focus:border-[var(--ad-accent)] focus:outline-none"
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-[var(--ad-negative-bg)] px-3.5 py-2.5 text-sm text-[var(--ad-negative)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !date || !time}
          className="h-11 w-full rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Request reservation"}
        </button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Implement the page**

Create `app/book/[businessId]/page.tsx`:

```tsx
import { BookingRequestForm } from "@/components/booking/BookingRequestForm";

export const dynamic = "force-dynamic";

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
```

- [ ] **Step 3: Typecheck, lint, and commit**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

```bash
git add src/components/booking/BookingRequestForm.tsx "app/book/[businessId]"
git commit -m "feat: public booking page with slot picker and request form"
```

---

### Task 7: Owner API routes — list, decide, settings

**Files:**
- Create: `app/api/bookings/route.ts`
- Create: `app/api/bookings/[id]/decide/route.ts`
- Create: `app/api/bookings/settings/route.ts`

**Interfaces:**
- Consumes: `verifyBearer`, `getAdminDb` (existing); `getOwnedBusiness`, `listBookings`, `decideBooking` (Task 2); `parseBookingSettings` (Task 1); `sendBookingEmail` (Task 3).
- Produces (consumed by `BookingsManager` in Task 8):
  - `GET /api/bookings` (Bearer) → `200 { business: { id, name }, settings: BookingSettings, bookings: Booking[] }`; `401` no token; `404` no business profile; `503` no Firebase.
  - `POST /api/bookings/[id]/decide` (Bearer) body `{ decision: "approved" | "denied" }` → `200 { ok: true, booking }`; `400` bad decision; `404`/`409` from `decideBooking`.
  - `PUT /api/bookings/settings` (Bearer) body: partial settings object → `200 { ok: true, settings }` (parsed/clamped server-side).

- [ ] **Step 1: Implement the list route**

Create `app/api/bookings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { getOwnedBusiness, listBookings } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Owner: everything the dashboard Bookings page needs in one call. */
export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server is not configured for Firebase yet." },
      { status: 503 }
    );
  }
  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const business = await getOwnedBusiness(db, uid);
  if (!business) {
    return NextResponse.json({ error: "No business profile." }, { status: 404 });
  }
  const bookings = await listBookings(db, business.id);
  return NextResponse.json({
    business: { id: business.id, name: business.businessName },
    settings: business.settings,
    bookings,
  });
}
```

- [ ] **Step 2: Implement the decide route**

Create `app/api/bookings/[id]/decide/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { decideBooking, getOwnedBusiness } from "@/lib/booking-server";
import { sendBookingEmail } from "@/lib/email";

export const runtime = "nodejs";

/* Owner: approve or deny a pending booking, then email the customer. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server is not configured for Firebase yet." },
      { status: 503 }
    );
  }
  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const business = await getOwnedBusiness(db, uid);
  if (!business) {
    return NextResponse.json({ error: "No business profile." }, { status: 404 });
  }

  let decision: unknown;
  try {
    decision = (await req.json()).decision;
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "denied") {
    return NextResponse.json(
      { error: 'decision must be "approved" or "denied".' },
      { status: 400 }
    );
  }

  const { id } = await params;
  const result = await decideBooking(db, business.id, id, decision);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const statusUrl = `${new URL(req.url).origin}/book/status/${result.booking.statusToken}`;
  await sendBookingEmail(decision, result.booking, business.businessName, statusUrl);

  return NextResponse.json({ ok: true, booking: result.booking });
}
```

- [ ] **Step 3: Implement the settings route**

Create `app/api/bookings/settings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";
import { parseBookingSettings } from "@/lib/booking";
import { getOwnedBusiness } from "@/lib/booking-server";

export const runtime = "nodejs";

/* Owner: replace the `booking` settings map on the business doc. The body is
   run through parseBookingSettings so junk fields are repaired, not stored. */
export async function PUT(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server is not configured for Firebase yet." },
      { status: 503 }
    );
  }
  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const business = await getOwnedBusiness(db, uid);
  if (!business) {
    return NextResponse.json({ error: "No business profile." }, { status: 404 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const settings = parseBookingSettings(data);
  await db.collection("lunaPartners").doc(business.id).update({
    booking: settings,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, settings });
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add app/api/bookings/route.ts "app/api/bookings/[id]" app/api/bookings/settings
git commit -m "feat: owner booking APIs - list, approve/deny with email, settings"
```

---

### Task 8: Dashboard Bookings page, manager UI, mocks, sidebar entry

**Files:**
- Create: `src/lib/mock-bookings.ts`
- Create: `src/components/booking/BookingsManager.tsx`
- Create: `app/dashboard/bookings/page.tsx`
- Modify: `src/components/Sidebar.tsx` (BUSINESS_NAV, ~line 44)

**Interfaces:**
- Consumes: `useAuth` (existing: `{ demoMode, getToken, business }`), `getViewer` (existing server-auth), `GET /api/bookings` / `POST /api/bookings/[id]/decide` / `PUT /api/bookings/settings` (Task 7 shapes), `Booking`, `BookingSettings`, `DEFAULT_BOOKING_SETTINGS` (Task 1), `Card`, `CardHeader`, `PageHeader`, `StatusBadge`, `formatDay` (existing).
- Produces: `/dashboard/bookings` page; `MOCK_BOOKINGS: Booking[]` and `MOCK_BOOKING_SETTINGS: BookingSettings` for demo mode; "Bookings" item in the business sidebar.

- [ ] **Step 1: Create demo-mode mocks**

Create `src/lib/mock-bookings.ts`:

```ts
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
```

- [ ] **Step 2: Implement BookingsManager**

Create `src/components/booking/BookingsManager.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth-context";
import { formatDay } from "@/lib/format";
import {
  DEFAULT_BOOKING_SETTINGS,
  type Booking,
  type BookingSettings,
  type BookingStatus,
} from "@/lib/booking";
import { MOCK_BOOKINGS, MOCK_BOOKING_SETTINGS } from "@/lib/mock-bookings";

/* Owner view: pending requests with approve/deny, upcoming approved bookings
   grouped by date, booking settings, and the copyable public link. In demo
   mode (no Firebase) everything works against in-memory mock data. */

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "pending",
  approved: "positive",
  denied: "negative",
  cancelled: "neutral",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fieldCls =
  "h-10 w-full rounded-xl border border-[var(--ad-line)] bg-[var(--ad-paper)] px-3 text-sm text-[var(--ad-ink)] focus:border-[var(--ad-accent)] focus:outline-none";

export function BookingsManager() {
  const { demoMode, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [businessId, setBusinessId] = useState("demo");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (demoMode) {
      setBookings(MOCK_BOOKINGS);
      setSettings(MOCK_BOOKING_SETTINGS);
      setLoading(false);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load bookings.");
        return;
      }
      setBusinessId(data.business.id);
      setBookings(data.bookings);
      setSettings(data.settings);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [demoMode, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: "approved" | "denied") => {
    setDeciding(id);
    try {
      if (demoMode) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...b, status: decision, decidedAt: new Date().toISOString() }
              : b
          )
        );
        return;
      }
      const token = await getToken();
      const res = await fetch(`/api/bookings/${id}/decide`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed.");
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
    } finally {
      setDeciding(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      if (demoMode) return;
      const token = await getToken();
      const res = await fetch("/api/bookings/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed.");
        return;
      }
      setSettings(data.settings);
    } finally {
      setSavingSettings(false);
    }
  };

  const publicUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/book/${businessId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings
    .filter((b) => b.status === "approved")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const upcomingByDate = upcoming.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.date] ??= []).push(b);
    return acc;
  }, {});

  if (loading) {
    return (
      <>
        <PageHeader title="Bookings" />
        <Card className="p-8 text-sm text-[var(--ad-muted)]">Loading bookings…</Card>
      </>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <>
        <PageHeader title="Bookings" />
        <Card className="p-8">
          <p className="text-sm font-semibold text-[var(--ad-ink)]">
            Bookings unavailable
          </p>
          <p className="mt-1.5 text-sm text-[var(--ad-muted)]">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Approve or deny reservation requests from your public booking page."
        action={
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full border border-[var(--ad-line)] px-4 py-2.5 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy booking link"}
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-[var(--ad-negative-bg)] px-3.5 py-2.5 text-sm text-[var(--ad-negative)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {/* Pending requests */}
          <Card>
            <CardHeader
              title="Pending requests"
              action={
                pending.length ? (
                  <StatusBadge tone="pending">{pending.length} waiting</StatusBadge>
                ) : undefined
              }
            />
            {pending.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                No pending requests. New requests from your booking page land
                here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--ad-line)]">
                {pending.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ad-ink)]">
                        {b.name}
                        <span className="ml-2 font-normal text-[var(--ad-muted)]">
                          party of {b.partySize}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted)]">
                        {formatDay(b.date)} at {b.time}
                        {b.note ? ` - "${b.note}"` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={deciding === b.id}
                        onClick={() => void decide(b.id, "approved")}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--ad-ink)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={deciding === b.id}
                        onClick={() => void decide(b.id, "denied")}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--ad-line)] px-4 py-2 text-xs font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)] disabled:opacity-40"
                      >
                        <X size={13} /> Deny
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Upcoming approved */}
          <Card>
            <CardHeader title="Upcoming bookings" />
            {upcoming.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-[var(--ad-muted)]">
                Approved bookings show up here, grouped by day.
              </p>
            ) : (
              <div className="space-y-4 px-6 pb-6">
                {Object.entries(upcomingByDate).map(([date, items]) => (
                  <div key={date}>
                    <p className="mb-2 text-xs font-semibold text-[var(--ad-muted)]">
                      {formatDay(date)}
                    </p>
                    <ul className="space-y-2">
                      {items.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ad-line)] px-4 py-3"
                        >
                          <p className="min-w-0 flex-1 truncate text-sm text-[var(--ad-ink)]">
                            <span className="font-semibold">{b.time}</span>
                            <span className="ml-2">{b.name}</span>
                            <span className="ml-2 text-[var(--ad-muted)]">
                              party of {b.partySize}
                            </span>
                          </p>
                          <StatusBadge tone={TONE[b.status]}>{b.status}</StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Settings */}
        <Card className="h-fit">
          <CardHeader title="Booking settings" />
          <div className="space-y-4 px-6 pb-6">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[var(--ad-ink-soft)]">
                Accept online bookings
              </span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
                className="h-5 w-5 accent-[var(--ad-ink)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Opens
                </span>
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                  className={fieldCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Closes
                </span>
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                  className={fieldCls}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Slot length (min)
                </span>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={settings.slotMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, slotMinutes: Number(e.target.value) })
                  }
                  className={fieldCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                  Capacity per slot
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.capacityPerSlot}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      capacityPerSlot: Number(e.target.value),
                    })
                  }
                  className={fieldCls}
                />
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ad-ink-soft)]">
                Days open
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, i) => {
                  const on = settings.daysOpen.includes(i);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          daysOpen: on
                            ? settings.daysOpen.filter((d) => d !== i)
                            : [...settings.daysOpen, i].sort(),
                        })
                      }
                      className={`h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                        on
                          ? "border-[var(--ad-ink)] bg-[var(--ad-ink)] text-white"
                          : "border-[var(--ad-line)] text-[var(--ad-muted)] hover:bg-[var(--ad-panel)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={savingSettings}
              className="h-10 w-full rounded-full bg-[var(--ad-ink)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {savingSettings ? "Saving…" : demoMode ? "Save (demo)" : "Save settings"}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create the dashboard page**

Create `app/dashboard/bookings/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Add the sidebar item**

In `src/components/Sidebar.tsx`:

1. Add `CalendarCheck` to the existing `lucide-react` import block (alphabetical position, after `// Footprints`-adjacent imports is fine — keep the list tidy):

```ts
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  // MessageSquare,
  MessagesSquare,
  // Footprints,
  CalendarCheck,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
```

2. In `BUSINESS_NAV` (~line 44), insert Bookings after Messages:

```ts
const BUSINESS_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Messages", href: "/dashboard/chats", icon: MessagesSquare },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
```

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

```bash
git add src/lib/mock-bookings.ts src/components/booking/BookingsManager.tsx app/dashboard/bookings src/components/Sidebar.tsx
git commit -m "feat: dashboard Bookings page with approve/deny, settings and demo mode"
```

---

### Task 9: Final verification + env documentation

**Files:**
- Modify: `.env` (append commented placeholders only — do not touch existing values)

**Interfaces:**
- Consumes: everything above.
- Produces: verified feature; documented env vars.

- [ ] **Step 1: Full check suite**

```bash
npx vitest run && npm run typecheck && npm run lint && npm run build
```

Expected: tests PASS, typecheck clean, lint clean, `next build` succeeds with the new routes listed (`/book/[businessId]`, `/book/status/[token]`, `/dashboard/bookings`, `/api/bookings/*`).

- [ ] **Step 2: Manual demo-mode walkthrough**

```bash
npm run dev
```

Then verify in a browser (demo mode — no Firebase keys — or with real keys if configured):

1. `/dashboard/bookings` — sidebar shows "Bookings"; pending mock requests render; Approve moves one to Upcoming; Deny removes it from pending; settings panel edits work.
2. `/book/demo` — with no Firebase keys the form shows the graceful "Bookings unavailable" card (the API 503s); with real keys and an enabled business, the full request flow works.
3. `/book/status/anything` — renders the friendly "Booking not found" card.

Report what was actually observed — do not claim success without doing this.

- [ ] **Step 3: Document env vars**

Append to `.env` (comments only, keep existing content):

```bash
# Booking emails (optional - without a key, emails are skipped gracefully)
# RESEND_API_KEY=re_...
# BOOKING_EMAIL_FROM="Bookings <bookings@yourdomain.com>"
```

- [ ] **Step 4: Commit**

```bash
git add .env 2>/dev/null || true
git commit -am "chore: booking env docs and final verification"
```

Note: if `.env` is gitignored (likely), the commit will only contain other stragglers; that's fine — skip the commit if nothing is staged.

---

## Deferred / Out of Scope (from spec)

- Manual email blasts (compose-to-many) — follow-up feature.
- Named resources (tables/rooms), customer self-cancellation, reminders, platform-admin cross-business views.
- The `cancelled` status is in the model but no UI sets it yet — reserved for the follow-up.
