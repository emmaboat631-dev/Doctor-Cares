# Doctor Cares — Design System Inventory (Phase 2, Step 2.1)

Read-only snapshot of design tokens, styles, and reusable UI components as of
2026-10-13. No application code, configuration, dependencies, or database
settings were modified. This document is the input to any later refinement
work and is intended to be reviewed before any code change is proposed.

---

## 1. Token layer (`tailwind.config.js`)

### 1.1 Color palette

| Scale | Role | Range | Notes |
|---|---|---|---|
| `brand.50–900` | Primary healthcare blue | `#EEF3FF` → `#0D215E`; **primary = `brand.500 #1E5EFF`** | Preserve as the identity anchor. Dark-mode variants almost always use `brand-500/20` or `brand-200`. |
| `accent.50–900` | Soft teal secondary | `#EAFBF6` → `#03301F`; accent 500 = `#0FA774` | Currently under-used in the UI (no primitive renders accent by default). |
| `surface.{DEFAULT, muted, soft}` | Light-mode backgrounds | `#FFFFFF / #F5F7FB / #EEF1F7` | Used by body, nav, cards. |
| `ink.{DEFAULT, soft, muted, faint, onDark}` | Text foreground scale | `#0F172A → #334155 → #64748B → #94A3B8 → #F8FAFC` | Dark-mode text relies on `ink-onDark` and `slate-300/400`. |
| `success / warning / danger / info` | Semantic tones | each has `DEFAULT` + `soft` companion | Used by Alert, Badge, ErrorState. |

**Observed gaps.**
- No neutral surface token exists for `slate-900` body background in dark mode — components reach for `bg-slate-950` / `bg-slate-900` directly (74 occurrences of `text-[11px]` and similar reflect ad-hoc values).
- `accent` palette is defined but not consumed by any primitive — consumers that want a secondary accent fall back to raw `emerald-*`/`sky-*` classes.
- No `focus` token — focus ring colour is hard-coded (`brand-500`, `white/80` on the dark pill nav) in each component.

### 1.2 Typography

- Family: `Inter` → system fallback stack. No weight tokens; components use raw `font-medium / semibold / bold`.
- Scale: standard Tailwind `xs → 3xl` plus two custom entries — `caption` (0.6875rem / 0.875rem) and `label` (0.625rem / 0.875rem, +letter-spacing).
- **74 call sites still bypass the scale** via `text-[10px]` / `text-[11px]`. The intent of `caption` and `label` is to replace those; adoption is partial.

### 1.3 Radii, shadows, motion, spacing

- Radii: `xl 0.875rem`, `2xl 1rem`, `3xl 1.5rem` (standard Tailwind values override).
- Shadows: `card`, `pop`, `nav` — subtle, light-mode-tuned (dark mode uses translucent slate overlays instead).
- Easings: `spring (0.32, 0.72, 0, 1)` and `ease-out-soft`. Keyframe animations: `fade-in`, `slide-up`, `skeleton`.
- Safe-area: `safe-t / safe-b / safe-l / safe-r` map to `env(safe-area-inset-*)`.
- Custom breakpoint: `xs: 375px`.

### 1.4 Base styles (`src/styles/index.css`)

- Resets: tap highlight off, antialiasing, `text-size-adjust: 100%`.
- Theme root: `html.dark { color-scheme: dark }`; body background flips to `slate-950` in dark mode.
- iOS zoom fix: inputs/selects/textareas forced to `font-size: 16px` on touch viewports.
- Keyboard-only focus ring: 2px `brand.500` with 2px offset, 6px rounded corners.
- Reduced-motion: duration clamped to 0.001ms for all animations.
- Component utilities: `safe-top / safe-bottom`, `pb-nav` (clearance for floating pill), `overscroll-contain-y`, `press-tile` (`active:scale-[0.98]`), `card-surface` (bg + border for light/dark), `hairline` (top border).
- Choreography: page `page-slide-forward/back` keyframes; splash `logo-in / float / title-in / sub-in / progress / orb / scene-out / bg-wash`; onboarding `scene-in / illus-in / title-in / body-in / float`.

---

## 2. Reusable primitives (`src/components/ui/*`)

Call counts come from a grep of `from '@/components/ui/*'` across the codebase.

