# Supabase — Doctor Cares database

This folder holds the SQL you'll paste into the **Supabase SQL editor** to build the database.

## What's here

```
supabase/
├── migrations/
│   ├── 0001_extensions_enums_helpers.sql   # pgcrypto, citext, btree_gist, enums, helper fns
│   ├── 0002_profiles.sql                    # profiles + patient_profiles + doctor_profiles + auth trigger + RLS
│   ├── 0003_availability.sql                # doctor_availability + doctor_blocked_dates + RLS
│   ├── 0004_appointments.sql                # appointments (no-overlap exclusion) + RLS
│   ├── 0005_chat.sql                        # conversations + messages + realtime + get_or_create_conversation RPC
│   ├── 0006_notifications.sql               # notifications + auto-triggers for appts & messages
│   ├── 0007_reports.sql                     # moderation reports + drug_search_history
│   └── 0008_admin_bootstrap.sql             # promote_to_admin RPC + storage buckets (avatars, chat-attachments)
├── seed.sql                                 # OPTIONAL sample data (needs manual editing)
└── README.md
```

## Apply the migrations

1. Create a new Supabase project (free tier is fine).
2. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API** into your local `.env`.
3. Open the SQL editor and run each migration file in numeric order (0001 → 0008). Each file is idempotent — safe to re-run.
4. (Optional) Edit `seed.sql` with real user emails and run it once you've signed up some test users.

## Bootstrapping your first admin

The `promote_to_admin` RPC handles this safely:

1. Sign up your admin user through the app (they'll get `role = 'patient'` by default — that's fine).
2. From the SQL editor, run:
   ```sql
   select promote_to_admin('<your-user-uuid>');
   -- Find the uuid with: select id, email from auth.users;
   ```
3. That's it. Sign out and back in and the app will route you to `/admin`.

**Why this is safe:** the RPC allows the caller to promote themselves *only* when zero admins exist. After that, only existing admins can promote others.

## Schema overview

```
auth.users                       (managed by Supabase)
    │
    │ 1:1
    ▼
profiles                         (role, name, avatar, phone, status)
    │
    ├── 1:1 patient_profiles     (DOB, gender, blood group, allergies)
    ├── 1:1 doctor_profiles      (specialty, qualifications, fee, rating, verified)
    │        │
    │        ├── 1:N doctor_availability   (weekday, start/end time, slot length)
    │        └── 1:N doctor_blocked_dates  (holidays / leave)
    │
    ├── N:M via appointments (patient_id, doctor_id, scheduled_at, status, mode…)
    │        └── EXCLUSION constraint: no overlapping non-cancelled slots per doctor
    │
    ├── N:M via conversations (patient_id, doctor_id) — 1 per pair
    │        ├── conversation_participants
    │        └── 1:N messages           (realtime-enabled)
    │
    ├── 1:N notifications              (realtime-enabled)
    ├── 1:N reports                    (moderation queue)
    └── 1:N drug_search_history        (patient's OpenFDA lookups)
```

## Row Level Security summary

| Table                    | Read                                                                 | Write                                              |
|--------------------------|----------------------------------------------------------------------|----------------------------------------------------|
| `profiles`               | Self · doctors' public names for browse · admin                       | Self (except role) · admin                         |
| `patient_profiles`       | Self · admin · doctor **iff** shared appointment exists              | Self · admin                                       |
| `doctor_profiles`        | Any signed-in user for `is_verified=true` · self · admin              | Self · admin                                       |
| `doctor_availability`    | Any signed-in user                                                   | Own doctor · admin                                 |
| `doctor_blocked_dates`   | Any signed-in user                                                   | Own doctor · admin                                 |
| `appointments`           | Own party (patient or doctor) · admin                                | Own party (patient books, doctor accepts) · admin  |
| `conversations`          | Participants · admin                                                 | Only via `get_or_create_conversation` RPC          |
| `conversation_participants` | Own row / conversation members · admin                            | Own `last_read_at` · admin                         |
| `messages`               | Conversation participants · admin                                    | Participants (sender must be self)                 |
| `notifications`          | Own only · admin                                                     | Server-side triggers only (no client insert)       |
| `reports`                | Own filed · admin                                                    | File own · admin resolves                          |
| `drug_search_history`    | Self only                                                            | Self only                                          |

## Realtime

The following tables are added to the `supabase_realtime` publication:

- `messages` — client subscribes with `filter: conversation_id=eq.<id>`
- `conversations` — client subscribes for list-level updates (last_message_at)
- `notifications` — client subscribes to `filter: user_id=eq.<self>`

## Storage buckets

| Bucket             | Public | Path convention                                          |
|--------------------|--------|----------------------------------------------------------|
| `avatars`          | Yes    | `<user_id>/*` — only owner writes                        |
| `chat-attachments` | No     | `<conversation_id>/<message_id>/*` — participants only   |

## Regenerating TypeScript types

Once the migrations are applied, regenerate `src/types/database.ts`:

```bash
npx supabase gen types typescript --project-id <YOUR-REF> --schema public > src/types/database.ts
```

(Requires the Supabase CLI installed locally.)
