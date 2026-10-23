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
| T10 | S5 | inline | done | 5d503d7 | All five blog views dropped the no-op `StyleAwareWrapper`/`StyleDivider`, use the page gap and a 24px inner grid, and the dead "Add selected category" button is gone. |
| T11 | S3 | inline | done | 5d503d7 | The detail renders each post's `body`/`quote` instead of the MTA filler; `shadcn-admin` alt text is gone; read time is computed; categories/tags/filter use the demo taxonomy. |
| T12 | S1, S2 | inline | done | 5d503d7 | Featured card has static 8/4 columns, radius/ring and a theme-aware `bg-cem-base/70` scrim with `cem.text`; category badges are neutral, status dots semantic, both themes and mobile checked. |
| T13 | S1-S6 | inline | done | 5d503d7 | Gates green; Playwright both themes and mobile over listing/detail/manage/create/edit; screenshots captured. See L10. |
| T14 | S3, S5 | inline | done | 3cd3049 | View wrappers removed, page gap 16, breadcrumb/notice/title now Notes. See L13. |
| T15 | S1, S2, S3 | inline | done | 3cd3049 | SWR/sessionStorage/console and the MSW notes mock removed; neutral cards with amber selection; delete bubbling and sheet close fixed; neutral empty state; dialog action order; shared search text contrast. See L13. |
| T16 | S1-S6 | inline | done | 3cd3049 | Gates green; Playwright both themes and mobile over list/content/search/add/delete/sheet; screenshots captured. See L13. |
| T17 | S3, S5 | inline | done | 9a4fdf8 | Tickets shell: view wrappers removed, page gap and CEMURM copy/breadcrumbs. See L16. |
| T18 | S1, S2, S3 | inline | done | 9a4fdf8 | Dead SWR/sessionStorage reset and ticket MSW mock removed; neutral filter cards with amber active state; semantic Open/Pending/Closed badges; visible delete; toolbar/search stay mounted; neutral empty state; typed status/filter. See L16. |
| T19 | S1, S2, S3 | inline | done | 9a4fdf8 | Shared CEMURM demo agents in list and form; labelled agent picker; description textarea; Save disabled until both fields; outline Cancel; bordered panel and meta line. See L16. |
| T20 | S1-S6 | inline | done | 9a4fdf8 | Gates green; Playwright both themes and mobile over list/filter/search/empty/create/agent/delete; screenshots. See L16. |
| T21 | S3, S5 | inline | done | fff5fb3 | Tables page: no-op StyleAwareWrapper/StyleDivider removed; 16 px page gap; twelve-column grid with five full-width cards. See L18. |
| T22 | S1, S2, S3 | inline | done | fff5fb3 | Table cards: inner double frame removed; wrappers simplified to one overflow-x-auto (mobile clipping fixed); border-ld/hover:bg-lightprimary replaced with cem tokens; shared TableRow border token; semantic Ready/Draft/Retired badges. See L18. |
| T23 | S1, S2, S3 | inline | done | fff5fb3 | DataTable: search copy/aria, songs.csv download/aria, page-size id/options, placeholder contrast, neutral retired status; checkbox table labels. See L18. |
| T24 | S1-S6 | inline | done | fff5fb3 | Gates green; DOM checks at 390 and 1440 in both themes; screenshots blocked by the MCP timeout. See L18. |
| T25 | S3, S5 | inline | done | eeec93e | Form page: no-op StyleAwareWrapper/StyleDivider removed, 16 px page gap, Home points at `/admin`, title Form, `FormPage` name. See L20. |
| T26 | S1, S2, S3 | inline | done | eeec93e | Eight showcase sections became Card surfaces with 16 px gaps; p-px/gap-px/bg-cem-hover seams, bg-cem-base sections and card-title headings gone. See L20. |
| T27 | S1, S2, S3 | inline | done | eeec93e | Template URL replaced with `https://cemurm.app`; `text-info` -> `text-chart-2`; copy button border token; date trigger flattened to one button and shared hover/focus. See L20. |
| T28 | S1-S6 | inline | done | eeec93e | A11y: Select id, unique checkbox/radio ids, five labelled switches, input-group/file aria labels. Gates green; DOM at 390/1440 both themes, no overflow, no console errors. See L20. |

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

