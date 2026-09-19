# ODD — Hito 4 · S4.1 Public Library: Browse & Copy to Repertoire

- **Feature file**: `features/public-library-community.feature` (browse + add-to-repertoire scenarios only)
- **Scope out**: contribution writes, profiles/follows, reputation, reporting → S4.2/S4.3; URL importer → Hito 5
- **Branch**: `feat/hito4-s41-public-library` (created from `main`)
- **Delivery strategy**: `ask-on-risk` (default) — forecast under 400 authored lines; single PR per slice expected
- **TDD**: off — no test runner in repo (AGENTS.md). Ordinary functional checks apply: `pnpm lint` (zero warnings), `pnpm build`, local Supabase smoke.
- **Verification of record**: each task closes with at least one work-unit commit on the feature branch + evidence recorded below.

## Objective

Let an authenticated musician browse the public library catalog (community-contributed + public-domain songs), search it by title/genre, filter by license status, and add a song to their own repertoire as an editable standalone copy — with the original public entry and its contributor untouched.

## Problem / Why

Hito 4 (Basic Community) starts here: no community surface exists yet. This slice delivers the catalog read path + the copy-semantics that the whole contribution module (S4.2) and moderation (S4.3) build on. All schema tables exist (48-table contract); the work is RLS exposure, seed data, and the app surface.

## Authorized scope (constraints)

- Read-only catalog for `authenticated` (not anon). Live entries only (`status = 'live'`).
- **No exposure of chart content to non-owners.** The copy operation must NOT be done client-side by granting chart_files/song_versions reads; use a SECURITY DEFINER RPC that runs the copy server-side as the caller.
- Copy is **standalone**: do not populate `public_songs.linked_copies[]` (linked-copy subscription is S4.2).
- Catalog entry shape: title, artist, genre, contributor (display_name from `profiles`), license.
- Contributor attribution comes from `profiles.display_name` (0006), not from raw auth metadata.
- Follow existing conventions: migrations numbered `0010_…`, deterministic UUID seed pattern, read-through IndexedDB cache pattern from `src/lib/songs.js`, hooks per `useSongs.js`, `PascalCase.jsx` pages/components, Tailwind only.
- No URL importer, no contribution writes, no moderation, no follows in this slice.

## Acceptance criteria

1. **Browse**: opening `/library` lists live public entries, each showing title, artist, genre, and contributor. (scenario "Browse the public library catalog")
2. **Add to repertoire**: adding a public song creates a copy in my library where I can edit it; the public entry and contributor remain unchanged. (scenario "Add a public song to my repertoire")
3. **Search**: searching by title or genre returns matching entries with contributor attribution. (scenario "Search the public library")
4. **License filter**: filtering by "public domain" shows only public-domain entries and hides licensed ones. (scenario "Filter the public library by license status")
5. Data layer read-through cached; cache invalidated after a copy from the songs side.

## Tasks

### T1 — Backend: migration `supabase/migrations/0010_public_library.sql`
- Enable exposure for the catalog:
  - `public_songs` SELECT policy for `authenticated` where `status = 'live'`.
  - `songs` SELECT policy for `authenticated` when the song is referenced by a live `public_songs` row (metadata: title/artist/genre exposure only — follow the owner-OR-public pattern so private songs stay owner-only).
  - Ensure `profiles` column-limited search policy (0006) already lets the catalog read `display_name`; add nothing if true.