| # | Primitive | Variants / props | Usage count | A11y state | Notes |
|---|---|---|---:|---|---|
| 1 | **Button** | `variant: primary / secondary / ghost / outline / danger` · `size: sm / md / lg` · `loading`, `leftIcon`, `rightIcon`, `fullWidth` · `forwardRef` | **27** | focus-visible ring on brand; sets `aria-busy` while loading; `disabled` propagates to native | Icon-only buttons require caller to add `aria-label` — not enforced in types. No destructive-confirmation variant. Spinner replaces leftIcon only; rightIcon hidden during load. |
| 2 | **Card** | `padding: none / sm / md / lg` · `interactive` | **34** | none intrinsic | `interactive` adds `cursor-pointer` + press scale but no `role`, no `tabIndex`, no keyboard activation — looks clickable, not focusable. |
| 3 | **Input** | `label`, `hint`, `error`, `leftIcon`, `rightSlot` · `forwardRef` | **14** | wires `aria-invalid` + `aria-describedby`; uses `useId` for the label link | Error / hint styling is good. No `size` variants; textarea has no counterpart primitive (pages use raw `<textarea>`). iOS zoom guard is implemented. |
| 4 | **PasswordInput** | passthrough of Input props + show/hide eye | **1** | eye button has `aria-label` toggle; `tabIndex={-1}` so Tab skips it | `autoComplete` defaults to `current-password`; register / reset flows likely want `new-password` passed explicitly. |
| 5 | **Alert** | `tone: error / success / info` · `title`, children | **21** | `role=alert` (error) or `role=status`; `aria-live=assertive/polite`; `aria-atomic` | Missing `warning` tone despite palette having it. No dismiss button. |
| 6 | **Avatar** | `name`, `src`, `size: xs / sm / md / lg / xl` | **30** | `aria-hidden` when no name; `alt` set when `src` present | Fallback initials up to 2 letters. No status dot for presence. |
| 7 | **Badge** | `tone: neutral / brand / success / warning / danger / info` | **24** | none intrinsic | Pill style only; no counter / dot sub-variant. |
| 8 | **BrandMark** | `size: xs / sm / md / lg / xl` | **5** | `alt="Doctor Cares"` on `<img>` | Loads `/brand-illustration.png`; no `width/height` hint for CLS. |
| 9 | **EmptyState** | `icon`, `title`, `description`, `action` | **35** | none intrinsic | Decorative icon has no `aria-hidden`; `title` is a visual `<h3>` but no scope/id for aria-labelledby patterns. Most-used primitive. |
| 10 | **ErrorState** | `title`, `description`, `onRetry`, `retryLabel` | **23** | `role=alert` on outer div | Hard-codes `AlertTriangle` icon. Retry button inherits Button a11y. |
| 11 | **LoadingSpinner** | `size`, `label`, `fullScreen` | **19** | `role=status`, `aria-live=polite` | No `aria-busy` on parent; label is optional. Lazy-route fallback uses `fullScreen`. |
| 12 | **Skeleton** | `className`, `as: div / span` | **23** | `aria-hidden` on element | No `role=status` wrapper; parent must provide one or screen readers get nothing while loading. |
| 13 | **MenuRow** *(new, untracked)* | `icon`, `label`, `description`, `trailing`, `hideChevron`, `tone: default / danger`, `disabled`, discriminated union of `href` *or* `onClick` | **3** | `focus-visible` state uses background change instead of a ring (deviates from app-wide pattern); `aria-disabled` when disabled Link | 48px min-height meets touch target. Dark/light tested in markup. |
| 14 | **SectionGroup** *(new, untracked)* | `title`, `description`, `action`, `children` | **4** | `<section>` wrapper | No `aria-labelledby` wiring between the uppercase title and the section. |

**Component imports — most-used first.** `EmptyState (35)`, `Card (34)`, `Avatar (30)`, `Button (27)`, `Badge (24)`, `Skeleton (23)`, `ErrorState (23)`, `Alert (21)`, `LoadingSpinner (19)`, `Input (14)`, `BrandMark (5)`, `SectionGroup (4)`, `MenuRow (3)`, `PasswordInput (1)`.

---

## 3. Supporting composition components

| Layer | File | Role |
|---|---|---|
| Auth | `components/auth/PasswordStrength.tsx`, `components/auth/Captcha.tsx`, `components/auth/SocialAuthButtons.tsx` | Password rules UI, hCaptcha wrapper, Google/Apple buttons. |
| Chat | `components/chat/ImageViewer.tsx` (and surroundings — not fully inventoried here) | Modal-like fullscreen viewer. |
| Doctor | `DoctorAppointmentCard`, `FileClaimModal`, `PrescriptionModal`, `ReferralModal` | Doctor-side composed widgets. |
| Patient | `AppointmentCard`, `DoctorCard`, `OnboardingTour`, `SosSheet` | Patient dashboard + flows. |
| Profile | `AvatarUploader` | Avatar replace flow (camera / gallery). |
| Layout | `AdminLayout`, `AuthLayout`, `BottomNavigation`, `CookieBanner`, `DoctorLayout`, `Header`, `InstallPrompt`, `OfflineBanner`, `PageTransition`, `PatientLayout`, `Sidebar`, `UpdatePrompt` | Shell composition. |
| System | `ErrorBoundary` | Global error cushion. |