L9 — 2026-10-22 — blog audit before the blog write. The demo posts are already
CEMURM editorial content (phase 3), but the surrounding template is not:

- The detail page ignores `post.content` and renders hardcoded template filler:
  "Title of the paragraph", the MTA web-directory paragraphs, "Gigure out…",
  duplicate unordered/ordered lists and "Life is short, Smile while you still
  have teeth!". That is the largest visible template leftover left in the section.
- Both the card and the detail cover use `alt="shadcn-admin"`; every card also
  says "2 min Read" regardless of its text.
- The manage table maps Design / Lifestyle / Gadget / Social / Health, while the
  demo posts are Music / Practice / Live / Theory / Gear. Every category falls
  through to the neutral badge and the filter offers five categories that match
  nothing. The same template taxonomy (Technology, Lifestyle, Travel, Food,
  Business, social; Trending, Tips, News, Guide, Popular) drives the create/edit
  category and tag pickers.
- All five views use the same dead `StyleAwareWrapper`/`StyleDivider` pair as the
  dashboard; the create/edit forms nest three more wrappers and use a 30px gap
  that is not on the spacing scale.
- The featured card builds `lg:col-span-${…}` at runtime, which Tailwind cannot
  emit, so the main post does not claim its 8 columns; it also has no radius or
  ring, and its `text-cem-text` title is dark-on-dark-photo in light mode.
- Smaller defects: the tag dropdown uses the undefined `bg-hover`, the "Add
  selected category" button has no handler, the delete confirm marks "Yes,
  Delete" amber and "Cancel" destructive, and the `published` header is
  lowercase.

Decision: keep the CEMURM demo posts and the local-state model, extend each post
with an explicit `body`/`quote`, render that instead of the filler, compute the
read time, replace the template taxonomy with the demo taxonomy (shared from
`src/demo/content.ts`), and use the same page gap and card surface as the
dashboard. Category badges stay neutral to honor the one-accent rule; status
dots use the semantic success/warning/destructive tokens.

L10 — 2026-10-22 — blog verification and closing of T10–T13.

- Gates after the last source edit: `pnpm typecheck` PASS; `pnpm lint` PASS
  (0 warnings); `pnpm test` PASS (427/427); `pnpm test:gherkin` PASS (44/44);
  `pnpm build` PASS; visual gate PASS (12 rules, 0 failing; the same 05a/05b
  warnings as the dashboard).
- The first featured-card pass used `text-white` / `text-white/90` over the
  photo. Visual rule 01b caught all four (ceiling 0), and `pnpm test` failed with
  it. The fix is a theme-aware `bg-cem-base/70` scrim with `text-cem-text` for
  the title and `text-cem-secondary-elevated` for the metadata: 17.9:1 / 7.5:1
  in light, mirrored in dark, with no raw palette utility. The gate is green.
- Playwright Chromium, 1440x1000 and 390x844, both themes. Light `html.light`
  with body `rgb(248,250,252)` / text `rgb(15,23,42)`; dark `rgb(15,23,42)` /
  `rgb(248,250,252)`; cards `rgb(255,255,255)` on light and `rgb(30,41,59)` on
  dark; radius 12px; 0 page overflow on every route.
- Listing: featured column `span 8 / span 8` and regular `span 4 / span 4` at
  1440, both `span 12 / span 12` at 390; no `shadcn-admin` alt; every read time
  is the computed `1 min read`; page 1721px desktop / 3167px mobile.
- Detail: no `MTA`, `Gigure`, `Smile while` or `Title of the paragraph`; the
  first body paragraph and the quote are present; 1 min read; 1905px desktop /
  2321px mobile; no console errors.
- Manage: no template categories, `Published` header present, the table shows
  Music / Practice / Live / Theory / Gear, and the filter offers exactly those
  five. The delete dialog exposes `Yes, Delete` as destructive and `Cancel` as
  outline. The table keeps its native `overflow-x-auto`; at 390px it scrolls
  without page overflow, and the page is 1034px.
- Create/edit: six cards (breadcrumb plus five form cards), 0 overflow, no
  template taxonomy, demo notice present; 1142px / 1026px desktop, 1950px create
  mobile. The Tiptap editor's visible "Output" raw-HTML block — a template
  developer artifact — was removed, leaving the toolbar and the editable body.
