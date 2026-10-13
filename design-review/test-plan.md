# Doctor Cares — Test Plan

Date: 2026-10-13 · Scope: auth, appointments, doctor permissions,
patient privacy, Supabase RLS, chat realtime, notifications.

Status: plan only. No test code committed yet (Vitest + Playwright not
installed; needs explicit approval).

---

## 1. Prerequisites

- **Dedicated Supabase test project.** Must not be your production
  project. Apply migrations `0001`–`0028` to it in order. Create at
  least 4 test accounts: 2 patients, 1 doctor, 1 admin.
- **Local `.env.test`** with:
  - `VITE_SUPABASE_URL_TEST`
  - `VITE_SUPABASE_ANON_KEY_TEST`
  - test account emails + passwords (never committed; `.gitignored`).
- **Dependencies to install** (requires approval):
  - `vitest`, `@vitest/ui`, `@testing-library/react`,
    `@testing-library/jest-dom`, `@testing-library/user-event`,
    `jsdom` — for unit + integration.
  - `@playwright/test` — for E2E.
- **New npm scripts** (added at the same time):
  - `"test": "vitest"`
  - `"test:rls": "vitest run tests/rls"`
  - `"test:e2e": "playwright test"`

## 2. Risk-weighted test priorities

| Area | Priority | Rationale |
|---|---|---|
| RLS attack surface | **P0** | PHI exposure risk; Phase 1 finding; Act 843 §17(f) |
| Booking race safety | **P0** | Double-book prevention is architecturally critical |
| Auth happy path + password reset | **P1** | Universal flow |
| Patient privacy (medical history, prescriptions) | **P0** | PHI |
| Doctor permissions (patients list, chat, appointments) | **P0** | PHI, role gating |
| Chat realtime roundtrip | **P1** | Only end-to-end way to verify Realtime wiring |
| Notification triggers | **P1** | Behaviour cascade; silent regressions easy |
| Appointment status transitions | **P1** | Patient visible state |
| Supabase SW cache behaviour | **P2** | Covered by Phase 1 vite.config.ts change — spot-check |
| i18n locale switching | **P3** | Non-functional degradation only |

---

## 3. RLS attack suite (P0)

**Goal**: prove that no table is readable or writable to anyone who
should not see it. Each test runs as an anon user A and attempts an
operation on data belonging to anon user B.

### 3.1 `profiles`
- A reads `profiles` → returns exactly 1 row (self).
- A reads `profiles` filtered by B's id → 0 rows.
- A updates B's `profiles` row → 0 rows affected.
- A inserts a row with a fake uuid → **403**.
- A reads a verified doctor's profile → 1 row (marketplace listing is
  intentional).

### 3.2 `appointments`
- Patient A reads appointments → only sees rows where
  `patient_id = A.uid`.
- Patient A reads appointments filtered by B's id → 0 rows.
- Doctor D reads appointments → only sees rows where
  `doctor_id = D.uid`.
- Doctor D inserts an appointment for a random patient → **403**
  (`appointments RLS violation`).
- EXCLUSION constraint: two concurrent `insert`s on
  `(doctor_id, scheduled_at)` → exactly one succeeds, the other errors
  `appointments_no_overlap`.
- Non-participant updates `cancel_reason` → 0 rows affected.

### 3.3 `messages` + `conversations`
- Non-participant reads messages for a conversation → 0 rows.
- Non-participant inserts a message in another conversation → **403**.
- Participant marks a message read → `conversation_participants
  .last_read_at` advances.

### 3.4 `availability` + `blocked_dates`
- Any authenticated user reads a verified doctor's availability → 1+
  rows (marketplace).
- Patient updates another doctor's availability → **403**.

### 3.5 `prescriptions`
- Patient reads prescriptions → own rows only.
- Doctor reads prescriptions → only rows they authored OR patients they
  share an appointment with.
- Admin reads prescriptions → all rows.

### 3.6 `notifications`
- A reads notifications → self only.
- A deletes B's notifications → 0 rows affected.

### 3.7 `reports`
- Patient / doctor reads `reports` → 0 rows.
- Admin reads `reports` → all rows.

### 3.8 `push_tokens`
- A inserts a token for themselves → OK.
- A inserts a token for B → **403**.
- A reads B's tokens → 0 rows.

### 3.9 `promote_to_admin` RPC
- Non-admin calls → **403** / function-level block.
- Admin calls on self → OK.
- Admin calls on another user → OK.

### 3.10 Storage
- Patient reads another patient's avatar → OK (bucket is public).
- Patient reads another patient's chat attachment → **403** (private
  bucket; signed URL required).
- Patient uploads a chat attachment to another conversation → **403**.

---

## 4. Booking race test (P0)

- Two Supabase clients, same doctor + same `scheduled_at`.
- Fire two `insert`s in parallel (`Promise.all([insert1, insert2])`).
- Assert: exactly one resolves successfully; the other rejects with
  `appointments_no_overlap`.
- Variant: three concurrent inserts → exactly one succeeds.

---

## 5. Auth tests (P1)

### 5.1 Happy path
- Sign up with a new email → row inserted into `auth.users` and
  `public.profiles`.
- Sign out → session cleared.
- Sign in with the same email + password → session restored.

### 5.2 Password policy (`src/lib/password.ts`)
- Reject passwords < 8 chars, missing uppercase, missing digit, missing
  symbol — one assertion per rule.

