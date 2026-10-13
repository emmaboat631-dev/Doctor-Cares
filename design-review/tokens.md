# Doctor Cares — Design Tokens Reference

Authoritative, read-only documentation of the design tokens and conventions
actually implemented in the codebase as of **2026-10-13**. Every entry below
is traceable to a specific source file; nothing is aspirational.

- Visual gallery (iPhone-framed screens + swatches): [`design-review/index.html`](./index.html)
- Component inventory & recommendations: [`design-review/components-inventory.md`](./components-inventory.md)
- Source of truth for Tailwind tokens: `tailwind.config.js`
- Source of truth for global styles & keyframes: `src/styles/index.css`

> Scope note. This file documents what exists. Any gap between what's documented
> here and what a page actually renders is a drift bug, not a redefinition. Edit
> `tailwind.config.js` / `src/styles/index.css` first; update this file to match
> second.

---

## 1. Colour

### 1.1 Brand (healthcare blue)

Preserved identity anchor. Primary action is `brand.500 #1E5EFF`.

| Token | Hex | Typical use |
|---|---|---|
| `brand.50` | `#EEF3FF` | Soft surface fills, success-adjacent chips |
| `brand.100` | `#D9E4FF` | Avatar initials background (light) |
| `brand.200` | `#B4C9FF` | Avatar initials text (dark mode via `brand-200`) |
| `brand.300` | `#8AA8FF` | Decorative accents |
| `brand.400` | `#5A82FF` | Hover-less secondary ink |
| **`brand.500`** | **`#1E5EFF`** | **Primary CTA · active nav tab · focus ring** |
| `brand.600` | `#1A4FDB` | Primary CTA hover |
| `brand.700` | `#173FB2` | Secondary-button ink on light bg |
| `brand.800` | `#122F87` | Deep brand surfaces |
| `brand.900` | `#0D215E` | Deepest brand surfaces (rare) |

Dark mode consumers prefer `brand-500/15` → `brand-500/25` as the soft fill,
and `brand-200` as the ink.

### 1.2 Accent (soft teal)

Defined for future use. Currently **not consumed by any primitive**; new
features that want a secondary accent should pull from here instead of raw
`emerald-*` or `sky-*`.

| Token | Hex |
|---|---|
| `accent.50` | `#EAFBF6` |
| `accent.100` | `#CDF3E6` |
| `accent.200` | `#9DE7CD` |
| `accent.300` | `#65D7B0` |
| `accent.400` | `#2FBF8F` |
| `accent.500` | `#0FA774` |
| `accent.600` | `#0A855C` |
| `accent.700` | `#086648` |
| `accent.800` | `#064932` |
| `accent.900` | `#03301F` |

### 1.3 Surface (light-mode backgrounds)

| Token | Hex | Where |
|---|---|---|
| `surface.DEFAULT` | `#FFFFFF` | Card body, header |
| `surface.muted` | `#F5F7FB` | Page background (`body`) |
| `surface.soft` | `#EEF1F7` | Section separators, soft chrome |

Dark-mode body is **not** tokenised — `html.dark body` applies raw
`bg-slate-950`. Cards in dark mode rely on the `card-surface` utility (see
§2.4), which uses `bg-slate-900` + `border-slate-800`.

### 1.4 Ink (foreground / text)

| Token | Hex | Role |
|---|---|---|
| `ink.DEFAULT` | `#0F172A` | Body text (`<body>` default) |
| `ink.soft` | `#334155` | Labels, secondary text |
| `ink.muted` | `#64748B` | Meta, captions, placeholder-adjacent |
| `ink.faint` | `#94A3B8` | Placeholders, decorative |
| `ink.onDark` | `#F8FAFC` | Primary text on dark surfaces |

Dark-mode secondary ink is **not** tokenised — components reach for
`dark:text-slate-300` / `dark:text-slate-400` directly. Treat
`slate-300 == ink.soft (dark)` and `slate-400 == ink.muted (dark)` as the
de-facto convention.