- Screenshots: `/tmp/opencode/blog-listing-{light,dark}.png`,
  `blog-detail-{light,dark}.png`, `blog-manage-{light,dark}.png`,
  `blog-create-{light,dark}.png`, `blog-edit-{light,dark}.png`,
  `blog-listing-mobile-{light,dark}.png`, `blog-detail-mobile-{light,dark}.png`,
  `blog-manage-mobile-light.png`, `blog-create-mobile-light.png`.
- Source work-unit commit: `5d503d7`; this docs commit records it.

L11 — 2026-10-22 — blog closed. The next section in the S7 order is notes: the
notes demo has no CEMURM domain yet, so the section keeps explicit demo content
but must drop the dead wrappers, adapt the remaining template copy, and pass the
same light/dark and mobile checks before its own work-unit commit.

L12 — 2026-10-22 — notes audit before the first write.

- The view still uses the no-op `StyleAwareWrapper`/`StyleDivider`, says the notes
  are "template content", and titles the breadcrumb "Notes app".
- `src/components/apps/notes/index.tsx` carries the template's SWR reset:
  `mutate("/api/notes")`, a `sessionStorage` beforeunload flag, `console.log("page
  refreshed")` and `useLocation`. The endpoint never existed, so all of it is dead.
  The header still says "Edit Note"; the fixed `h-[calc(100vh-300px)]` and the
  mobile sheet stay.
- The note "colors" are template leftovers and one is an actual bug. `demoNotes`
  uses `chart-1`..`chart-4`; the list maps `chart-4`, `chart-2`, `chart-3` but
  falls back for `chart-1`. The two pickers build `bg-${color}` by interpolation,
  which Tailwind cannot see, so the swatches have no guaranteed background. Every
  note title is amber; the selected item is only a 95% scale.
- `notes-list.tsx` keeps a second `activeNoteId` state that duplicates the context
  `selectedNoteId`. The delete button has no `stopPropagation`, so deleting a note
  also selects the id that was just removed and leaves the content panel empty.
  The search-empty state is a destructive red `Alert`.
- `note-content.tsx` is a title textarea plus the color picker; after the picker it
  has a literal `<br />`, a template `id="outlined-multiline-static"` and a bare
  "Select a Note". `add-notes.tsx` has the same color picker, disables Save only on
  an untrimmed non-empty string and renders Close as `destructive`.
- `notes-context` keeps SWR-shaped `loading`/`error` and a `color` argument on
  every mutation, while the implementations are synchronous React state. The type
  is `notesType` with an optional `color`.
- The mobile sheet never closes when a note is selected, and the sidebar list has
  no scroll container, so added notes can be clipped. The notes demo content is
  CEMURM (load-in, setlist, Marta, monitor mix) and stays; the note color feature
  is dropped in favour of neutral cards with an amber selected state, which also
  restores the one-accent rule. No CEMURM notes domain exists, so the demo notice
  stays and the section remains explicit demo content.

L13 — 2026-10-22 — notes verification and closing of T14–T16.

- Gates after the last source edit: `pnpm typecheck` PASS; `pnpm lint` PASS
  (0 warnings); `pnpm test` PASS (427/427); `pnpm test:gherkin` PASS (44/44);
  `pnpm build` PASS; visual gate PASS (12 rules, 0 failing; the same 05a/05b
  and r1/r2 warnings as the dashboard and blog).
- Playwright Chromium, 1440x1000 and 390x844, both themes. Light `html.light`
  with body `rgb(248,250,252)` / text `rgb(15,23,42)`; dark `rgb(15,23,42)` /
  `rgb(248,250,252)`; 0 page overflow on every check; desktop page 1026px,
  mobile 1010px; no console or page errors.
- Notes app: four demo notes; the first is selected on load. The selected card
  has an amber 40% border and amber 5% fill; unselected cards use `cem.surface`
  with a `cem.hover` border; the selected title is amber. `#note-title` matches
  the selected note and has `min-h-[180px]`, so it opens as a writing area
  instead of the 64px `field-sizing-content` default.
