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

describe("same-day past-slot filtering", () => {
  it("computeSlots hides slots at or before nowTime on today", () => {
    const slots = computeSlots(SETTINGS, MONDAY, MONDAY, {}, "10:30");
    expect(slots.map((s) => s.time)).toEqual(["11:00", "11:30"]);
  });
  it("computeSlots ignores nowTime for future dates", () => {
    const slots = computeSlots(SETTINGS, MONDAY, TODAY, {}, "23:00");
    expect(slots).toHaveLength(4);
  });
  it("validateBookingRequest rejects past times today, accepts future ones", () => {
    const base = { name: "Ada", email: "ada@example.com", phone: "", partySize: 2, date: MONDAY, time: "10:00", note: "" };
    expect(validateBookingRequest(base, SETTINGS, MONDAY, "10:30").ok).toBe(false);
    expect(validateBookingRequest({ ...base, time: "11:00" }, SETTINGS, MONDAY, "10:30").ok).toBe(true);
    expect(validateBookingRequest(base, SETTINGS, TODAY).ok).toBe(true); // no nowTime, future date
  });
});