### 1.5 Semantic (status)

Each semantic colour ships with a solid `DEFAULT` and a `soft` tint.

| Token | Default | Soft | Where |
|---|---|---|---|
| `success` | `#16A34A` | `#DCFCE7` | Confirmed badges, Alert success |
| `warning` | `#F59E0B` | `#FEF3C7` | Warning badges (Alert warning tone is **not yet implemented** — see inventory §8.2) |
| `danger` | `#DC2626` | `#FEE2E2` | Destructive buttons, error alerts, nav-badge dot |
| `info` | `#0EA5E9` | `#E0F2FE` | Informational alerts |

Dark-mode companions follow the pattern `bg-<semantic>-500/10 text-<semantic>-300 border-<semantic>-500/30`.

---

## 2. Typography

### 2.1 Font family

```
font-sans → Inter, ui-sans-serif, system-ui, -apple-system,
            Segoe UI, Roboto, Helvetica Neue, sans-serif
```

Inter is loaded via Google Fonts in `index.html` (preconnect + stylesheet).
On native (Capacitor) and offline, the system fallback stack renders instead
— designs should degrade gracefully.

### 2.2 Scale (Tailwind extended)

| Token | Size · line-height | Letter-spacing | Intended use |
|---|---|---|---|
| `text-label` | `0.625rem (10px) · 0.875rem` | `+0.06em` | Uppercase overlines, group labels |
| `text-caption` | `0.6875rem (11px) · 0.875rem` | — | Meta rows, chip subtext, timestamps |
| `text-xs` | `0.75rem (12px) · 1rem` | — | Secondary meta |
| `text-sm` | `0.875rem (14px) · 1.25rem` | — | Body |
| `text-base` | `1rem (16px) · 1.5rem` | — | Headings in-row, large body |
| `text-lg` | `1.125rem (18px) · 1.75rem` | — | Section titles |
| `text-xl` | `1.25rem (20px) · 1.75rem` | — | Page titles |
| `text-2xl` | `1.5rem (24px) · 2rem` | — | Hero numbers |
| `text-3xl` | `1.875rem (30px) · 2.25rem` | — | Marketing / splash |

> **Known drift.** 74 call sites still write `text-[10px]` or `text-[11px]`
> instead of using `text-label` / `text-caption`. Migrating them is a Phase 2
> hygiene sweep — not done yet.

### 2.3 Weights

Tailwind defaults, no tokenisation. Observed in the codebase:
`font-medium`, `font-semibold`, `font-bold`, `font-black` (rare).

### 2.4 Base & component text utilities (`src/styles/index.css`)

- `body` ↔ `bg-surface-muted text-ink` (light), `bg-slate-950 text-ink-onDark` (dark).
- iOS zoom fix: on `(hover: none) and (pointer: coarse)`, `input`, `select`,
  `textarea` are forced to `font-size: 16px` to stop Safari auto-zoom on
  focus.
- Keyboard focus ring (any element): `2px solid brand.500` + `2px offset`,
  `border-radius: 6px`.
- `.card-surface` → `bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800`.
- `.hairline` → `border-t border-slate-200/70 dark:border-slate-800`.

---

## 3. Radii

| Token | Value | Intended use |
|---|---|---|
| `rounded-md` | Tailwind default `0.375rem` | Small chips, inner elements |
| `rounded-lg` | Tailwind default `0.5rem` | MenuRow icon badge |
| `rounded-xl` | `0.875rem` (overridden) | Buttons, inputs, badges, pills |
| `rounded-2xl` | `1rem` (overridden) | Cards, modals, section groups |
| `rounded-3xl` | `1.5rem` (overridden) | Full-screen hero shapes |
| `rounded-full` | `9999px` | Avatars, nav pill, bell/back buttons |

The pill nav uses an ad-hoc `rounded-[28px]` — this is the only in-tree
non-tokenised radius and is accepted as the pill's identity.

---

## 4. Shadow

