# Tablet responsiveness — change notes

Mobile-first is preserved: **nothing below 768px wide changes**. The phone
layout renders byte-for-byte as it did before. Everything below only kicks in
from 768px up, which is where an admin working off an iPad has room to spare.

## What was added

**A breakpoint foundation** (`src/App.jsx`, near the top)

- `BP` — the two breakpoints: `tablet: 768`, `desktop: 1100`.
- `useViewport()` — a hook returning `{ width, height, isTablet, isDesktop,
  isLandscape, isShort }`. One shared resize/orientationchange listener feeds
  every component that uses it, rather than each attaching its own.
- `twoColOn(bool)` — a grid helper. Cards keep their existing `marginBottom`,
  which becomes the row gap.
- `shellMaxWidth(screen, isTablet)` — the single place container widths are
  decided.

**Container widths**

| Screen | Phone | Tablet |
|---|---|---|
| Public (Today, Fixtures, Teams, Standings, Info, Welcome) | 480px | 640px |
| Referee | 480px | 820px |
| Admin / mentor dashboard | 480px | 900px |

The welcome screen renders outside the main shell, so it got its own cap —
without it, it stretched edge-to-edge on a tablet.

**Two columns on tablet (single column on phone, unchanged)**

- Admin → Burgers: the per-team burger/coach rows
- Admin → Fixtures: the fixture list
- Admin → Settings: the settings cards, and the activity log
- Referee: the match list

Announcements deliberately stay a single column, capped at 720px — long text
is harder to read across a full 900px.

**Bigger tap targets on tablet**

- Burger and coach steppers: 30px → 44px
- Shared `Stepper` component: 40px → 52px
- Referee score +/- buttons: 48px → 64px, digits 36px → 46px
- Admin tab pills, referee save button, bottom nav icons and labels all scale up
- CSS classes `.tt`, `.tt-lg`, `.tt-input` are available for anything added later

**Landscape / short viewports**

- Every dialog now carries a `.modal-card` class capping it at 90dvh with
  internal scrolling, so buttons can't end up stranded below the fold when a
  tablet is turned sideways.
- The welcome dialog's `80vh` became `min(80vh, 88dvh)`.

**Pinch-zoom re-enabled** (`index.html`)

`maximum-scale=1.0` was blocking zoom entirely — an accessibility problem and
a nuisance on a tablet. Replaced with `viewport-fit=cover`, which also keeps
the layout clear of safe areas in landscape.

## Before you ship

`dist/` was left untouched — rebuild with `npm run build` to pick these up.

Worth eyeballing on the real device at 768px, 1024px and in landscape:

- Admin → Burgers with all clubs listed (the two-column grid with the longest
  club names)
- Admin → Fixtures with the full schedule loaded
- Referee score entry, both portrait and landscape
- The finals-confirmation dialog on a tablet in landscape
