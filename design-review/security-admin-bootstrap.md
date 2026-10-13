# Admin Bootstrap — Security Investigation (`VITE_ADMIN_EMAILS`)

Date: 2026-10-13 · Scope: `src/lib/env.ts`, `src/contexts/AuthContext.tsx`,
`supabase/migrations/0008_admin_bootstrap.sql`, Vercel environment config.

---

## 1. What the current implementation does

- `src/lib/env.ts` reads `VITE_ADMIN_EMAILS` from Vite's `import.meta.env`
  and exposes `adminEmails: string[]` as part of the `Env` object.
- The intent — based on surrounding code and migration `0008` — is to let
  listed addresses auto-promote themselves to the `admin` role when they
  sign in, instead of needing a manual `UPDATE profiles SET role='admin'`
  in Supabase.
- Separately, migration `0008_admin_bootstrap.sql` ships a
  `promote_to_admin(uuid)` SQL function that only existing admins may call
  — a secure, server-side admin-provisioning path.

## 2. The leak

**Everything prefixed `VITE_` in a Vite SPA is written into the public
browser bundle at build time**, in plaintext. That means any address in
`VITE_ADMIN_EMAILS` is:

- Readable in `dist/assets/index-*.js` after `npm run build`.
- Readable by anyone who downloads the production bundle from Vercel
  (every visitor's browser does, implicitly).
- Permanent in any cached or deployed artefact until the next build.

Act 843 §17(f) (data security) and §37 (special personal data — admin
access to medical records) both treat this as a hardening gap: addresses
of people with escalated privileges should not be inferable from a public
asset. For a US launch, HIPAA Security Rule §164.308(a)(4) (Information
Access Management) raises the bar further.

**Severity**: MED. The addresses are not credentials by themselves, but
they are enumeration/phishing fuel targeted at your highest-privilege
users.

## 3. What should rotate / be audited

Credentials to review (I did **not** read or print any value):
- `VITE_ADMIN_EMAILS` in your Vercel project environment and any
  `.env` files on contributor machines.
- Any screenshot, Discord/Slack message, PR comment, or CI log that may
  contain the compiled bundle.

Addresses themselves are not secret in the way an API key is, so
"rotation" here means **removing the list from the client bundle**, not
cycling the addresses. The addresses can keep their admin role via the
server-side path in §4.

## 4. Secure correction — proposed migration path

Replace client-side allowlist with database-driven admin bootstrap. **No
schema change required** — the plumbing already exists.

### 4.1 Server side (migration already shipped)
- `promote_to_admin(target_user_id uuid)` RPC from `0008_admin_bootstrap.sql`
  — gated so only existing admins can call it.
- One admin must exist initially. For a fresh project: `UPDATE
  public.profiles SET role='admin' WHERE id = 'YOUR-UUID';` run once in
  the Supabase SQL Editor by the project owner. Not committed to the
  repo. Not emitted anywhere.

### 4.2 Client side (changes to make, in order)
1. **Stop reading `VITE_ADMIN_EMAILS` in `src/lib/env.ts`.** Remove
   `adminEmails` from the `Env` interface and from `readAdminEmails()`.
2. **Remove any consumer** of `env.adminEmails` — a project-wide grep
   turns up zero outside `env.ts` today, so this is a 1-file deletion.
3. **Delete the `VITE_ADMIN_EMAILS` entry** from `.env.example`.
4. **Delete the `VITE_ADMIN_EMAILS` variable** from the Vercel project
   environment (both Production and Preview).
5. **Rebuild + redeploy** so the bundle no longer ships the list.

### 4.3 Operational playbook
- Promoting a new admin: an existing admin opens Supabase SQL Editor and
  runs `select public.promote_to_admin('<user-uuid>');`.
- The target user signs out + back in and lands in the admin console
  (routing already keys off `profile.role`).
- Demoting: `UPDATE public.profiles SET role='doctor' WHERE id=…;` from
  the same SQL Editor. No RPC exists yet for demotion — adding one is a
  small, separate migration.

### 4.4 Why not keep a server-visible env var?
Keeping an environment variable **without the `VITE_` prefix** (e.g.
`ADMIN_EMAILS=`) would be invisible to the client bundle but useless to
the SPA — Vite only exposes `VITE_*` to the client. You could pass it
through an Edge Function at sign-up, but that duplicates what
`promote_to_admin` already does with better auditability.

## 5. Verification after the change

After the client code deletion and bundle rebuild:

```bash
npm run build
grep -r "admin" dist/assets/*.js | grep -i "@"
```

The grep should return no result that resembles an email address. (It
may return the string `admin` or `administrator` from UI copy — that is
not a leak.)

Also inspect the live `index-*.js` from the production CDN after
redeploy, with the browser DevTools "Sources" panel, for the same.

## 6. Scope caveats

- This document covers only the `VITE_ADMIN_EMAILS` surface.
- A broader `VITE_*` audit (Supabase anon key, hCaptcha site key, VAPID
  public key) is appropriate on the same pass. Those three are
  "designed to be public" per their respective vendors, but their
  rotation policy and any secondary artefacts (deploy logs, screenshots
  of settings pages) should be checked.
- Full Ghana DPA 2012 (Act 843) compliance determinations require
  qualified legal counsel.