| Token | Value | Where |
|---|---|---|
| `shadow-card` | `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)` | Default card |
| `shadow-pop` | `0 8px 24px rgba(15,23,42,.10)` | Interactive card hover |
| `shadow-nav` | `0 -4px 12px rgba(15,23,42,.06)` | Fixed navs with upward glow (unused in current pill nav, defined for future) |

The pill nav uses an ad-hoc
`shadow-[0_20px_50px_-15px_rgba(15,23,42,0.5)]` for its lifted feel — the
only shadow outside the token set.

Dark-mode: shadows are suppressed by convention; depth is signalled through
`border` + translucent fills instead.

---

## 5. Motion

### 5.1 Easings

| Token | Curve | Use |
|---|---|---|
| `ease-spring` | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS-feel springs for page / nav transitions |
| `ease-out-soft` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Hairline presses, press-tile scale |

Ad-hoc `cubic-bezier(0.16, 1, 0.3, 1)` appears in splash/onboarding keyframes
inside `index.css`; it is not tokenised because those scenes are
single-site set-pieces.

### 5.2 Keyframes (Tailwind-tokenised)

| Animation | Duration · easing | Behaviour |
|---|---|---|
| `animate-fade-in` | 200ms ease-out | Simple opacity 0→1 |
| `animate-slide-up` | 260ms ease-out-soft curve | Translate 8px up + fade |
| `animate-skeleton` | 1.4s ease-in-out infinite | Loading pulse (bg between 15 % and 35 % slate-400) |

### 5.3 Keyframes (CSS-only, scene-specific, in `index.css`)

Only applied to splash / onboarding; not reusable building blocks.

- Page transitions: `.page-enter-forward`, `.page-enter-back` — 360ms spring,
  24px slide + fade, with `will-change` hints.
- Splash: `.splash-logo-in`, `.splash-float`, `.splash-title-in`,
  `.splash-sub-in`, `.splash-progress`, `.splash-orb`,
  `.splash-exit`, `.splash-exit-bg`.
- Onboarding: `.onboarding-scene-in`, `.ob-illus-in`, `.ob-title-in`,
  `.ob-body-in`, `.ob-float`.

### 5.4 Reduced motion

`@media (prefers-reduced-motion: reduce)` clamps every animation and
transition in the app to `0.001ms`. The scene-level helpers also opt in
explicitly inside `@layer components`.

---

## 6. Spacing

Tailwind defaults, plus four safe-area tokens:

| Token | Value |
|---|---|
| `spacing.safe-t` | `env(safe-area-inset-top)` |
| `spacing.safe-b` | `env(safe-area-inset-bottom)` |
| `spacing.safe-l` | `env(safe-area-inset-left)` |
| `spacing.safe-r` | `env(safe-area-inset-right)` |

Companion component utilities in `src/styles/index.css`:
- `.safe-top` → `padding-top: max(env(safe-area-inset-top), 0.5rem)`
- `.safe-bottom` → `padding-bottom: max(env(safe-area-inset-bottom), 0.5rem)`
- `.pb-nav` → `padding-bottom: calc(6.5rem + env(safe-area-inset-bottom))` on
  mobile; `1.5rem` from `sm` upwards. Pages that render under the floating
  pill nav must apply this on their scroll container.

Touch target rule of thumb across primitives: **min-height 44–48 px** on
tappable rows (`MenuRow` enforces 48 px). Icon-only header buttons are
`h-10 w-10`.

---

## 7. Breakpoints

Tailwind defaults plus one custom entry:

| Alias | Min width | Introduced for |
|---|---|---|
| `xs` | `375px` | iPhone SE-class viewports |
| `sm` | `640px` | Tailwind default — switches off pill nav, enables `sm:text-sm` on inputs |
| `md` | `768px` | Tailwind default |
| `lg` | `1024px` | Tailwind default — admin console |
| `xl` | `1280px` | Tailwind default |
| `2xl` | `1536px` | Tailwind default |

Policy: the pill nav is **mobile-only** (`sm:hidden`). Admin layouts are
**desktop-only** (gated by a mobile splash).