- Catalog convenience: either a `public_library_entries` view (live-only join of public_songs + songs + profiles) with `grant select to authenticated`, or a direct PostgREST embed chain — choose the one that keeps exposure minimal and the client query simple. Views must not widen grants beyond the SELECT above.
- SECURITY DEFINER RPC `copy_public_song_to_repertoire(p_public_song_id uuid) RETURNS uuid`:
  - Reads the source songs/chart_files/song_versions rows as definer (single live public entry only; error `'Song not found.'` if absent/missing/not live).
  - Inserts the copy owned by `auth.uid()` in `songs` + `chart_files` + `song_versions` (number 1, name 'Original', base_key/base_tempo/duration copied, is_ready recomputed from content via the readiness contract — mirror `addSong` semantics in `src/lib/songs.js`).
  - Does NOT touch `linked_copies`; original untouched; returns the new song id.
  - Function in a safe schema (follow 0002's private-schema default-revoke convention) with `grant execute to authenticated`, `security definer`, `search_path` pinned, `set search_path` to pinned schema.

### T2 — Seed: extend `supabase/seed.sql`
- 3–5 public-domain ChordPro entries (e.g. Amazing Grace, a folk tune, a public-domain hymn) with deterministic UUIDs following the existing `10000000-…` suffix-family pattern; contributor = demo user `…0001`; `license = 'public-domain'`, `license_confirmed = true`, `status = 'live'`.
- Each entry needs its source `songs` row (title, artist, genre) + `chart_files` (ChordPro body) + `song_versions` (base_key, duration etc.) in the same deterministic pattern as existing seed rows.

### T3 — Data layer: `src/lib/publicLibrary.js`
- `listPublicEntries({ search, license })` — read-through cached (`publicLibrary:entries`), mirrors `songs.js` error mapping (`USER_ERRORS` incl. `'Song not found.'`) and `withReadThrough` pattern; search/filter client-side via `filterSongs`-style helpers (bounded catalog; mirror the ponytail in Songs.jsx).
- `copyPublicSongToRepertoire(userId, publicSongId)` — calls the RPC; maps errors; invalidates `songs:{userId}` + `song:{userId}:{id}` caches so My Songs refreshes.

### T4 — Hook: `src/hooks/usePublicLibrary.js`
- State: `entries`, `loading`, `search`, `licenseFilter`; action `addToRepertoire(publicSongId)` with pending set per row and error surface; mirrors `useSongs` shape.

### T5 — UI: route + page + card + nav
- `src/pages/PublicLibrary.jsx` at `/library` (+ route in `src/App.jsx` under `RequireAuth`), nav entry in `src/components/layout/AppLayout.jsx`.
- `PublicSongCard` (or reuse `SongCard` if it fits): title, artist, genre, contributor, license badge, "Add to repertoire" button with pending/success/error states; search input + license filter control.

### T6 — Verification pass
- `pnpm lint` (zero warnings), `pnpm build`.
- Local Supabase smoke: `supabase db reset` → seed applied; browse `/library`; search by title and genre; filter public-domain; add a song; confirm it appears in My Songs, opens editable, original entry + contributor unchanged; repeat smoke as second user (isolation `…0002`) to confirm contributor attribution and non-owner exposure.

## Non-goals (explicit)

- Contribution publish/edit/withdraw → S4.2. Follows/profiles view/reputation → S4.2. Reporting/moderation → S4.3. URL importer → Hito 5 (`external-integrations`). Offline catalog caching beyond read-through is out of scope.

---

## Progress

- [x] T1 — migration 0010 (RLS + view/RPC)
- [x] T2 — seed public-domain entries
- [x] T3 — `publicLibrary.js` data layer
- [x] T4 — `usePublicLibrary.js` hook
- [x] T5 — `/library` page + card + nav
- [x] T6 — verification (lint, build, local Supabase RPC smoke; browser click-through pending desktop)

## Verification evidence

| Task | Outcome | Check | Commit |
|------|---------|-------|--------|
| T1 | success | `supabase db reset` — migration 0010 applied clean (0001→0010) | 06f7fc2 |
| T2 | success | `supabase db reset` — seed.sql loaded (4 public-domain + 1 CC-BY-4.0, no UUID collisions) | d503f5f |
| T3 | success | `node search.js demo` OK, `pnpm lint` 0 warnings, `pnpm build` passed | 61c78a1 |
| T4 | success | `pnpm lint` 0 warnings, `pnpm build` passed | e1a687d |
| T5 | success | `pnpm lint` 0 warnings, `pnpm build` passed | b84de79 |
| T6 | success | RPC smoke (db layer, ~runtime-equivalent to the client call): catalog as authenticated = 5 live entries; copy via wrapper → new song owned by caller, chart copied, version 'Original' #1, key/tempo/duration carried, is_ready t; original untouched (1 chart/1 version, no linkage); bogus id → `Song not found.`; anon denied; attribution as user …0002 = 'Demo User'. **HTTP smoke (GoTrue + PostgREST, the app's exact network path):** login demo OK; catalog 5 entries with contributor_name; Amazing Grace count demo 2→3 after copy via `POST /rest/v1/rpc/copy_public_song_to_repertoire` (new id 4a36c479…); bogus id → HTTP 400 `Song not found.`; isolation user sees `by Demo User`. `pnpm lint` 0 warnings, `pnpm build` OK. Visual click-through in a browser remains unattached (desktop browser not connected to this session) | 050f1a0 (fix) |

- Engram mirror: **pending** — Engram MCP unavailable in this session (server restarted mid-work); resync `mem_save` to topic `odd/hito4-s41-public-library/tasks` when available.

## Next step

T1 + T2 (backend batch) → T3+T4 (data+state) → T5 (UI) → T6 (verification). Then slice close: review PR on `feat/hito4-s41-public-library`.

## Delivery — feature-branch-chain (2026-09-19, user decisions)

- Actual PR diff vs origin/main measured **976 changed lines** (953+/23-) → over the 400 budget (previous "<400" estimate was wrong, corrected in-session).
- User chose **split into chained PRs** (declined single-PR size:exception), then **feature-branch-chain**.
- One honest corrective pass: first split left slice 1 (migrations+seed) at 510 → refined to **5 children**, all ≤400. S0 (seed catalog) must precede S1 (idempotency): `4eca999`'s diff references the catalog rows (conflict when cherry-picked standalone onto origin/main — proved in-session).
- Chain (base = main → tracker #125; each child targets its immediate parent):

| # | PR | Branch | Diff | Content |
|---|----|--------|------|---------|
| T | #125 (draft) | `feat/hito4-s41-public-library` | 976 | tracker — do not merge until chain complete |
| 1 | #126 | `…-00-seed-catalog` | 205 | catalog corpus (d503f5f) |
| 2 | #127 | `…-01-seed-idempotent` | 78 | idempotency (4eca999) |
| 3 | #128 | `…-02-backend` | 237 | migrations 0010+0011 (06f7fc2, 050f1a0) |
| 4 | #129 | `…-03-data` | 190 | data layer + hook (61c78a1, e1a687d) |
| 5 | #130 | `…-04-ui-docs` | 276 | UI + this doc (b84de79 + docs commits) |

- **Merge order**: #126 → #127 → #128 → #129 → #130 (each into its parent branch), then #125 → main. CI on each branch: `pnpm install --frozen-lockfile` + `pnpm lint` + `pnpm build` (all pass locally).
- Issue: #50 `[Hito 4] Public Library & Community` labeled `status:approved`; PRs reference it ("Part of") without `Closes` since #50 spans S4.2/S4.3 too.

## Slice findings (smoke)

- **Fix-forward 0011**: 0010's `private.copy_public_song_to_repertoire` was unreachable from `supabase.rpc` (PostgREST exposes only `public`; config.toml). Thin public SECURITY DEFINER wrapper + authenticated-only grant (`050f1a0`). Verified end-to-end: copy creates an editable `songs`+`chart_files`+`song_versions` triplet owned by the caller, original public entry untouched, no `linked_copies`.
- **Seed count correction**: the seed corpus is **5 entries (4 public-domain + 1 CC-BY-4.0)**, not 6. Families 2000/7100/7200/7300-…004–008.
- **Browser click-through** (dev server UI) is the only remaining smoke gap: the desktop browser is not connected in this runtime; the HTTP smoke covers the same login/catalog/RPC/RLS path the client uses.
- **`.env.local` points at the HOSTED project** (`https://kspnacfcietqikbufcka.supabase.co`), not the local stack.

## Seed idempotency (debt paid, 2026-09-19)

The user-flagged debt ("el seed no es idempotente") is resolved. Every one of the **25 inserts** in `supabase/seed.sql` now ends with `on conflict do nothing` (no target: catches any unique violation — id PK, email, composite keys), header documents the property. Verified:

1. `supabase db reset` — fresh DB: migrations 0001→0011 + seed applied clean.
2. **Re-seed against the SAME DB** (`docker exec -i … psql -f seed.sql`) — 0 errors, the true idempotency proof.
3. Counts stable after double-seed: users 3, profiles 3, orgs 2, songs 8, charts 5, versions 5, public_songs 5, setlists 1, setlist_collabs 2, performance_items 2 — no duplicates.
4. Catalog view intact: 5 entries, `Demo User` attribution.

Note: on a re-seed the random values (`now()`, `crypt` salts) of already-existing rows are NOT refreshed (conflicting rows are skipped) — acceptable for a deterministic dev seed. Updates to `profiles` (username/display_name) are naturally idempotent and still run.
Commit: `4eca999`.

## Hosted deployment (2026-09-19, user-authorized option A)

- **Migrations**: hosted had only **0001–0003** recorded. Applied the full pending chain **0004→0011** via `supabase db query --linked` (Management API + token; the direct DB host is IPv6-only and unroutable from this machine — `db query --linked` is the working remote path). All 8 applied clean; history recorded in `supabase_migrations.schema_migrations` (version = numeric prefix, name = slug, statements round-tripped from local DB) so future `supabase db push` sees everything applied. `migration repair --linked` does NOT use the API (still direct IPv6 connection) — manual history insert was required.
- **Deploying 0004–0009** additionally shipped Hito 2 remainder + Hito 3 (gigs RLS, preferences, band collab, comments, notifications) to hosted as dependencies of 0010 — the repo's intended schema state.
- **Seed**: `seed.sql` is dev-only (its header says never via db push) and NOT idempotent (0 `on conflict`). Seeded only the catalog portion, adapted: contributor/owner = the **real hosted demo user** `36ae8481-4e1c-4d20-ac3d-d618efe4ebd1` (NOT the local seed UUID `10000000-…-0001`); created `profiles` row (display_name 'Demo User', username 'demo') since hosted profiles was empty and the user had no display-name metadata; 5 songs + 5 charts + 5 versions + 5 `public_songs` (4 public-domain + 1 CC-BY-4.0). Verified via hosted REST API (app-exact path): login demo OK → catalog 5 entries with `by Demo User` → RPC copy returns new id → bogus id HTTP 400.
- **Hosted demo account facts**: `demo@cemurm.app` already existed (id `36ae8481…`); `isolation@cemurm.app` does NOT exist on hosted — second-user attribution was proven on local; hosted has one user. A copy of Scarborough Fair was created during verification (demo owns it now; ignorable or deletable in UI).
- **To see the slice**: open `http://localhost:5173` (dev server alive) → login `demo@cemurm.app` / `password1234` → Library. Visual click-through remains the only gap (desktop browser transport not attached to this session).