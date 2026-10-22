# Gerencial dashboard — fase 4 visual

Admin shell first, then the dashboard and the remaining demo sections. Branch
`feat/tw4-stack-foundation-pr3-admin`; delivery as work-unit commits; merge is human.
Runner: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
`bash scripts/check-visual-contract.sh`, plus a Playwright smoke over both themes.

## Specs

S1 — Light mode is real, not a class flip. `html.light` resolves the admin palette to
a light set; `color-scheme` follows; body, cards, sidebar, header and portals are
readable. The admin theme class is removed when the admin subtree unmounts so the
member app and the stage keep their dark palette. The admin default remains dark.

S2 — Contrast. Shell text and controls meet WCAG AA: 4.5:1 for normal text and 3:1
for large text and UI. The dark `cem.secondary-elevated` on `cem.hover` floor
(currently 3.93:1) is fixed. Light palette values are measured before they ship.

S3 — Template info. No visible ShadcnDashboard branding, `V.1.0`, Basic Plan /
Upgrade, Help Center / Documentation, Buy now, Cameron or a demo email, fake
notifications, or shadcndashboard/WrapPixel footer. The shell shows CEMURM identity
and the signed-in manager.

S4 — Navigation. The sidebar keeps every local admin route (dashboard, tables, form,
profile, notes, blog, tickets, icons, auth demos) and drops the external
shadcndashboard demo links that are not routes. Search searches that same local menu
and navigates under `/admin`.

Assumption: the shadcndashboard.dev links are template marketing/demo links, not app
routes. Removing them does not remove a screen; every local route stays reachable.

S5 — Margins and spacing. Shell frame, header, content and footer use a consistent
spacing scale; the content surface has intentional radius/border; no double frame;
the shell holds at 1440px and on mobile.

S6 — Scope guard. No changes to `src/features/stage/**`, `projection/**`,
`landing/**` or their routes. The member app remains dark after leaving `/admin`.

S7 — Section sequence: shell (this unit), then dashboard, blog, notes, tickets,
tables / form / profile / icons / auth. Each section closes with its own verification
and work-unit commit.

## Tasks

| ID | Spec | Route | Status | Commit | Evidence |
| --- | --- | --- | --- | --- | --- |
| T1 | S1, S2 | inline | done | bfa78e7 | `--cem-light-*` inputs + `html.light` mapping + `color-scheme`; admin-only class cleanup. Light body `rgb(248,250,252)`, text `rgb(15,23,42)`; dark reload and member app stay dark. |
| T2 | S3, S4 | inline | done | bfa78e7 | CEMURM mark/wordmark, local-only sidebar, CEMURM `<footer>` with Back to app; plan/help/buy/version removed. |
| T3 | S3, S4 | inline | done | bfa78e7 | Real profile sheet (Demo User / demo@cemurm.app), controlled close, Profile and Member app links, sign-out to `/auth`; fake notifications gone; search covers the local menu and parent paths. |
| T4 | S2, S5 | inline | done | bfa78e7 | Inset panel `m-2 lg:m-3`, rounded border, `p-4 lg:p-6`, material header; dark `secondary-elevated` #cbd5e1; light palette measured 5.2:1+ (text 17.06, secondary 7.24, amber 6.78). |
| T5 | S1-S6 | inline | done | bfa78e7 | Both themes, scope check, gates, screenshots and mobile shell verified. See L5. |
| T6 | S1, S2, S5 | inline | done | aca0cc8 | Shared Card surface/radius/ring restored on the dashboard cards; seamless Lyra grid replaced with `grid grid-cols-12 gap-4`; chart axis/grid moved to declared cem tokens. |
| T7 | S3, S4 | inline | done | aca0cc8 | Sun uses `text-cem-amber`, Moon uses `text-cem-secondary-elevated` (no raw orange), `StyleAwareWrapper`/`StyleDivider` and the fake sort icons removed, CEMURM labels kept. |
| T8 | S1, S5 | inline | done | aca0cc8 | `preserveStartEnd` + `minTickGap={32}` yields 8 desktop / 4 mobile labels with no overlap; cards stack; the Events table uses native `overflow-x-auto` with no page overflow. |
| T9 | S1-S6 | inline | done | aca0cc8 | Gates green, both themes and mobile measured with Playwright, screenshots captured. See L7. |

## Log

L1 — 2026-10-20 — user request (verbatim):

> faltan aplicar mejoras y ajustes como de marges contraste y el cambion al modo claro, ademas de que falta adaptar la informacion que es del template, pero vamos por partes primero, vamos a adaptar seccion por seccion