- Interactions: clicking the second note updates the textarea and selection.
  Search "monitor" filters to one note and the typed text measures
  `rgb(15,23,42)` in light; "zzz" shows the neutral "No notes match your
  search."; clearing restores four notes. Add Note exposes Cancel as an outline
  button, Save Note as the default button disabled on empty, and the ghost
  Close, with no colour picker. Saving "Soundcheck at 5:30; bring the spare DI."
  gives five notes and selects the new one; deleting it returns four notes and
  reselects the first — the previous bubbling bug would have left the content
  empty. Reopening and cancelling the dialog adds nothing.
- Mobile: the desktop sidebar is hidden; the Menu button opens the 320px sheet;
  selecting the second note closes the sheet and updates the textarea; the add
  dialog fits at 390px with 0 page overflow; the 120px minimum keeps its
  textarea usable.
- Shared input: `animatedinput-placeholder` used `text-cem-base` in light and
  `dark:text-cem-text`, so typed search text rendered in the page colour and was
  invisible on light. It now uses `text-cem-text`. Verified on the notes search
  and on the blog manage search: "setlist" filters to one row and the input text
  measures `rgb(15,23,42)` (`/tmp/opencode/blog-manage-search-light.png`).
- Template leftovers gone: no "template content", "Change Note Color", "Edit
  Note" or "Notes app" copy; no colour picker; no chart/`bg-${}` note colours; no
  dead `sessionStorage`, `mutate` or `console.log`. The unused MSW notes mock
  `src/api/notes/notedata.ts` is deleted and removed from the mock-handler list.
- Screenshots: `/tmp/opencode/notes-{light,dark}.png`,
  `notes-mobile-{light,dark}.png`, `notes-mobile-sheet-light.png`,
  `notes-mobile-selected-light.png`, `notes-add-{light,dark}.png`,
  `notes-mobile-add-light.png`, `notes-search-light.png`,
  `notes-empty-light.png`, `notes-added-light.png`,
  `blog-manage-search-light.png`.
- Source work-unit commit: `3cd3049`; this docs commit records it. Risk: none —
  the shared search input change is a contrast fix checked on both consumers, and
  the section changes no API, stored data or persisted format.

L14 — 2026-10-22 — notes closed. The next section in the S7 order is tickets:
audit its status labels, demo content and filters, then apply the light/dark,
spacing and contrast pass before its own work-unit commit.

L15 — 2026-10-22 — tickets audit before the first write.

- Both views still use the no-op `StyleAwareWrapper`/`StyleDivider`, title the
  page "Tickets App" and say the tickets are "template content".
- `ticket-filter` carries the same dead SWR reset as the notes page:
  `mutate("/api/ticket")`, a `sessionStorage` beforeunload flag and
  `useLocation`. The endpoint never existed. The four summary cards use
  `chart-2`, `chart-4` and `destructive`, are clickable `div`s with no pressed or
  active state, and never show which filter is applied.
- `ticket-listing` hides the whole toolbar (Create Ticket + search) when
  `visibleTickets` is empty, so a search with no matches unmounts the input and
  strands the term; the empty state is a destructive `Alert`. The status badges
  use chart-2/chart-4/destructive, so Closed reads as an error. The delete button
  is `destructive` with a `bg-cem-base` override, which makes its white icon
  invisible in light. The search matches only the title, and
  `getVisibleTickets` throws on an unknown filter.
- The type carries an unused `Label` field (warning/error/success) that no view
  reads; `Status` and the filter are plain strings. The demo agents are
  inconsistent: Ana uses user-2 and user-5, Diego user-3 and user-6, Marta
  user-4 and user-1, while the create form still lists the template names
  Liam/Steve/Jack/John. The dead MSW ticket mock still holds lorem rows and the
  Chance dependency path.
- `create-ticketform`: the description is a single-line `Input`, validation is a
  browser `alert`, Cancel is destructive, the agent dropdown has no label, the
  panel `border` has no colour, and the meta line reads "ID : ..." / "Date : ...".
- Decision: keep the six CEMURM demo tickets and the in-memory model. Make the
  filter cards neutral buttons with the active filter in amber; use semantic
  Open/Pending/Closed badges (success/warning/neutral); keep the toolbar and
  search mounted; delete the dead ticket mock; use the shared CEMURM demo agents
  (Ana Torres, Diego Ruiz, Marta Gil) in the list and the create form; turn the
  description into a textarea; disable Save until both fields are non-empty; and
  make Cancel an outline button.

L16 — 2026-10-22 — tickets work unit and verification.

