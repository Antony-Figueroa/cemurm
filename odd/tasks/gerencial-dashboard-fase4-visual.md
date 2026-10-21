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
| T1 | S1, S2 | inline | done | pending | `--cem-light-*` inputs + `html.light` mapping + `color-scheme`; admin-only class cleanup. Light body `rgb(248,250,252)`, text `rgb(15,23,42)`; dark reload and member app stay dark. |
| T2 | S3, S4 | inline | done | pending | CEMURM mark/wordmark, local-only sidebar, CEMURM `<footer>` with Back to app; plan/help/buy/version removed. |
| T3 | S3, S4 | inline | done | pending | Real profile sheet (Demo User / demo@cemurm.app), controlled close, Profile and Member app links, sign-out to `/auth`; fake notifications gone; search covers the local menu and parent paths. |
| T4 | S2, S5 | inline | done | pending | Inset panel `m-2 lg:m-3`, rounded border, `p-4 lg:p-6`, material header; dark `secondary-elevated` #cbd5e1; light palette measured 5.2:1+ (text 17.06, secondary 7.24, amber 6.78). |
| T5 | S1-S6 | inline | done | pending | Both themes, scope check, gates, screenshots and mobile shell verified. See L5. |

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
- Shell work-unit commit: pending until committed; the close docs commit records it.