L2 — 2026-10-20 — audit before the first write: the toggle adds `html.light`, but
`src/app/index.css` only declares the dark `@theme`, `html` is hardcoded to
`color-scheme: dark`, and `body` remains `rgb(15, 23, 42)` with `rgb(248, 250, 252)`
text in light mode. The visible template shell still carries the ShadcnDashboard
logo, `V.1.0`, Basic Plan 70% / Upgrade, Help Center / Documentation, the
shadcndashboard/WrapPixel footer, Cameron's avatar/email, fake notifications and the
external demo links. The dashboard content itself is already CEMURM-adapted.

L3 — 2026-10-20 — shell implementation (T1–T4). The dark `@theme` block keeps
the existing palette; `--cem-light-*` values are inputs inside the same sanctioned
block, and `html.light` maps the role variables plus the chart/status aliases,
sets `color-scheme: light`, and deliberately leaves the stage namespace alone.
`AdminThemeBoundary` restores the previous html classes on unmount, so the member
app and stage do not inherit light. The shell now uses the CEMURM mark/wordmark,
a trimmed local-only sidebar (Dashboard, Pages, Apps, Icons, Auth demos), a
semantic footer with "Back to app", and a real profile sheet fed by `useAuth`.
The notifications trigger and all external template marketing links are gone.
Search reuses the sidebar menu, matches parent labels as well as item names, and
routes through `toAdminPath`. `FullLayout` gets the inset panel (`m-2 lg:m-3`,
rounded, `p-4 lg:p-6`) and the header uses the cem material. The dark
`secondary-elevated` leaf is raised to `#cbd5e1`.

L4 — 2026-10-20 — gate findings and fixes. `pnpm typecheck` flagged `Profile.tsx`
because `useAuth` is a JS module whose context starts as `null` and is inferred
as `never`; added a local `AdminProfileUser` shape and cast. `pnpm lint` flagged
`Search.tsx`'s `any` types and exhaustive-deps warning; `searchItems` moved to
module scope, typed `SearchNode`/`SearchResult`, and the blanket eslint-disable
header was removed. `pnpm test` flagged `visual-contract-theme.test.js` because
`html.light` re-declares existing `--color-*` keys; the test compared the unique
gate allowlist with every declaration line and now compares the unique declared
set. That test is the gate-contract check (no new key may appear unallowed), not
a domain characterization assertion; no app behavior assertion was weakened. The
gate still reads only the `@theme` block for rules 02/05, so the light overrides
are measured below rather than scored by 05a/05b.

L5 — 2026-10-20 — verification.

- `pnpm typecheck` PASS; `pnpm lint` PASS (0 warnings); `pnpm test` PASS (21 files,
  427 tests); `pnpm test:gherkin` PASS (5 files, 44 tests); `pnpm build` PASS
  (pre-existing >500 kB chunk warning only); `bash scripts/check-visual-contract.sh`
  PASS (12 rules, 0 failing).
- Playwright Chromium (1440x1000): admin light `html.light` + `color-scheme: light`
  + body `rgb(248,250,252)` + text `rgb(15,23,42)` + 7 dashboard cards; dark after
  reload `html.dark` + body `rgb(15,23,42)`; theme toggle light->dark->light;
  member app after leaving `html` class empty + `color-scheme: dark` + body
  `rgb(15,23,42)`; search "Blog" returns 5 results with parent paths and navigates
  to `/admin/apps/blog/post`; profile sheet shows Demo User / demo@cemurm.app,
  Profile closes the sheet and reaches `/admin/pages/user-profile`, Member app
  reaches `/` and cleans the admin class, sign-out reaches `/auth` and cleans the
  class; mobile 390x844 has no horizontal overflow and the sidebar sheet opens
  with the CEMURM header; no console errors.
- Visual gate warnings: rule 02 at its 240/240 ceiling; rule 05a cannot score the
  8 light `var()` overrides (PASS, measured manually); rule 05b reports 12
  pre-existing dark-palette pairs; r1/r2 are report-only. Light contrast: text
  17.06/17.85/16.30/14.48; secondary 7.24/7.58/6.92/6.15; secondary-elevated
  9.90/10.35/9.45/8.40; amber 6.78/7.09/6.47/5.75; amber button text 6.78.
- Screenshots: `/tmp/opencode/shell-light-2.png`, `shell-dark-2.png`,
  `shell-profile-light.png`, `shell-mobile-light.png`,
  `shell-mobile-sidebar.png`, `shell-profile-page-light-2.png`,
  `member-after-admin-2.png`, `auth-after-signout.png`.
- Shell work-unit commit: `bfa78e7`; this docs commit records it.