---

## 8. Theming mechanics

- Strategy: `darkMode: 'class'` on `html` — toggled by
  `src/contexts/ThemeContext.tsx`.
- Modes: `light`, `dark`, `system` (persisted to `localStorage['dc:theme']`).
- The theme root sets `color-scheme: dark` under `html.dark` so native
  scrollbars and form controls follow suit.
- Status-bar / splash on Capacitor Android — handled by `src/lib/native/*`.

Pattern for consumers:

```tsx
// Light + dark via Tailwind variants, not a theme-aware JS prop.
<div className="bg-white dark:bg-slate-900 text-ink dark:text-ink-onDark">
```

Translucent conventions:
- Soft fills in dark mode: `bg-<colour>-500/10` (chip body),
  `bg-<colour>-500/15` (icon badge), `bg-<colour>-500/20` (hover).
- Borders: `border-slate-200/70` (light), `border-slate-800` (dark).

---

## 9. Interaction & focus

- **Press feedback.** `active:scale-[0.98]` applied via `.press-tile`
  component class, Button, interactive Card.
- **Haptic feedback.** `src/lib/native/haptics.ts` → `tap()` fires a light
  haptic on primary nav interactions when running on Capacitor; a no-op in
  the browser.
- **Focus ring.**
  - Global default (`:focus-visible` in base layer): `2px brand.500` + 2px
    offset.
  - Button and Input use component-local
    `focus-visible:ring-2 ring-brand-500 ring-offset-2 ring-offset-white
    dark:ring-offset-slate-900` for parity.
  - The pill nav uses a white ring over its dark background instead
    (`ring-white/80 ring-offset-slate-900`) — intentional contrast exception.
- **Tap highlight.** Base layer removes
  `-webkit-tap-highlight-color` globally.

---

## 10. Conventions this file does not duplicate

- **Component API** — see `design-review/components-inventory.md`.
- **Page skeleton & data-fetch tri-state convention** — not yet codified.
  Proposed as its own doc after this file lands.
- **PWA / Capacitor styling** — `index.html` and `capacitor.config.ts` hold
  the metadata; the manifest icon palette matches `brand.500`.

---

## 11. Where tokens are defined

Changing any token means editing one of these two files **first**, then
syncing this document and the gallery.

| What changes | File to edit |
|---|---|
| Palette, type scale, radii, shadows, easings, animations, breakpoints, safe-area spacing | `tailwind.config.js` |
| Base resets, body background, focus ring, iOS zoom fix, component helpers (`.card-surface`, `.hairline`, `.pb-nav`, `.press-tile`), splash/onboarding/page keyframes | `src/styles/index.css` |
| Visual gallery (iPhone-framed previews + swatches) | `design-review/index.html` |

If a value exists in a Tailwind config file **and** in
`design-review/index.html`'s inline Tailwind config, the Tailwind config in
the repo wins — the gallery mirrors it.

---

## 12. Known drift, open gaps

Cross-referenced with `components-inventory.md` §7 and §8:

- 74 ad-hoc `text-[10px]` / `text-[11px]` sites bypass `text-label` /
  `text-caption`.
- 9 raw `text-red-* / text-blue-* / text-green-* / bg-*` sites bypass
  semantic tokens.
- `Alert` has no `warning` tone even though `warning` tokens exist.
- `accent.*` palette is unused by any primitive.
- Pill-nav uses an ad-hoc `rounded-[28px]` and shadow — accepted exception.
- Dark-mode `ink.soft` / `ink.muted` aren't tokenised; code uses
  `slate-300` / `slate-400` directly.
- No shared `Dialog` / `Sheet` primitive — six overlays each roll their own.

None of the above is a bug in the token system; they are migrations waiting
to happen. Every refinement is proposed and approved individually (see
`components-inventory.md` §8).

---

*Last reviewed: 2026-10-13. Review again whenever `tailwind.config.js` or
`src/styles/index.css` changes.*