**Dialog / sheet layer:** six files declare `role="dialog"` or similar — `SosSheet`, `CookieBanner`, `OnboardingTour`, `UpdatePrompt`, `ImageViewer`, `InstallPrompt`. There is **no shared `Dialog` / `Sheet` / `Modal` primitive**; each file re-implements the overlay + container + focus trap (or omits focus trap). This is the single biggest consistency gap.

---

## 4. Composition patterns observed

1. **Page skeleton** = `<Header />` + a vertical stack of `<Card>` groups inside a `max-w-3xl` centered column, with `pb-nav` to clear the floating pill. Confirmed by Header + layout files.
2. **List rows** = `MenuRow` inside `SectionGroup` for profile / settings; detail pages still inline the pattern as bespoke divs.
3. **Empty + error + loading** = each page branches between `<LoadingSpinner fullScreen>` → `<ErrorState onRetry>` → `<EmptyState>` → data. Pattern is applied consistently; the three primitives together form the data-fetch tri-state convention.
4. **Button icons** = Lucide-react icons at `h-4 w-4` (sm/md Button) or `h-5 w-5` (lg Button); icons rendered as `aria-hidden` when decorative.
5. **Interactive card** = `<Card interactive>` wrapped in `<Link to=…>` externally — the Link provides semantics; Card itself is just visual. Fine when the Link is present, misleading when it isn't.

---

## 5. Dark-mode coverage audit (primitives)

| Primitive | Dark-mode handling | Status |
|---|---|---|
| Button | explicit dark variants per style | OK |
| Card | relies on `card-surface` utility (bg + border) | OK |
| Input | `bg-slate-900`, `border-slate-700`, `text-ink-onDark` | OK |
| PasswordInput | inherits Input + eye button has `dark:hover:bg-slate-800` | OK |
| Alert | per-tone dark variants `/10`, `-300`, `/30` | OK |
| Avatar | `dark:bg-brand-500/20 dark:text-brand-200` | OK |
| Badge | per-tone dark variants | OK |
| BrandMark | image — no theming | OK |
| EmptyState | icon badge has `dark:bg-brand-500/15`; title uses `dark:text-ink-onDark` | OK |
| ErrorState | title uses `dark:text-ink-onDark`; danger badge has no dark override | **gap** — danger-soft reads too hot in dark mode |
| LoadingSpinner | neutral `text-ink-muted` only | OK |
| Skeleton | `dark:bg-slate-700/50` | OK |
| MenuRow | dark hover + border variants present | OK |
| SectionGroup | `dark:border-slate-800`, `dark:bg-slate-900` | OK |

---

## 6. A11y coverage audit (primitives)

| Issue | Where | Severity |
|---|---|---|
| Interactive Card has no keyboard semantics | `Card.tsx` when `interactive` is set but no wrapping Link/Button | MED — users with keyboards can't activate it when the pattern is used standalone |
| Alert has no `warning` tone despite tokens supporting it | `Alert.tsx` | LOW |
| EmptyState icon has no `aria-hidden`; `title` not programmatically associated | `EmptyState.tsx` | LOW |
| Skeleton missing a `role=status` wrapper | `Skeleton.tsx` | LOW — hidden content with no announcement |
| Dialogs/sheets each roll their own focus trap or omit it | `SosSheet`, `CookieBanner`, `OnboardingTour`, `UpdatePrompt`, `ImageViewer`, `InstallPrompt` | MED |
| Icon-only buttons rely on caller `aria-label` | `Button.tsx` consumers | MED — no type-level enforcement |
| MenuRow focus-visible uses background colour swap only (no ring) | `MenuRow.tsx` | LOW — diverges from Button focus pattern |

---

## 7. Hygiene issues (non-blocking)

- **74 `text-[10px]` / `text-[11px]` call sites** bypass the `caption` / `label` scale. Full migration is a one-shot cleanup once the scale is documented.
- **9 raw `text-red-* / text-blue-* / text-green-* / bg-*` call sites** bypass semantic tokens. Small, but worth tracking.
- **24 native `<button>` and 5 native `<input>`** elements in `src/` outside the primitives. Some are legitimate (icon-only toolbar buttons on Header), some are drift. A follow-up grep by file is required to classify.
- **Line-ending noise**: Git reports LF→CRLF normalisation for every modified file. Not a design-system issue per se; worth normalising via `.gitattributes` before any batch edit so diffs stay small.
- **`src/pages/PagePlaceholder.tsx`** still exists; unclear which routes still mount it.