### 5.3 Password reset
- Request reset for an existing email → OK (don't block on inbox).
- Request reset for a non-existent email → OK (anti-enumeration).
- Reset with a valid recovery session → password changes.

### 5.4 Captcha
- `signInWithPassword` without a `captchaToken` fails with the Supabase
  Auth config set to captcha-required.
- With a valid captcha token → OK.

### 5.5 OAuth
- `signInWithOAuth('google')` returns `provider not enabled` error
  gracefully if Google is off in Supabase (current state).

### 5.6 Idle timeout
- Mock the idle timer; after `IDLE_MS`, session clears → router
  redirects to `/login`.

---

## 6. Appointment status transitions (P1)

- `pending` → `confirmed` (doctor only).
- `pending` → `rejected` + `cancel_reason` captured via
  `DeclineReasonModal`.
- `confirmed` → `completed` (doctor only, after `scheduled_at`).
- `pending|confirmed` → `cancelled` (patient).
- `rejected` cannot transition further.
- Patient receives a notification on each transition (see §9).

---

## 7. Patient privacy (P0)

- Patient A visits `/profile/medical-history` → sees only own data.
- Patient A attempts REST GET of B's `patient_profiles` row → 0 rows.
- Doctor assigned to Patient A visits patient-detail page → sees
  medical history fields.
- Doctor NOT assigned to Patient A visits same URL → `EmptyState`
  (RLS returns null; the UI shows "patient not found").
- After patient cancels appointment, doctor still assigned via
  historical row? **Design decision needed.** Current RLS via
  `shares_appointment_with()` is permissive once a row exists;
  tightening to "within the last 90 days" is a product + privacy
  decision for the clinical lead.

---

## 8. Doctor permissions (P0)

- Doctor D reads `/patients` → sees only patients they share an
  appointment with.
- Doctor D opens `/patients/:random-uuid` → 404 / empty state.
- Doctor D writes a prescription for a patient they share an
  appointment with → OK.
- Doctor D writes a prescription for an unrelated patient →
  Edge-function level block OR RLS **403**.
- Nurse role has the same route tree as doctor; nurse has restricted
  write surface (prescriptions should be doctor-only; verify).

---

## 9. Notification triggers (P1)

Triggers currently live in migration `0006_notifications.sql`:
- INSERT on `messages` → notification row for recipient.
- UPDATE on `appointments.status` → notification row for the other
  party.

Tests:
- Patient books appointment → doctor sees a `type='appointment'`
  notification.
- Doctor accepts → patient sees `type='appointment'` with status
  'confirmed'.
- Patient sends chat → doctor sees `type='message'` notification.
- Reminder cron (`send-reminders` Edge Function) runs → eligible
  appointments produce reminder notifications. Covers master §25
  "Appointment reminder".

---

## 10. Chat realtime roundtrip (P1)

- Open two Supabase clients: A (patient), B (doctor), both subscribed
  to `postgres_changes` on the shared conversation.
- A posts a message. Assert B's channel receives the INSERT event
  within 2000 ms.
- B marks the message read via `conversation_participants
  .last_read_at`. A's `unread_count` recomputes to 0.
- Image attachment: A uploads to the private bucket, generates a signed
  URL, sends a message with that URL. B's channel receives it. B can
  fetch the URL (signed-URL grant). Non-participant C **cannot**.

---

## 11. Appointments booking E2E (Playwright) — master §31

```
PATIENT:
  Login → Home → Search doctor → Open doctor → Book appointment →
  Select date → Select available time → Select consultation type →
  Confirm → Appointment becomes Pending

DOCTOR:
  Login → Dashboard → See pending request → Open request → Accept

PATIENT:
  Receive updated status → Appointment becomes Confirmed →
  View appointment → Join consultation when appropriate
```

Additional E2E flows:
- Doctor declines → patient sees "Declined" + reason card.
- Patient cancels → doctor sees "Cancelled".
- Reschedule (currently via re-book) → old row ends in `cancelled`,
  new row in `pending`.
- Chat exchange of 3 messages.
- Notifications bell shows unread badge count accurately.
- Logout clears session.

## 12. CSP smoke test

- `npm run build && npm run preview`.
- Visit login → signup → patient dashboard → book → confirm → chat →
  video (iframe).
- Browser DevTools "Issues" and "Console" panels must show zero
  "Blocked by CSP" entries.

## 13. PWA smoke test

- Install the PWA on a device (Chrome Android, Safari iOS).
- Offline load → `/offline.html` served.
- Sign out → `caches.keys()` returns zero entries related to Supabase
  (`AuthContext` purges them).
- Previously-cached Supabase JSON responses do not resurface after
  reload while offline — only the offline shell.

## 14. Reporting and CI

- `vitest` runs: `test:rls`, `test:unit` subsets.
- Playwright E2E: separate workflow; costs resources; run on PRs only.
- All suites publish to a human-readable HTML artefact.
- `--max-warnings 0` lint stays after `eslint` is installed.

## 15. Known gaps

- Push notifications are device-specific — can only be smoke-tested
  manually.
- Video (§11 "Join consultation") lands in the Jitsi iframe today. End
  of the video migration plan converts this into a token-gated flow
  that is itself testable.
- Payment is out of scope until payments feature exists.
- i18n coverage audit is a separate pass.

## 16. Approvals required before any of this test code is written

- Approval to install Vitest + Testing Library + jsdom + Playwright.
- Approval + provisioning of the dedicated Supabase test project.
- Credentials for the four test accounts (owned by you, never
  committed).
- Approval to add `.env.test` to the repo structure (gitignored).