- Source `9a4fdf8` (T17–T20): views, filter, listing, create form, context,
  type, demo content, and the deleted `src/api/ticket/ticket-data.ts` + handler
  import. The demo keeps six in-memory tickets; the create form adds #7, and
  delete returns to six.
- Gates: `pnpm typecheck` PASS; `pnpm lint` 0 warnings; `pnpm test` 427/427;
  `pnpm test:gherkin` 44/44; `pnpm build` PASS; visual gate 12 rules / 0 failing
  (rule 02 still at its 240/240 ceiling; 05a/05b and report-only r1/r2 unchanged).
- Playwright at 1440×1000, light and dark: six rows; counts 6/2/2/2; Pending
  filter two rows; search "venue" two rows (title and description); "zzz" zero
  rows with the search, Create Ticket and filter cards still mounted; delete
  visible (`rgb(51,65,85)` light, `rgb(203,213,225)` dark); body `rgb(248,250,252)`
  / `rgb(15,23,42)` light and `rgb(15,23,42)` / `rgb(248,250,252)` dark.
- Create flow: Save disabled before both fields, enabled after; agent menu shows
  Ana Torres / Diego Ruiz / Marta Gil; save adds #7 with the picked agent and the
  Open count; delete returns to six; Cancel returns without adding.
- Mobile 390×844, light and dark: no horizontal page overflow; four stacked
  filter cards; create textarea and disabled Save; agent picker, add (7 rows) and
  delete (6 rows); Pending filter and "zzz" empty. No console or page errors.
- Evidence images: `/tmp/opencode/tickets-*.png`. The mobile list screenshots
  are taken at the top of the page; the table rows sit below the fold and are
  animated in by `useInView`, so they render blank in that image while the DOM
  reports all six rows and the mobile add/delete interactions succeed.
- Decision: the shared `BreadcrumbComp` still ignores `items` (create reads
  Home / Create Ticket) and the sidebar active check is still exact-match (the
  Tickets item is not highlighted on the child create route). Both are closed
  shell behavior used by every page; changing them here would alter the shell
  and the other sections, so they stay untouched. Follow-up if the maintainer
  wants child-route highlighting or a multi-level breadcrumb.

L17 — 2026-10-22 — tickets closed. Next section in the S7 order: tables, then
form, profile, icons and auth. Source `9a4fdf8`; this documentation commit
records T17–T20.

L18 — 2026-10-22 — tables work unit and verification.

- Source `fff5fb3` (T21–T24): the page, the five table cards, the
  `useAdminTables` hook and the shared `TableRow`. The page no longer uses the
  no-op `StyleAwareWrapper`/`StyleDivider`; it is a 16 px gap plus a
  twelve-column grid with five full-width cards. The inner double frame
  (`border rounded-md border-ld`) is gone; the four hand-rolled tables now use
  one `overflow-x-auto` wrapper, the same shape as the DataTable.
- T22: `border-ld` and `hover:bg-lightprimary` were undefined in the CEMURM
  palette, so they rendered `currentColor` and no hover. They are replaced
  with `border-cem-hover`/`hover:bg-cem-hover`. The shared `TableRow` now
  carries `border-cem-hover`, so row separators are #e2e8f0 in light and
  #475569 in dark instead of a pure white/black `currentColor` line. The
  BasicTable row keeps its local token; the single-row table has no bottom
  border by the table's last-child rule.
- T23: DataTable search copy is `Search songs...` with an aria-label, the
  download is `songs.csv` with an aria-label, the page-size trigger has the
  `pageSize` id, the size options always include 5 for small libraries, the
  placeholder uses `text-cem-secondary`, and the checkbox-table rows carry
  `Select <song>` labels. Song badges are semantic: Ready success, Draft
  amber, Retired neutral. The old retired `destructive` and Draft `chart-5`
  are gone, and unknown statuses are neutral too.
- Mobile defect found and fixed: the Setlists, Hover, Striped and Checkbox
  tables were 508–557 px wide inside a 340 px card and the wrapper expanded
  instead of scrolling, so the Actions column was clipped. The simplified
  wrapper gives every table a 308 px scroll container and page overflow stays
  0.
