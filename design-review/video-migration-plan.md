# Video Consultation — Safe Migration Plan

Date: 2026-10-13 · Scope: `src/pages/VideoCallPage.tsx`,
`src/pages/CallPage.tsx`, `vercel.json` CSP, new DB migration,
new Supabase Edge Function.

Status: proposal only. No implementation in this document.

---

## 1. Current state and why it must change

### 1.1 What exists today
- `src/pages/VideoCallPage.tsx` embeds a `meet.jit.si` iframe keyed to
  the appointment UUID.
- `src/pages/CallPage.tsx` opens a `meet.jit.si` URL in a new browser
  tab, keyed to the conversation UUID.
- `vercel.json` CSP permits `frame-src https://meet.jit.si` for this
  reason.
- No DB record of who joined, when, or for how long.

### 1.2 Risks (Phase 1 audit, master §32, master §4F/§13)
1. **Open room by UUID.** Any party in possession of the appointment or
   conversation UUID can join. UUIDs travel in URLs, logs, screenshots,
   push payloads, Realtime channels, and `conversation_participants`
   rows. The room is effectively public to anyone who sees the id.
2. **No audit trail.** No way to prove who was in a consultation, or
   when, or whether it happened at all.
3. **No consent capture.** Act 843 §18 (consent) and §37 (special
   personal data) treat a video consult as recordable medical data —
   patient consent should be captured + persisted.
4. **No lobby / moderator PIN.** Jitsi's community server has rolling
   policy; `meet.jit.si` strips moderator rights after the first joiner
   leaves, so there's nothing to even enforce.
5. **CSP breadth.** `frame-src meet.jit.si` is a necessary carve-out
   today; the policy stays tighter after Jitsi is replaced.

**Severity (joined with Phase 1):** HIGH. This is the single
highest-impact security finding on Doctor Cares and the only one that
could expose live PHI to third parties mid-consultation.

## 2. Provider decision — three paths

Each path has implications for cost, Ghana data-residency, and
compliance effort. None is a "turnkey" choice without legal input.

| Path | Setup effort | Monthly cost (est.) | Data residency | Ghana DPA §60 story | HIPAA/BAA story |
|---|---|---|---|---|---|
| **A. Self-hosted Jitsi** on a Ghana-region VPS (DigitalOcean Johannesburg, Scaleway, or a Ghanaian host) | Medium — install Jitsi + Prosody + JWT auth; harden; monitor | $20–60/mo for the host + $0 Jitsi licensing | You control it — resides in your chosen region | Easiest story — no cross-border transfer | No vendor BAA; you ARE the business associate |
| **B. Daily.co** | Low — SDK is high quality; waiting rooms + recording built in | $0.0015/participant-minute (free tier generous) | US-hosted | Cross-border transfer; requires explicit assessment | Vendor BAA available on Scale plan |
| **C. Twilio Video** | Medium | $0.004/participant-minute | US-hosted | Same as Daily | Vendor BAA available |

**Recommendation** (not a decision): **Path A (self-hosted Jitsi)** for a
Ghana-first launch. Minimises third-party data-controller surface. Pivot
to Path B if operational burden is unsustainable; pivot to Path C only
if neither of the above meets a contract requirement.

## 3. Target architecture (provider-agnostic)

```
┌─────────────┐  (1) GET /appointments/:id       ┌──────────────┐
│  Patient    │ ──────────────────────────────▶ │  Supabase    │
│  / Doctor   │                                  │  Postgres    │
└──────┬──────┘  (2) RLS confirms participant    │  + RLS       │
       │                                         └──────────────┘
       │ (3) POST /functions/v1/mint-call-token
       │        { appointment_id }
       │                                         ┌──────────────┐
       └────────────────────────────────────────▶│ Edge Function│
                                                 │ (verifies    │
                                                 │  JWT caller  │
                                                 │  is a party; │
                                                 │  signs short-│
                                                 │  lived room  │
                                                 │  JWT)        │
                                                 └──────┬───────┘
                                                        │ (4) room JWT
                                                        ▼
                                                 ┌──────────────┐
                                                 │ Video        │
                                                 │ provider     │
                                                 │ (self-hosted │
                                                 │ Jitsi or     │
                                                 │ Daily/Twilio)│
                                                 └──────────────┘
                                                        │
                                 (5) emit join/leave events
                                                        ▼
                                                 ┌──────────────┐
                                                 │ Supabase     │
                                                 │ call_events  │
                                                 │ (audit log)  │
                                                 └──────────────┘
```

## 4. Migrations required