---

## 8. Recommendations

Grouped by scope. Nothing in this section is a code change — it is the proposed menu for the next step. **Each item needs individual approval before implementation.**

### 8.1 Documentation-only (zero code risk)

1. **Publish `design-review/tokens.md`** — one source of truth for colour, type, radii, shadow, motion, spacing, safe-area tokens, with sample swatches. Reduces drift as new features arrive.
2. **Codify the data-fetch tri-state convention** (`LoadingSpinner → ErrorState → EmptyState → data`) as a short readme next to `src/components/ui/`.
3. **Codify the page skeleton** (`Header` + centered `max-w-3xl` + `pb-nav`) so new pages stop re-deriving it.

### 8.2 Low-risk primitive refinements (small diffs)

4. **Add `warning` tone to `Alert`** (parity with Badge; tokens already exist).
5. **Add `aria-hidden` to decorative EmptyState icons** and expose an optional `titleId` for `aria-labelledby`.
6. **Give `Skeleton` an optional `role="status"` wrapper mode** (opt-in `label` prop, matching LoadingSpinner's API).
7. **Give `MenuRow` a focus-visible ring** aligned with Button to kill the subtle inconsistency on keyboard nav.
8. **Document (or enforce via a discriminated union) that icon-only Button requires `aria-label`.**
9. **Dark-mode danger badge** on `ErrorState` — add `dark:bg-red-500/15 dark:text-red-300`.
10. **`<Textarea>` primitive** mirroring Input's label/hint/error API (5 inline textareas today; count will grow).

### 8.3 Medium-value additions (new primitive)

11. **Shared `Dialog` / `Sheet` primitive** — the biggest consistency win. Six overlays today, no common focus trap, no common `aria-modal`, no shared enter/exit animation. Implementing one primitive and migrating overlays one-by-one would unlock accessibility and visual parity. This touches six consumer files, so would be proposed as its own mini-plan.
12. **`Switch` primitive** — settings pages toggle themes and prefs with ad-hoc inputs. One primitive, consistent focus ring, matches `MenuRow`'s `trailing` slot.
13. **`Tabs` primitive** — appointments pages (patient + doctor) implement their own tab bars; one primitive would consolidate.

### 8.4 Hygiene sweeps (opt-in later)

14. **Replace `text-[10px]` / `text-[11px]` with `text-label` / `text-caption`** across 74 call sites. Pure find/replace once the scale is confirmed stable.
15. **Replace raw `text-red-* / text-blue-*` with semantic equivalents** across 9 call sites.
16. **Classify the 24 native `<button>` uses** — keep intentional icon buttons (back arrow, theme toggle); migrate anything that looks like a visual CTA to `Button`.

### 8.5 Not recommended for Phase 2

- Introducing shadcn/ui, Radix, Headless UI, or any component library. These would be new dependencies and change the ownership model.
- Repalettising. The brand blue stays.
- Any work that touches auth, Supabase, migrations, env, Capacitor, or routing.

---

## 9. Open questions for the user

1. **Which of §8.1–§8.3 should move into a Step 2.2 proposal?** My recommendation is §8.1 (all three docs), §8.2 items 4, 5, 6, 7, 9 (low-risk, user-visible), and §8.3 item 11 (`Dialog` primitive) as its own mini-plan — but Phase 2's scope is strictly design system, so I will stop and ask again before touching any consumer file.
2. **Does the `warning` tone on `Alert` need a specific icon** (e.g. `AlertTriangle`) or should it inherit the generic info `Info` icon?
3. **Should `Textarea` be in scope for this phase**, or deferred? It's new API surface area, not pure refinement.
4. **Is a `.gitattributes` entry for LF normalisation acceptable** before any batch edit, to keep diffs clean on Windows? That is a config change (one line), so I'll wait for a yes/no.

---

## 10. Explicit non-findings (preserved as-is)

- **Patient booking flow, authentication, Supabase integration, OpenFDA integration, Android/PWA configuration** — not touched by this inventory, not proposed for change in Phase 2.
- **All 29 modified files** on the working tree — read for inventory, not altered.
- **Both untracked UI additions** (`MenuRow.tsx`, `SectionGroup.tsx`) — read and included in the inventory; not altered.