- Browser checks (Chrome DevTools MCP, 390 and 1440): 6 cards (breadcrumb plus
  five tables), rows 1/5/9/9/9, DataTable nine songs at five per page. Light:
  body #f8fafc, card #fff, row border #e2e8f0. Dark: body #0f172a, card
  #1e293b, row border #475569. Search `Way` -> 1 row, `zzz` -> `No results
  found.`, clear -> 5 rows, Page 1 of 2, Next -> 4 rows and Page 2 of 2,
  checkbox aria-checked true. No page overflow at 390 or 1873. Sixteen console
  entries and no error or page error; the apple-mobile-web-app-capable
  deprecation warning is pre-existing. Leaving `/admin` clears the html theme
  class and the member app returns to dark.
- Screenshots: the Chrome DevTools MCP `take_screenshot` timed out on this
  page (full-page and viewport), so there are no `tables-*.png` captures. The
  Playwright browser cache was already empty by then. The DOM values above
  are the evidence; re-capture when a browser cache is available.
- Decision: the `Hover Table` / `Striped-Row Table` / `Checkbox Table` card
  titles stay; they name the interaction each card demonstrates and the rows
  are real CEMURM songs, so they are not template data. The page keeps no demo
  notice because it reads real owner-scoped rows.
- Risk: item 3 (the shared `TableRow` border token reaches the tables in the
  other admin sections); the token is the existing `cem-hover`, and the change
  is required by the phase 4 contrast pass.

L19 — 2026-10-22 — tables closed. Next in the S7 order: form, then profile,
icons and auth. Source `fff5fb3`; this documentation commit records T21–T24.

L20 — 2026-10-23 — form work unit and verification.

- Source `eeec93e` (T25–T28): `src/views/pages/form/index.tsx` and
  `src/components/form/index.tsx`. The page dropped the no-op
  `StyleAwareWrapper`/`StyleDivider`, is a 16 px flex column, points the
  breadcrumb Home at `/admin`, and is named `FormPage` instead of the
  copy-pasted `TablesPage`.
- The eight showcase sections became `Card`/`CardHeader`/`CardTitle`/
  `CardContent` surfaces with the page's 16 px gap, matching the tables
  sections. The `p-px`/`gap-px`/`bg-cem-hover` seams, the `bg-cem-base`
  sections and the `card-title` headings are gone. Light card #fff on body
  #f8fafc; dark card #1e293b on body #0f172a; input borders #e2e8f0 and
  #475569.
- Template data removed: the website default and both URL placeholders no
  longer say `tailwind-admin`; the copy demo starts at
  `https://cemurm.app`. The undefined `text-info` (the palette has no
  `--color-info`) is now `text-chart-2`, #075985 in light and #0ea5e9 in
  dark. The copy button uses `border-cem-hover` and a single
  `bg-cem-amber/10`; the date trigger lost `hover:bg-transparent` and
  `focus:border-cem-amber`, so it follows the shared outline button hover and
  focus ring.
- A11y: `SelectTrigger` has the `countries` id its label points to; the
  checkbox and radio groups use distinct `checkbox-*`/`radio-*` ids instead
  of sharing `default`/`disabled`; all five switches have ids and labels,
  including the stray unlabelled switch, now "Toggle me (alternate)"; the four
  icon inputs and the file input have aria-labels. The datepicker no longer
  nests a `Button` inside the `PopoverTrigger` button — the trigger renders
  the `Button` through Base UI's `render` prop, so the DOM has one button.
- Browser checks (Chrome DevTools MCP): 8 form cards plus the shell
  breadcrumb card. Grid 675.5 px + 675.5 px at 1920, 547.5 px + 547.5 px at
  1440, one 340 px column at 390; page overflow 0 at 390. Light card #fff,
  body #f8fafc, input border #e2e8f0, Info #075985; dark card #1e293b, body
  #0f172a, input border #475569, Info #0ea5e9. All labels resolve, no
  duplicate ids, no nested buttons. Date popover opens (37 calendar buttons)
  and closes; Copy changes to Copied and back to Copy after 1.5 s. Console:
  two pre-existing warnings (apple-mobile-web-app-capable, font preload), no
  errors. Leaving `/admin` clears the html theme class and the member app
  returns to dark.
- Risk: none — the change is page-local; no shared component, route or data
  contract changed.

L21 — 2026-10-23 — form closed. Next in the S7 order: profile, then icons and
auth. Source `eeec93e`; this documentation commit records T25–T28.
