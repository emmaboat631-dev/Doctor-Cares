# Doctor Cares — UI Patterns Reference

Read-only documentation of the composition patterns that already exist in
the codebase as of **2026-10-13**. These are conventions in use, not
proposals. New screens should follow them so the app stays coherent.

- Design tokens: [`design-review/tokens.md`](./tokens.md)
- Component inventory: [`design-review/components-inventory.md`](./components-inventory.md)
- Visual gallery: [`design-review/index.html`](./index.html)

---

## 1. Page skeleton

Every mobile-first page in `src/pages/**` follows the same chrome. New
pages should start from this shape rather than re-deriving it.

```tsx
import { Header } from '@/components/layout/Header';

export function SomePage() {
  return (
    <>
      <Header title="Page title" subtitle="Optional context" showBack />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        {/* page content — vertical stack of <Card> / <SectionGroup> */}
      </main>
    </>
  );
}
```

Rules:

- **`<Header />`** is sticky, 56 px tall, and renders inside its own
  `mx-auto max-w-3xl`. It owns the back arrow (via `showBack`), the brand
  logo (via `showLogo`), the theme toggle, and the bell. Pages don't
  re-roll a title bar.
- **Width.** `max-w-3xl` centers the content column. Admin pages override
  this inside `AdminLayout`.
- **Horizontal padding.** `px-4` on mobile; `sm:px-6` or more on larger
  viewports when a page cares.
- **Top padding.** `pt-4` is the default breathing room under the header.
- **Bottom padding.** Use the `.pb-nav` utility (see tokens §6) to clear
  the floating pill nav on mobile. From the `sm` breakpoint up the pill
  nav is hidden, so `.pb-nav` collapses to `1.5rem` automatically.
- **Scroll chrome.** If a page needs its own scroll area (chat, modals),
  pair it with `.overscroll-contain-y` so pull-to-refresh doesn't fight
  the thread.

Layouts that wrap pages (`PatientLayout`, `DoctorLayout`, `AdminLayout`)
inject the `<BottomNavigation>` and background chrome; the page itself
owns only the header + main.

---

## 2. Data-fetch tri-state convention

Every page that reads from Supabase follows one branching ladder.
Primitives involved: `LoadingSpinner → ErrorState → EmptyState → data`.

### 2.1 Hook pattern

```tsx
import { useAsync } from '@/hooks/useAsync';

const req = useAsync(async () => listAppointments(user.id), [user.id]);
```

`useAsync` returns `{ data, error, loading, retry }`. See
`src/hooks/useAsync.ts` for the signature.

### 2.2 Render ladder

```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState }     from '@/components/ui/ErrorState';
import { EmptyState }     from '@/components/ui/EmptyState';

if (req.loading)              return <LoadingSpinner fullScreen label="Loading…" />;
if (req.error)                return <ErrorState onRetry={req.retry} />;
if (!req.data || req.data.length === 0)
  return <EmptyState title="Nothing here yet" description="…" icon={<CalendarX />} />;

return (
  <ul>
    {req.data.map(/* … */)}
  </ul>
);
```

### 2.3 Rules

- **Fullscreen loader only on first paint.** On refetch, prefer an in-place
  `<LoadingSpinner size={18} />` next to a header, or `<Skeleton>` stand-ins
  for the content. Resetting the whole viewport to a spinner every time
  the user triggers a reload feels broken.
- **ErrorState always has `onRetry`** unless the error is unrecoverable
  (invalid URL param, deleted record). An empty retry button is worse than
  no button.
- **EmptyState is the correct response to a zero-length successful fetch**
  — not an error. Reserve `ErrorState` for actual failures.
- **Skeletons for list pages.** Where the shape of the data is predictable
  (list of appointments, list of doctors), prefer stacked `<Skeleton>` rows
  during loading over a bare spinner — matches the final layout, no reflow
  on data arrival.

---

## 3. List + section convention

Settings, profile, and about-style surfaces use the paired primitives
`SectionGroup` + `MenuRow`.

```tsx
import { SectionGroup } from '@/components/ui/SectionGroup';
import { MenuRow }      from '@/components/ui/MenuRow';
import { User, Shield, LogOut } from 'lucide-react';

<SectionGroup title="Account">
  <MenuRow icon={<User />}   label="Edit profile"   href="/profile/edit" />
  <MenuRow icon={<Shield />} label="Change password" href="/settings/password" />
  <MenuRow icon={<LogOut />} label="Sign out"       onClick={signOut} tone="danger" />
</SectionGroup>
```

- SectionGroup paints the rounded card chrome and the uppercase title.
- MenuRow paints the row, including its own bottom hairline and the
  trailing chevron (auto-shown when `href` is set).
