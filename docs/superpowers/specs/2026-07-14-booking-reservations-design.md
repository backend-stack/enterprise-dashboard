# Booking & Reservations — Design Spec

**Date:** 2026-07-14
**Branch:** `feature/booking-reservations`
**Status:** Approved by user (brainstorming session)

## Summary

Customers reserve time slots at a business through a public booking page. Each
request lands in the business dashboard as **pending**, where the owner
approves or denies it. Customers follow their booking through a unique status
link and receive transactional emails (via Resend) when they request and when
a decision is made.

## Decisions Made

| Decision | Choice |
|---|---|
| Booking source | Public booking page in this app |
| Spot model | Time slots: open hours + slot length + capacity per slot |
| Approval | Every request starts pending; owner approves/denies |
| Customer notification | Unique status link **and** transactional email |
| Email service | Resend (`RESEND_API_KEY`), graceful no-key fallback |
| Email scope | Per-booking only: request received, approved, denied |
| Database | Existing Firestore project — no separate database. New top-level `bookings` collection; settings on the `lunaPartners` doc. All access via API routes + `src/lib` helpers so storage could be swapped later |

## Data Model (Firestore)

### `bookings/{id}`

| Field | Type | Notes |
|---|---|---|
| `businessId` | string | `lunaPartners` doc id |
| `name` | string | customer name |
| `email` | string | customer email (for status emails) |
| `phone` | string? | optional |
| `partySize` | number | ≥ 1 |
| `date` | string | `YYYY-MM-DD` |
| `time` | string | `HH:mm`, start of slot |
| `status` | string | `pending` \| `approved` \| `denied` \| `cancelled` |
| `statusToken` | string | random, unguessable; public status lookups |
| `note` | string? | optional customer note |
| `createdAt` | Timestamp | server time |
| `decidedAt` | Timestamp? | set on approve/deny |

### Booking settings — `lunaPartners/{id}.booking` (map)

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | master switch; public page shows an unavailable state when off |
| `openTime` | string | `HH:mm` |
| `closeTime` | string | `HH:mm` |
| `slotMinutes` | number | e.g. 30 |
| `capacityPerSlot` | number | max bookings (approved + pending) per slot |
| `daysOpen` | number[] | 0–6, days of week bookable |

## Pages

### Public (no auth)

- **`/book/[businessId]`** — booking request page. Customer picks a date,
  sees available slots (capacity minus approved + pending), enters
  name / email / party size / optional note, submits. On success: status link
  shown on screen and emailed.
- **`/book/status/[token]`** — live status of one booking
  (pending / approved / denied / cancelled). Invalid or unknown tokens render
  a clean not-found state.

### Dashboard

- **`/dashboard/bookings`** (new sidebar item "Bookings" in `BUSINESS_NAV`):
  - Pending requests first, each with Approve / Deny.
  - Upcoming approved bookings below, grouped by date.
  - Settings panel: hours, slot length, capacity, days open, enable toggle.
  - Copyable public booking link.
  - Demo mode (no Firebase keys): mock bookings so the page is fully
    browsable, matching the app's existing demo pattern.

## API Routes

All follow the existing pattern: `runtime = "nodejs"`, admin SDK via
`getAdminDb()`, owner routes authenticated with `verifyBearer` and checked
against the business's `firebaseUid`.

| Route | Auth | Behavior |
|---|---|---|
| `GET /api/bookings/slots?businessId&date` | public | available slots for a date |
| `POST /api/bookings/request` | public | validate slot in a transaction, create pending booking, send "request received" email |
| `GET /api/bookings/status/[token]` | public | booking status by token |
| `GET /api/bookings` | owner | list own business's bookings |
| `POST /api/bookings/[id]/decide` | owner | approve/deny; stamps `decidedAt`; capacity re-checked in a transaction on approve; sends decision email |
| `PUT /api/bookings/settings` | owner | update `booking` map on the business doc |

## Email (`src/lib/email.ts`)

- Resend SDK, key from `RESEND_API_KEY`.
- Three templates: **request received**, **approved**, **denied** — every one
  includes the status link.
- Without the key, email sending is skipped with a server-side log; bookings
  and the status link keep working (same graceful-degradation philosophy as
  the Firebase-less demo mode).

## Error Handling

- **Slot race:** capacity is checked inside a Firestore transaction at
  request time and re-checked at approval. The losing customer gets a
  friendly "that slot just filled up" message with remaining slots.
- **Bad input:** server-side validation of date/time/party size against the
  business's booking settings; 400 with a clear message.
- **Unknown business / bookings disabled:** public page renders a friendly
  unavailable state.
- **Email failure:** logged, never blocks the booking or the decision.

## Out of Scope (this feature)

- Manual email blasts / compose-to-many (possible follow-up).
- Named resources (specific tables/rooms).
- Customer accounts, cancellation by customer, reminders.
- Platform-admin cross-business booking views.

## Testing

- `npm run typecheck` and `npm run lint` clean.
- Manual flow-through in demo mode (no keys) and against a live Firebase
  project: request → pending in dashboard → approve → status page + email
  reflect it; deny path likewise; capacity exhaustion hides the slot.