### 4.1 New table `public.call_events`
```sql
create table public.call_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  user_id         uuid not null references public.profiles(id)     on delete restrict,
  event_type      text not null check (event_type in ('join','leave','consent_given','consent_declined')),
  at              timestamptz not null default now(),
  metadata        jsonb
);
create index on public.call_events (appointment_id, at);

alter table public.call_events enable row level security;

-- A participant can read their own appointment's events.
create policy "call_events_select" on public.call_events for select
  using (
    exists (
      select 1 from public.appointments a
      where a.id = call_events.appointment_id
        and (a.patient_id = auth.uid() or a.doctor_id = auth.uid())
    )
  );

-- Writes only via the Edge Function (SERVICE_ROLE), never direct.
create policy "call_events_insert" on public.call_events for insert
  with check (false);
```

### 4.2 Optional column on `appointments`
```sql
alter table public.appointments
  add column consent_at timestamptz;
```
Patient's one-tap "I consent to this video consultation" writes to
`consent_at`. Doctor-side has the same column for their consent; a
second column `doctor_consent_at` can be added if clinical workflow
requires it.

## 5. New Edge Function — `mint-call-token`

```ts
// supabase/functions/mint-call-token/index.ts
// Verifies: the caller is auth'd AND the caller is either the patient
// or the doctor on the appointment, AND the appointment is 'confirmed'
// AND the start time is within [-15min, duration+15min].
// Returns: provider-specific short-lived JWT or room URL,
// writes a 'join' row to call_events.
```

- Must use the Supabase `SERVICE_ROLE` key (never shipped to the
  client).
- `aud`, `exp` on the room JWT cap at ~5 minutes.
- Token refresh if the consult runs long: client calls the function
  again as needed.

## 6. Client-side changes

- `src/pages/VideoCallPage.tsx`:
  - On mount: show "You are about to join a confidential video
    consultation" consent sheet.
  - On consent: `fetch('/functions/v1/mint-call-token', { … })` →
    receive room token → mount provider SDK with it.
  - On consent decline: `event_type='consent_declined'` row written;
    user bounced to appointment detail with a notice.
  - On provider's `participant-joined` / `participant-left` events: no
    client-side DB write (Edge Function writes server-side on token
    mint + on provider webhook).
- `src/pages/CallPage.tsx`:
  - Same consent + token flow. Open the provider in-app via its SDK
    rather than in a new tab, so the iframe-vs-tab divergence closes.

## 7. CSP update

Once the provider is chosen:

- Path A (self-hosted): replace `frame-src https://meet.jit.si` with
  `frame-src https://<your-jitsi-host>`.
- Path B (Daily): add `script-src 'self' https://*.daily.co` +
  `connect-src 'self' https://*.daily.co wss://*.daily.co` +
  `frame-src https://*.daily.co`. Drop the Jitsi carve-out.
- Path C (Twilio): similar to B but with Twilio origins.

## 8. Staged rollout plan (behind an env flag)

1. Build the back end: migration + Edge Function. Deploy to the Supabase
   test project first.
2. Build the client paths behind `VITE_VIDEO_PROVIDER=jitsi-selfhost`
   (or similar). Default remains `meet.jit.si` until flipped.
3. Enable the flag in a staging environment (new Vercel project or
   preview deploy). Run the §9 verification scenarios.
4. Flip the flag on production. Observe `call_events` for 1 week.
5. Delete the `meet.jit.si` code path and drop the CSP carve-out.

## 9. Verification scenarios (manual)

1. Participant with valid appointment → consent → token → join → leave
   → `call_events` has 2 rows.
2. Non-participant acquires the appointment UUID → calls Edge Function
   → **403**. No row written.
3. Participant tries to join 30 min before start → **403** (outside the
   window).
4. Participant declines consent → `consent_declined` row written → no
   token issued.
5. Both parties join → consult completes → doctor marks completed → the
   event log is retrievable via `appointment_details` for both parties.
6. Patient opens the appointment URL on a device they're not signed in
   on → login required (handled by `ProtectedRoute`) → still goes
   through consent + token flow.

## 10. Decisions still needed before coding

1. Provider path (A, B, or C).
2. If A: hosting region, operational owner, monitoring tool.
3. Should doctor consent be captured separately or inferred from role?
4. Retention policy for `call_events` (Act 843 §24 — minimum retention
   period).
5. Whether consultation recording is a product requirement. If yes,
   substantially different privacy posture; needs legal input.

## 11. Scope — what this plan does NOT fix

- Push-notification path for "doctor just joined". That is the
  notifications feature and is separate.
- Chat during the consult (text/voice/image already exists).
- Payment at consultation time.
- Any waiting-room queueing beyond the simple "wait for the other
  party" state.