- Keep the chevron off when `trailing` is a `<Switch>` or a value label.

---

## 4. Interactive card convention

When a card is the primary tap target of its own view (a doctor card, an
appointment card), wrap it in a `<Link>` and set `interactive`:

```tsx
<Link to={`/doctors/${d.id}`}>
  <Card interactive className="flex items-center gap-3">
    <Avatar name={d.name} src={d.avatar_url} />
    {/* … */}
  </Card>
</Link>
```

- Card itself is purely visual; the Link supplies keyboard semantics and
  focus.
- Don't use `interactive` without a wrapping Link or Button — the card
  will look pressable but won't be keyboard-reachable (known inventory gap,
  see `components-inventory.md` §6).

---

## 5. Form convention

Form pages use `<Input>` / `<PasswordInput>` and surface submit state via
`<Button loading>` and `<Alert tone="error">`.

```tsx
<form onSubmit={onSubmit} className="space-y-4">
  <Input       label="Email"    type="email"    autoComplete="email"    required />
  <PasswordInput label="Password" autoComplete="current-password" required />

  {error && <Alert tone="error">{error}</Alert>}

  <Button type="submit" loading={pending} fullWidth>
    Sign in
  </Button>
</form>
```

- Always pass `autoComplete` so password managers behave.
- Error surface: `<Alert tone="error">` for a form-wide failure;
  per-field `error` prop on `<Input>` for a specific field.
- Buttons that submit go `fullWidth` on mobile; secondary actions
  are inline.
- Textareas don't yet have a primitive; today they are inlined. New
  textareas should keep the same label/hint/error shape as `<Input>` so
  the layer can be factored out later.

---

## 6. Modal / sheet convention *(open gap)*

There is **no shared `Dialog` / `Sheet` primitive** today. Six places
(`SosSheet`, `CookieBanner`, `OnboardingTour`, `UpdatePrompt`, `ImageViewer`,
`InstallPrompt`) each roll their own overlay with inconsistent focus
handling and animations.

Until a shared primitive lands, new overlays should at least:

- Set `role="dialog"` and `aria-modal="true"` on the panel.
- Trap focus or auto-focus the primary control.
- Close on `Esc` and on backdrop tap.
- Animate in with `animate-fade-in` on the backdrop and `animate-slide-up`
  on the panel (both tokenised — see `tokens.md` §5.2).
- Honour `prefers-reduced-motion` (the shared keyframes already do).

Proposing a shared `Dialog` is tracked in `components-inventory.md` §8.3.

---

## 7. Theming surface

- The theme toggle lives in `<Header />`. Pages never ship their own
  toggle.
- Dark/light styles pair at the primitive level via Tailwind variants
  (`dark:`), not via a theme-aware JS prop.
- `prefers-color-scheme: dark` is honoured when `mode === 'system'` (the
  default). The user override persists under `localStorage['dc:theme']`.

---

## 8. Navigation

- **Primary tabs on mobile.** 5 routes per role, rendered by
  `<BottomNavigation items={…}>`. See `src/components/layout/BottomNavigation.tsx`
  for the hide-on-sub-page rule (anything with an extra path segment hides
  the pill so the user gets the full viewport).
- **Back navigation.** `<Header showBack />`. The default handler calls
  `navigate(-1)` with a `/` fallback when there's no history.
- **Role gating.** Enforced at the router level by `RoleRouter` in
  `src/routes/index.tsx`. Pages assume their role; they don't re-check.

---

## 9. Haptics

- `src/lib/native/haptics.ts` → `tap()` fires a light haptic on
  Capacitor; a no-op in the browser.
- Fire on primary nav interactions only (bottom tab tap, major CTA tap).
  Don't fire on routine button clicks — the OS defaults are enough.

---

## 10. Internationalisation

- Locales live under `src/i18n/locales/{en,fr,tw}.json`.
- Pages call `useTranslation()` and reference keys (e.g. `t('home.searchPlaceholder')`).
- Static strings outside locale files are English fallbacks and will be
  migrated as i18n rolls out.

---

## 11. Known gaps vs. this doc

Cross-referenced with the inventory. These do not invalidate the pattern —
they describe where consumers still have to catch up.

- Many pages still inline list rows instead of using `SectionGroup` /
  `MenuRow` (both primitives are new).
- Modal pattern is aspirational (see §6).
- Textareas don't follow the `<Input>` API yet (no primitive).
- A few pages wrap `<Card interactive>` without a `<Link>`, which looks
  tappable but isn't keyboard-reachable.

---

*Last reviewed: 2026-10-13. Review again whenever a new primitive lands or
a convention changes.*