L6 — 2026-10-21 — dashboard audit before the dashboard write. The dashboard content
is already CEMURM-adapted (phase 3, `f198bb9`), so this section changes presentation,
not data or routes. Four presentation defects were found:

- `DashboardCard` flattens the shared `Card` to `rounded-none bg-cem-base
  shadow-none ring-0`; combined with the seamless Lyra grid (`p-px gap-px
  bg-cem-hover`) it removes the radius, surface and ring the shell now uses.
- `StyleAwareWrapper` declares `defaultClassName` but never reads it, so the
  dashboard's intended `grid-cols-12 gap-4` is dead code and the cards have no
  gap. `StyleDivider` only exists to draw the seam lines of that unused style.
- The chart axis/grid use undeclared `--muted-foreground` / `--border`, so they
  do not follow the light palette. The x-axis also forces 7–8 category labels
  through a fixed `labelEvery`, which is what overlaps at 390px.
- Template leftovers: the greeting uses `<Sun color="orange">` (raw colour), the
  events table renders `ArrowDownUp` icons for a sort that does not exist, and the
  summary cells use `bg-cem-base` inside the card.

Decision: restore the shared Card surface/radius/ring, use the gap grid and drop
the no-op wrappers from the dashboard view, use the declared cem tokens for the
chart, let Recharts choose ticks with `preserveStartEnd` + `minTickGap`, and remove
the false affordances. The member-app links (`/songs`, `/setlists`, `/gigs`,
`/bandmates`, `/rehearsals`, `/organizations`) stay: they are the real destinations
for those assets; the admin template has no equivalent screens. The cancelled chip
uses `text-cem-text` on its rose tint because the dark rose on `cem.surface` is a
pre-existing 3.98:1 pair (gate 05b); the negative delta keeps the destructive token
and the known 05b warning.

L7 — 2026-10-22 — dashboard verification and closing of T6–T9.

- Gates: `pnpm typecheck` PASS; `pnpm lint` PASS (0 warnings); `pnpm test` PASS
  (427/427); `pnpm test:gherkin` PASS (44/44); `pnpm build` PASS (index 451.21 kB,
  the pre-existing >500 kB iconify chunk warning only); visual gate PASS (12 rules,
  0 failing; 05a still cannot score the 8 light `var()` overrides, 05b reports the
  12 pre-existing dark pairs, r1/r2 are report-only).
- Playwright Chromium, 1440x1000 and 390x844, both themes: light is `html.light`
  with body `rgb(248,250,252)` and text `rgb(15,23,42)`; dark is body
  `rgb(15,23,42)` and text `rgb(248,250,252)`. 7 cards, white / `rgb(30,41,59)` on
  `#0f172a`, radius 12px, ring present, grid gap 16px, page overflow 0.
- Chart: 610px desktop / 300px mobile; 8 / 4 x-axis labels with
  `xLabelOverlaps: []`; axis fill `rgb(51,65,85)` light and `rgb(203,213,225)`
  dark; grid line follows `--color-cem-hover`. The greeting icon is the evening
  Moon on `text-cem-secondary-elevated` (`rgb(51,65,85)` / `rgb(203,213,225)`);
  the morning Sun path is the only amber accent. 0 decorative sort icons.
- Select and tooltip: select light `rgb(241,245,249)` / `rgb(15,23,42)`, dark
  `rgb(51,65,85)` / `rgb(248,250,252)`; 3 options; tooltip light
  `rgb(248,250,252)` / `rgb(15,23,42)`, dark `rgb(15,23,42)` /
  `rgb(248,250,252)`. No console or page errors.
- Events card: the template `SimpleBar` wrapper rendered a 258px content area
  around a 129px table, leaving ~130px of empty scroll surface below two rows.
  Removing it (the inner native `overflow-x-auto` already handles mobile width)
  leaves a 245px card with a 174px table and no empty scroll area; the table still
  scrolls horizontally at 390px with no page overflow.
- Screenshots: `/tmp/opencode/dashboard-light.png`, `dashboard-dark.png`,
  `dashboard-mobile-light.png`, `dashboard-mobile-dark.png`,
  `dashboard-light-select.png`, `dashboard-dark-select.png`,
  `dashboard-light-tooltip.png`, `dashboard-dark-tooltip.png`.
- Source work-unit commit: `aca0cc8`; this docs commit records it. `simplebar-react`
  stays in `package.json` (template dependency) but no longer has an importer.

L8 — 2026-10-22 — section closed. Dashboard presentation is CEMURM-aligned in both
themes and the next section in the S7 order is blog: remove the template's demo
posts/author/categories, map the screen to CEMURM content, and apply the same
light/dark and spacing checks before its own work-unit commit.
