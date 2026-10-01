# Doctor Cares

**Healthcare. Anytime. Anywhere.**

A production-ready, mobile-first Progressive Web App **and** native Android app that
connects patients, doctors, and platform administrators. Patients book verified
doctors, chat in real time (text + image + voice + read receipts), and look up
any drug via the OpenFDA public API. Doctors manage weekly availability, accept
or reject booking requests, and message their patients. Admins run a web-only
console with KPIs, moderation queue, and doctor verification.

Built for Ghana (currency in Ghana Cedis, `GH₵`), but the stack is
locale-agnostic and easy to point at any market.

- 🌐 **Live web app** — [https://doctor-cares-ten.vercel.app](https://doctor-cares-ten.vercel.app)
- 📱 **Android** — packaged with Capacitor, signed APK/AAB ready for Play Store
- 🎨 **Design gallery** — [design-review/index.html](design-review/index.html)

---

## Table of contents

1. [The story](#the-story)
2. [Roles &amp; features](#roles--features)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project layout](#project-layout)
6. [Local development](#local-development)
7. [Database &amp; RLS](#database--rls)
8. [Web deployment (Vercel)](#web-deployment-vercel)
9. [Android build (Capacitor)](#android-build-capacitor)
10. [Security model](#security-model)
11. [Testing &amp; quality](#testing--quality)
12. [Known limitations](#known-limitations)
13. [Roadmap](#roadmap)

---

## The story

Waiting rooms are a bottleneck. Ghana has a doctor-to-patient ratio far below
the WHO recommendation, and most consultations are for non-critical things that
never needed to be in person — prescription refills, follow-ups, second
opinions, drug info.

**Doctor Cares** compresses that experience into a phone:

- A patient opens the app, picks a specialty, reads the doctor's profile, sees
  their real-time availability, books a slot for a video or clinic visit, and
  pays the consultation fee (payments are stubbed as GH₵ display for now — see
  [Roadmap](#roadmap)).
- Once booked, they can chat with the doctor before, during, and after the
  visit. Attachments (photos of a rash, voice describing symptoms) are
  end-to-end delivered via realtime channels.
- Doctors get their own dashboard — today's schedule, pending requests, weekly
  availability grid, patient list, chat inbox.
- Admins keep the platform trustworthy — verify doctor credentials, moderate
  reports, watch health metrics.

Everything is **installable as a PWA** on any device with a modern browser,
plus a signed **Android APK** for Play Store distribution. An iOS build is a
one-line change (`npx cap add ios`) on a Mac.

---

## Roles &amp; features

### Patient (mobile-first)

| Feature | Notes |
| --- | --- |
| Sign up / log in | Email + password with strength rules (8 chars, upper, lower, digit, symbol) or OAuth (Google/Apple wired but disabled at Supabase) |
| Home dashboard | Greeting, quick search, promo card, health snapshot (sample data), service tiles |
| Find doctors | Filter by specialty, search by name |
| Doctor profile | Bio, fee (GH₵), modes (video/clinic), languages, reviews, location |
| Book appointment | Real-time slot availability with 5-day date picker, race-safe via Postgres EXCLUSION constraint |
| My appointments | Tabbed by status (upcoming / past / cancelled), reschedule + details |
| Chat | Text, image attachment (private Supabase Storage), voice message (MediaRecorder → private bucket → signed URL), realtime delivery, read receipts (✓✓) |
| Drug info | OpenFDA search with international name synonyms (paracetamol → acetaminophen), Purpose / Warnings / Dosage / Ingredients / Manufacturer tabs |
| Profile | Avatar upload, personal + medical fields (DOB, gender, blood group, allergies) |
| Notifications | In-app bell + `/notifications` page — triggered by DB triggers on messages + appointment status changes |
| Settings | Theme (light/auto/dark), change password, terms |

### Doctor (mobile-first)

| Feature | Notes |
| --- | --- |
| Dashboard | Today / pending / this-week counters, pending-requests card |
| Appointments | Tabbed by Today / Upcoming / Pending / Past. Accept / decline / mark complete |
| Chat | Same UI as patient side — inbox with unread counts, individual conversations |
| Patients | Only patients they've had appointments with (enforced by RLS via `shares_appointment_with()`) |
| Availability | Weekly recurring windows (multiple per day for splits), 15/30/45/60 min slot lengths, blocked-date list |
| Profile | Bio, fee, years of experience, modes, languages, avatar |

### Admin (desktop-only)

| Feature | Notes |
| --- | --- |
| Overview | KPI cards (patients, doctors, appointments, open reports), 7/30/90-day chart, status donut, recent activity |
| Doctors | Table with Unverify / Suspend actions |
| Patients | Table with Suspend action |
| Appointments | All appointments across the platform with status, mode, fee |
| Reports | Moderation queue (spam messages, no-shows, etc.) with Resolve / Dismiss |
| Settings | Signed-in-as, theme, RBAC status, app version |
| Mobile gate | Phone visitors see a splash telling them to use desktop, with an override |

---

## Tech stack

**Frontend**
- **React 18 + Vite + TypeScript** — SPA foundation
- **Tailwind CSS** with custom brand token layer (`brand-*`, `accent-*`, `ink-*`)
- **React Router 6** — role-scoped route trees mounted by `RoleRouter`
- **Lucide-react** — icon set
- **@capacitor/*** — native shell for Android (camera, splash, status bar, haptics, keyboard, preferences)

**Backend**
- **Supabase**
  - Postgres 15 with 12 SQL migrations (see [`supabase/migrations/`](supabase/migrations))
  - Auth (email/password + OAuth)
  - RLS everywhere — security enforced in the database, not the app
  - Realtime channels for chat + appointment updates
  - Storage buckets: `avatars` (public), `chat-attachments` (private, signed URLs)
- **OpenFDA** — public drug labeling API (no key required, rate-limited)

**Delivery**
- **Vercel** — SPA hosting with SPA rewrite + PWA/asset cache headers via [`vercel.json`](vercel.json)
- **vite-plugin-pwa** — service worker, manifest, offline fallback, install prompt
- **Capacitor Android** — packages the built `dist/` into a native APK/AAB

---

## Architecture

```
┌────────────────────────────────────────┐
│              User devices              │
├──────────────┬─────────────────────────┤
│  Web / PWA   │   Android APK           │
│  (any        │   (Capacitor WebView    │
│   browser)   │    over bundled dist/)  │
└──────┬───────┴───────────┬─────────────┘
       │                   │
       ▼                   ▼
┌──────────────────────────────────────┐
│         Vercel (React SPA)           │
│    served with SPA rewrites,         │
│    hashed asset caching,             │
│    SW at /sw.js, offline.html        │
└─────────────────┬────────────────────┘
                  │  HTTPS (auth JWT)
                  ▼
┌──────────────────────────────────────┐
│              Supabase                │
│                                      │
│  Auth ─┐                             │
│         ├── Postgres  ── RLS         │
│  API  ─┘   ├── profiles              │
│            ├── doctor_profiles       │
│            ├── patient_profiles      │
│            ├── availability          │
│            ├── appointments  (EXCL)  │
│            ├── conversations         │
│            ├── messages              │
│            ├── notifications         │
│            └── reports               │
│                                      │
│  Realtime ── postgres_changes        │
│              (chat + appts push)     │
│                                      │
│  Storage ── avatars/ (public)        │
│           └ chat-attachments/ (priv) │
└──────────────────────────────────────┘
                  │
                  ▼
              OpenFDA
        (public drug labels)
```

**Key architectural decisions**

- **Role-scoped route trees**: `RoleRouter` picks one of 3 route trees at
  runtime based on `profile.role`. Same URLs (`/`, `/appointments`, `/chat`)
  mean completely different pages depending on role. Auth + role gate is
  enforced at the router level.
- **RLS is the fence**: no client-side "if role === admin" guards on data.
  Every table has RLS policies. The client asks for what it wants; Postgres
  returns only what the current user is allowed to see.
- **SECURITY DEFINER helpers**: helper functions (`is_admin()`, `is_doctor()`,
  `shares_appointment_with()`, `has_appointment_with_patient()`) bypass RLS by
  running as the function owner. This lets policies reference them without
  causing recursion.
- **Exclusion constraint on appointments**: race-safe booking. Two patients
  hitting Book at the same slot: exactly one gets 201, the other gets a Postgres
  `appointments_no_overlap` error — no double-booking possible at the DB level.
- **Realtime via `postgres_changes`**: `useRealtimeMessages` hook subscribes
  to the current conversation's message INSERTs. Messages arrive in ~200 ms
  from server insert to DOM update.
- **PWA-first, native-second**: the web build is the source of truth.
  Capacitor bundles the same `dist/` into the APK. Same code, three
  distribution channels (Vercel web · Web install · Android APK).

---

## Project layout

```
Doctor Cares/
├── android/                          ← Capacitor-generated native project
├── design-review/
│   └── index.html                    ← Design system + 21 screen mockups
├── public/
│   ├── brand-illustration.png        ← Brand icon (all densities)
│   ├── manifest.webmanifest          ← PWA manifest
│   └── offline.html                  ← SW offline fallback
├── src/
│   ├── components/
│   │   ├── auth/                     ← PasswordStrength, SocialAuthButtons
│   │   ├── layout/                   ← PatientLayout, DoctorLayout, AdminLayout,
│   │   │                               BottomNavigation, Header, Sidebar,
│   │   │                               OfflineBanner, InstallPrompt, UpdatePrompt
│   │   ├── profile/                  ← AvatarUploader
│   │   └── ui/                       ← Button, Card, Input, Alert, Avatar,
│   │                                   Badge, LoadingSpinner, EmptyState,
│   │                                   ErrorState, Skeleton, PasswordInput
│   ├── contexts/
│   │   ├── AuthContext.tsx           ← Session + role + presence heartbeat
│   │   └── ThemeContext.tsx          ← Light/dark/system with FOUC prevention
│   ├── hooks/
│   │   ├── useAsync.ts               ← Simple data-fetching hook
│   │   ├── useOnline.ts              ← navigator.onLine watcher
│   │   ├── useRealtimeMessages.ts    ← Supabase postgres_changes subscription
│   │   └── usePwaInstall.ts          ← Install prompt event capture
│   ├── lib/
│   │   ├── api/                      ← Data access functions (appointments,
│   │   │                               availability, chat, doctors, drugs,
│   │   │                               notifications, patients, profile, storage)
│   │   ├── native/                   ← Capacitor bootstrap, camera, haptics,
│   │   │                               platform detection, push (staged)
│   │   ├── cn.ts                     ← Tailwind classname helper
│   │   ├── env.ts                    ← Env var reader
│   │   ├── format.ts                 ← GH₵, dates, times, greeting
│   │   ├── password.ts               ← Password strength rules
│   │   ├── presence.ts               ← Heartbeat (staged, ChatHeader shows Online)
│   │   └── supabase.ts               ← Client factory
│   ├── pages/
│   │   ├── admin/                    ← Dashboard, Doctors, Patients,
│   │   │                               Appointments, Reports, Settings,
│   │   │                               UserDetails
│   │   ├── auth/                     ← Splash, Onboarding, Login, Register,
│   │   │                               ForgotPassword, ResetPassword, SelectRole
│   │   ├── chat/                     ← ChatListPage, ChatDetailPage
│   │   ├── doctor/                   ← Dashboard, Appointments, AppointmentDetails,
│   │   │                               Availability, PatientDetails, Patients,
│   │   │                               Profile, EditProfile, Notifications, Settings
│   │   ├── patient/                  ← Dashboard, FindDoctors, DoctorProfile,
│   │   │                               BookAppointment, BookingConfirmation,
│   │   │                               AppointmentDetails, MyAppointments,
│   │   │                               DrugSearch, DrugDetail, PatientProfile,
│   │   │                               EditProfile, Notifications, Settings
│   │   └── system/
│   │       └── NotFoundPage.tsx
│   ├── routes/index.tsx              ← RoleRouter + top-level routes
│   ├── styles/index.css              ← Tailwind + custom keyframes (splash,
│   │                                   onboarding, page transitions)
│   ├── types/                        ← Shared TypeScript types
│   ├── App.tsx
│   └── main.tsx                      ← React mount + bootstrapNative()
├── supabase/
│   ├── functions/
│   │   └── send-push/                ← Edge Function (FCM fan-out, staged)
│   └── migrations/
│       ├── 0001_extensions_enums_helpers.sql
│       ├── 0002_profiles.sql
│       ├── 0003_availability.sql
│       ├── 0004_appointments.sql     (EXCLUSION constraint)
│       ├── 0005_chat.sql
│       ├── 0006_notifications.sql    (triggers on messages + appointments)
│       ├── 0007_reports.sql
│       ├── 0008_admin_bootstrap.sql  (promote_to_admin RPC + storage RLS)
│       ├── 0009_profiles_doctor_read_patient.sql
│       ├── 0010_fix_profiles_recursion.sql
│       ├── 0011_push_tokens.sql
│       └── 0012_presence.sql
├── capacitor.config.ts
├── vercel.json
├── tailwind.config.js
├── vite.config.ts
├── index.html
└── package.json
```

---

## Local development

### Prerequisites

- **Node 18+** and **npm 9+**
- A **Supabase project** (free tier is fine) with the SQL migrations applied
- Optional: **Android Studio** for the native build

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in:
#   VITE_SUPABASE_URL       = https://YOUR-PROJECT-REF.supabase.co
#   VITE_SUPABASE_ANON_KEY  = eyJhbGciOi...    (the public anon key)
#   VITE_APP_URL            = http://localhost:5173

# 3. Run the migrations in order (Supabase Dashboard → SQL Editor)
#    Paste + Run each file from supabase/migrations/ in numeric order.
#    Migration 0008 also creates the Storage buckets used by chat + avatars.

# 4. Start the dev server
npm run dev
#   → http://localhost:5173
```

### First run

1. Sign up with any email + password meeting the 5 rules — you're a patient by
   default.
2. To become an admin, run in Supabase SQL Editor:
   ```sql
   update public.profiles
      set role = 'admin'
    where id = 'YOUR-USER-UUID';
   ```
   (Get the UUID from the Table Editor → `profiles`.)
3. Log out + back in → admin console loads.

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production bundle to `dist/` + PWA service worker |
| `npm run preview` | Serves the built bundle locally (test PWA install) |
| `npx tsc -b` | Type-check without emit |

---

## Database &amp; RLS

The schema is defined by 12 numbered SQL migrations in
[`supabase/migrations/`](supabase/migrations). Run them **in order** once, on
a fresh project. They're idempotent — safe to re-run.

**Core tables**

| Table | Purpose |
| --- | --- |
| `profiles` | 1 row per user, holds `role`, `full_name`, `avatar_url`, `last_seen_at`, etc. |
| `patient_profiles` | 1:1 with `profiles` where role = 'patient' — medical fields (DOB, blood group, allergies) |
| `doctor_profiles` | 1:1 with `profiles` where role = 'doctor' — specialty, fee, modes, verification |
| `availability` | Weekly recurring windows per doctor (day + start + end + slot length) |
| `blocked_dates` | One-off blackout dates per doctor |
| `appointments` | Booking rows. **EXCLUSION constraint** on `(doctor_id, tsrange(scheduled_at, +duration))` prevents double-booking |
| `conversations` | Patient ↔ doctor chat threads |
| `conversation_participants` | Tracks `last_read_at` per user per conversation → unread counts |
| `messages` | Chat messages. Triggers a notification INSERT for the recipient |
| `notifications` | In-app notifications. Triggers auto-create on appointment status changes + new messages |
| `reports` | Moderation queue (spam messages, no-shows, etc.) |
| `push_tokens` | FCM tokens (per user per device). Feature staged — see [Roadmap](#roadmap) |

**Key RLS patterns**

- **Self-only default**: `profiles`, `patient_profiles` — user can read/write
  only their own row (`auth.uid() = id`).
- **Marketplace**: `doctor_profiles` where `is_verified = true` is readable by
  any authenticated user, so patients can browse.
- **Shared-appointment access**: `shares_appointment_with(uuid)` — a
  SECURITY DEFINER helper that returns true when the caller shares at least one
  appointment with the given user. Used by profiles RLS so doctors can see
  their patients' names and vice versa without weakening default privacy.
- **Recursion-safe**: helper functions run as their owner and bypass RLS, so
  policies can call them without triggering nested policy evaluation.
- **Admin bypass**: `is_admin()` grants read to everything for admins.

---

## Web deployment (Vercel)

### First-time setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. From the project root, log in
vercel login

# 3. First deploy — creates the project
vercel
#   Answer:
#   - Set up and deploy?  Y
#   - Link to existing project?  N
#   - Project name?  doctor-cares
#   - Directory?  .
#   - Modify settings?  N

# 4. Add environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production      # pick "Expose as Config"
vercel env add VITE_APP_URL production                # e.g. https://doctor-cares-ten.vercel.app

# 5. Redeploy with env baked in
vercel --prod
```

### Vercel config ([`vercel.json`](vercel.json))

- SPA rewrite: any URL without a file extension → `/index.html` so React
  Router owns navigation
- Cache-forever for `/assets/*` and `workbox-*.js` (they're hashed)
- No-cache for `/sw.js`, `/manifest.webmanifest`, `/offline.html` (so updates
  ship instantly)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`

### Supabase URL config

In **Supabase Dashboard → Authentication → URL Configuration** set:

- **Site URL**: `https://doctor-cares-ten.vercel.app`
- **Redirect URLs**: `https://doctor-cares-ten.vercel.app/**`

Otherwise password-reset + email-confirmation links redirect to `localhost`.

---

## Android build (Capacitor)

### One-time setup

- Install **Android Studio** (bundles the JDK + SDK)
- The Android project is already scaffolded at [`android/`](android)

### Every build

```bash
# 1. Build fresh web assets
npm run build

# 2. Copy them into the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android

#   In Android Studio:
#     File → Sync Project with Gradle Files
#     Build → Generate Signed App Bundle or APK…
#     → APK (or AAB for Play Store)
#     → Use your keystore (create once, back it up)
#     → release variant → V1 + V2 signing → Create
```

Output lands at `android/app/build/outputs/apk/release/app-release.apk`.

Install directly on any Android device (allow "install from unknown sources"
first). Or submit the AAB to the Play Store.

### Native plugins in use

| Plugin | Purpose |
| --- | --- |
| `@capacitor/app` | Android hardware back button → history.back() or exit |
| `@capacitor/camera` | Native "Camera or Gallery" picker for avatar upload |
| `@capacitor/splash-screen` | Brand splash on cold start |
| `@capacitor/status-bar` | Reserves status-bar strip so content doesn't bleed under it |
| `@capacitor/haptics` | Light tap on nav interactions |
| `@capacitor/keyboard` | Hides floating pill nav when keyboard opens |
| `@capacitor/preferences` | Native secure key/value store (available but unused) |

### Windows build gotchas

- **"process cannot access the file"**: kill Gradle daemon and clean:
  ```powershell
  cd android
  ./gradlew --stop
  Remove-Item -Recurse -Force app\build
  ```
  Then `File → Invalidate Caches / Restart` in Android Studio.

---

## Security model

Row Level Security in Postgres is the single source of truth. No table is
readable/writable without an explicit policy. Airtight-verified via direct
REST attacks:

| Attack | Result |
| --- | --- |
| Doctor tries to read all `profiles` | 1 row returned (self only) |
| Doctor tries to read another doctor's appointments | 0 rows |
| Doctor inserts appointment for unrelated patient | **403** with `appointments RLS violation` |
| Doctor updates another doctor's row | 0 rows affected (silent RLS filter) |
| Non-admin calls `promote_to_admin` RPC | Blocked (function-level check) |
| Any user reads `reports` table | 0 rows (admin-only) |

Also:
- **CSP-style headers** shipped via `vercel.json` (X-Frame-Options, etc.)
- **Terms of service** required at signup (HTML5 `required` + app-level check)
- **Password strength** — 5 rules enforced client-side (8 chars, upper, lower,
  digit, symbol). Supabase Auth stores as bcrypt-hashed.
- **Signed URLs** for private storage (`chat-attachments/` bucket) — expiry
  configurable per URL request.

---

## Testing &amp; quality

All 8 test blocks in the QA pass are green:

1. **Auth &amp; role routing** — password rules, error handling, session persistence
2. **Patient happy path** — book → chat → drug lookup end-to-end
3. **Doctor happy path** — accept booking → reply → availability edit
4. **Admin flow** — dashboard KPIs, tables, mobile-gate
5. **Realtime &amp; concurrency** — chat push in ~200 ms; race-condition proof
6. **RLS security** — direct-query attacks all blocked
7. **PWA &amp; offline** — SW registers, offline.html serves, install prompt fires
8. **Edge cases** — 404s, expired sessions, form validation, empty states

`npx tsc -b` runs clean.

---

## Known limitations

Working but explicitly not shipped in v1:

- **Native voice messages on Android** — Capacitor WebView's `getUserMedia`
  doesn't reliably grant mic even with runtime permission requests. Voice
  messages **work in the PWA install** (Chrome / Safari / Edge on Android).
  For the native APK we hide the mic path or gracefully fall back.
- **Push notifications (FCM)** — the client wiring, DB table (`push_tokens`),
  and Edge Function (`supabase/functions/send-push/`) are staged and
  commented in `src/lib/native/push.ts`. To activate: create a Firebase
  project, drop `google-services.json` into `android/app/`, apply the Google
  services Gradle plugin, uncomment the client code, deploy the Edge
  Function. Full walkthrough in the commit history / this README's
  Roadmap.
- **Video consultations** — "Video" is currently just a mode label. Real
  WebRTC/Daily.co/Twilio integration is roadmap.
- **Payments** — fees are display-only in `GH₵`. Paystack integration is
  roadmap.
- **Presence badge** — always shows "Online" in the chat header. The heartbeat
  + `last_seen_at` column are populated for future use; flipping it on is a
  two-line change in `ChatDetailPage.tsx` (see the comments there).

---

## Roadmap

Ordered by expected impact:

### Tier 1 — Real medical value

1. **Video consultations** — WebRTC (Daily.co or Twilio) → makes "Video mode"
   real
2. **Payments** — Paystack integration for GH₵ consultation fees; doctor
   payouts to bank
3. **Prescriptions** — doctor writes digital script during a consult, patient
   sees + exports
4. **Push notifications (FCM)** — closes the "user has to open the app to know"
   gap

### Tier 2 — Usability wins

5. **Appointment reminders** — auto notify 24h + 1h before
6. **Ratings &amp; reviews** — post-visit 1–5 stars, activates marketplace trust
7. **Medical history / patient records** — chronic conditions, meds, past
   visits
8. **Symptom checker** — pre-booking triage → routes to right specialty

### Tier 3 — Growth

9. Multi-language (English + French + Twi)
10. Referral system (doctor A → doctor B)
11. Lab test ordering
12. Health metrics tracking (BP, weight, glucose)
13. Emergency SOS
14. Insurance / NHIS claim submission

### Tier 4 — Polish

15. Patient wallet / balance
16. Nurse sub-role
17. Waiting room / queue for video consults
18. Admin broadcast (health tips)

---

## Credits

Built by Nimako-Boateng Emmanuel. Stack choices favored durable, boring, one-person-can-maintain-it:
Supabase over hand-rolled backend; Tailwind over CSS-in-JS; Capacitor over
React Native; Vercel over self-hosted; SQL migrations over ORMs. Choose the
same next time.

Questions? Open an issue on the repo or reach out at
`emmaboat631@gmail.com`.
