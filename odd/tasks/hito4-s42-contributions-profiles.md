# Hito 4 — S4.2 Contributions & Profiles (ODD task document)

## Objective

Open the WRITE path of the public library: publish your own songs as
community contributions (with license confirmation and lineage), edit and
withdraw your own contributions, browse contributor public profiles, and
follow musicians with a discovery feed. Requirements source:
`features/public-library-community.feature` scenarios 5–12.

## Problem

- S4.1 opened the public library READ path only (catalog + copy RPC). The
  schema already carries the contribution model (`public_songs.lineage`,
  `license_confirmed`, `status`, and the standalone `follows` table) but
  there is zero write surface, no profile or follow UI.
- Users cannot share charts back to the community, and contributors are
  anonymous links without a profile or follow relationship.

## Why

- Completes the Hito 4 milestone "Basic Community": contribution →
  attribution → relationship loop.
- The schema was designed for this (0001 lines 438–456); the slice activates
  existing columns instead of inventing new tables.

## Scope

IN (features/public-library-community.feature):
- Scenario 5 — Contribute a song to the public library (owner publishes own
  song, license + attribution recorded).
- Scenario 6 — License confirmation required before publishing (RPC hard gate
  + UI confirmation).
- Scenario 7 — Contribution keeps lineage to the source arrangement
  (`public_songs.lineage`, optional source entry).
- Scenario 8 — Edit my own public contribution (no new RPC: the live
  `public_library_entries` view reflects edits to the song; change history is
  preserved by `song_versions`).
- Scenario 9 — Withdraw my own contribution (status → `withdrawn`; copies in
  other repertoires remain theirs because they are independent songs).
- Scenario 10 — View a contributor's public profile (published songs only).
- Scenario 11 — Follow another musician + discovery feed.
- Scenario 12 — Follow/unfollow reversible.

OUT (decided 2026-09-19, user):
- Scenario 16 — Linked-copy updates (propagation upstream → linked copies):
  **deferred to S4.3 / next milestone** (user decision; `linked_copies`
  column remains untouched).
- Scenario 13–15 — Reputation, reporting, rate-limiting: S4.3 (moderation).
- Curated collections on profiles: `collections` feature is NOT built
  (schema-only since 0001); profile shows published entries only (honest
  exclusion; revisit when collections ships).
- Notification categories stay frozen (`setlist` only, Hito 3); the discovery
  feed is a query over `public_songs` + `follows`, not a new trigger.
- No changes to existing table grants/RLS beyond S4.2's own migrations.

## Authorized scope

- User approved starting S4.2 with exploration + proposal (2026-09-19).
- User closed scope: defer linked-copies (scenario 16); 5-PR chained chain.
- Delivery strategy cached from S4.1: chained PRs, `feature-branch-chain`
  (tracker branch accumulates; each child PR targets the previous child
  branch; only the tracker merges to main). Tracker:
  `feat/hito4-s42-contributions`.

## Constraints

- Fixed ~400 authored lines per PR; no size:exception (chain instead).
- Security posture (repo contract): SECURITY DEFINER cores in `private`,
  search_path pinned `''`, fully qualified refs, thin `public` wrappers,
  default-revoke + authenticated-only grants (0010/0011 pattern).
- `songs` ownership = `created_by = auth.uid()` (0002 lines 152–170).
- `public_songs` license vocabulary (0001 line 442):
  `'public-domain' | 'CC-BY-4.0' | 'proprietary'`.
- Edits need no new RPC (live view); write surface is RPC-only, matching the
  0001 "community WRITE" design.
- Verification: `pnpm lint` (0 warnings), `pnpm build`, local
  `supabase db reset` (0001→latest + seed), hosted API smoke only AFTER merge.

## TDD resolution

- **Mode: off** (no test framework in repo — AGENTS.md contract).
- Functional gates instead: `pnpm lint`, `pnpm build`, `supabase db reset`,
  post-merge hosted `supabase db query --linked` API checks.

## Tasks

Checklist — each item is a work-unit with its own PR in the chain.

- [ ] T1 (S4.2.1) **Contribution backend** — migration 0012:
      `private.publish_song_to_library` + `public.publish_song_to_library`
      wrapper + `private.withdraw_public_song` + `public.withdraw_public_song`
      wrapper. Gates: license_confirmed=true (raise otherwise), license in
      allowed set, owner-only song (`songs.created_by = auth.uid()`), one
      live entry per song, optional live-source lineage, withdraw owner-only
      (status `live` → `withdrawn`, `updated_at` bumped).
      ACCEPT: db reset clean; gates verified via `supabase db query --linked`
      after merge; lint/build untouched (SQL-only).
- [x] T2 (S4.2.2) **Contribution UI** — "Contribute" action on SongDetail
      (own songs only), license confirmation modal (deliberate checkbox),
      "My contributions" surface + withdraw with confirm. Uses the
      read-through cache pattern from `src/lib/publicLibrary.js`
      (`invalidateSongs` on publish).
- [x] T3 (S4.2.3) **Public profile** — route `/profile/:userId`, page listing
      the contributor's live `public_songs` entries, attribution links from
      `PublicSongCard` → profile. Collections excluded (honest scope note).
- [x] T4 (S4.2.4) **Follows** — migration 0013: RLS policies on `follows`
      (+ follow/unfollow entry points), follow buttons on profile page,
      follower/following counts.
- [x] T5 (S4.2.5) **Discovery feed** — "Following" tab on `/library`:
      `public_songs` where `contributor_id` in my follows, `updated_at desc`.

DEFERRED (recorded, not tasks of this chain):
- T6 linked-copy updates (scenario 16) — user decision 2026-09-19 → S4.3/next.
- Collections on profile — when the collections feature ships.

## Delivery & chain plan

- Forecast: T1 ~250–320, T2 ~350–400, T3 ~250–320, T4 ~280–350, T5 ~150–220.
  **Total ~1,300–1,600 authored lines** → 5 chained PRs, each ≤400.
- Chain (feature-branch-chain, cached):
  `feat/hito4-s42-contrib-backend` → `feat/hito4-s42-contrib-ui` →
  `feat/hito4-s42-contrib-profile` → `feat/hito4-s42-contrib-follows` →
  `feat/hito4-s42-contrib-feed` (each into the previous), then tracker
  PR `feat/hito4-s42-contributions` → main.
- Running authored line count (additions + deletions, generated excluded):
  verified at each PR against origin/main; record slice boundaries below.

### PRs (created 2026-09-19)

| PR | Branch | Title | Base |
|----|--------|-------|------|
| #131 | feat/hito4-s42-contrib-backend | S4.2.1 Contribution backend (publish/withdraw RPCs) | main |
| #132 | feat/hito4-s42-contrib-ui | S4.2.2 Contribution UI (publish/withdraw + my contributions) | #131 branch |
| #133 | feat/hito4-s42-contrib-profile | S4.2.3 Public contributor profile (/profile/:userId) | #132 branch |
| #134 | feat/hito4-s42-contrib-follows | S4.2.4 Follows (RLS + follow/unfollow RPCs + profile UI) | #133 branch |
| #135 | feat/hito4-s42-contrib-feed | S4.2.5 Discovery feed (Following tab on library) | #134 branch |
| #136 | feat/hito4-s42-contributions | S4.2 Tracker → main | main |

Merge order: #131 → #132 → #133 → #134 → #135 → #136.

## Progress

- 2026-09-19: exploration complete (schema map, RLS, activity infra,
  ownership columns); proposal accepted; scope closed (linked-copies
  deferred); doc created; branches created.
- 2026-09-19: **T1 S4.2.1 done** — migration 0012 (publish/withdraw cores +
  wrappers) written and verified. Commits listed below.
- 2026-09-19: **T2 S4.2.2 done** — contribution UI complete: Contribute
  action on SongDetail (own songs only via `song.userId === user?.id`),
  license confirmation modal (deliberate rights checkbox, 0001 license
  vocabulary only), withdraw with confirm + inline error, published badge,
  and a "My contributions" tab on /library with per-entry withdraw.
  Publish/withdraw RPCs wired through the read-through cache pattern with
  `offlineRemove('publicLibrary:entries')` invalidation.
- 2026-09-19: **T3 S4.2.3 done** — public profile complete: new
  `src/pages/Profile.jsx` (route `/profile/:userId`, under RequireAuth)
  lists the contributor's live `public_songs` entries by filtering
  `usePublicLibrary().entries` on `contributor_id`, with empty state and
  honest note that curated collections are not built yet; PublicSongCard
  attribution links now resolve to `/profile/:userId` instead of dead-end
  (no profile existed before). No backend change needed (read path reuses
  the 0010 view + cache).
- 2026-09-19: **T4 S4.2.4 done** — follows complete: migration 0013
  (RLS participant-only select on `follows`, first table grant SELECT-only;
  follow/unfollow/get_profile_follow_counts entry points, SECURITY DEFINER
  cores + thin public wrappers, 0012 pattern, self-follow + anonymous
  guards, idempotent INSERT ON CONFLICT / DELETE), `src/lib/follows.js`
  (read-through cache, offline-first invalidation),
  `src/hooks/useFollows.js` (isFollowing, counts, follow/unfollow,
  canFollow), Profile.jsx follow button + counts (own profile: no button).
  RLS participant-only means no public follower lists — intentional; counts
  are aggregates only (no row exposure for arbitrary users).
  Verification: lint 0 warnings, build success, db reset 0001→0013 + seed
  clean, local RPC introspection confirms 3+3 functions with
  `prosecdef`, authenticated-only execute. Native assess post-commit
  `--base-ref 45239b8` → risk **medium** (`executable_change` on
  useFollows.js), review_due=slice_budget_reached; preflight STATUS stopped
  at `managed_assets_outdated` and `gentle-ai sync` FAILED (telemetry
  runtime ownership conflict in ~/.config/opencode; custom files preserved)
  — slice review BLOCKED on the same global-config/plugins issue.
- 2026-09-19: **T5 S4.2.5 done** — discovery feed complete: no new
  migration needed (client-side composition of two existing read surfaces:
  participant-only follows RLS select via `getFollowState` + open
  `public_library_entries` view filtered `.in('contributor_id', ...)`
  ordered `updated_at desc`); `src/lib/follows.js` gained additive
  `getDiscoveryFeed()` + feed cache-drop in `invalidateFollowCaches`;
  new `src/hooks/useDiscoveryFeed.js`; "Following" tab on `/library`
  reusing PublicSongCard + empty state, catalog/mine tabs untouched.
  IGNORED round-trip when follow graph empty. Verification: lint 0
  warnings, build success (150 modules), db reset 0001→0013 + seed clean.
  Native assess post-commit `--base-ref c3c7c65` → risk **medium**
  (`executable_change` on useDiscoveryFeed.js), 195 changed lines →
  review_due **false** (`under_budget`), deferred to accumulated slice.

## Verification evidence

- `supabase db reset` (0001→0012 + seed): clean, exit 0
  (branch feat/hito4-s42-contrib-backend).
- `pnpm lint`: 0 warnings, exit 0.
- Local RPC introspection (`supabase db query` — local, hosted untouched):
  all 4 functions present — private + public
  `publish_song_to_library(uuid, text, boolean, uuid)` and
  `withdraw_public_song(uuid)` — SECURITY DEFINER, `search_path=""`.
- Behavior gates (license_confirmed raise, owner-only, one-live-per-song,
  lineage validation, withdraw owner-only) to be verified via hosted API
  (`supabase db query --linked` with the demo JWT) AFTER merge, per the
  established S4.1 pattern.
- T2 (branch feat/hito4-s42-contrib-ui): `pnpm lint` 0 warnings (spot-check
  + writer run, both exit 0); `pnpm build` success (146 modules, exit 0;
  only pre-existing chunk-size + dynamic-import warnings); native assess
  post-commit `--base-ref 08a1aa6` → risk **medium**
  (`executable_change` on usePublicLibrary.js), deferred to PR slice per
  ODD medium rule.
- T3 (branch feat/hito4-s42-contrib-profile): `pnpm lint` 0 warnings
  (writer + spot-check, exit 0); `pnpm build` success (exit 0); working
  tree clean after commit; native assess post-commit `--base-ref 2baab6f`
  → risk **passive** (new page + attribution Link + App route only, no
  executable lib change), structural readback by orchestrator, boundary
  advances to `45239b8` for the next slice.
- T4 (branch feat/hito4-s42-contrib-follows): `pnpm lint` 0 warnings
  (writer + parent spot-check, exit 0); `pnpm build` success (149 modules,
  exit 0); `supabase db reset` 0001→0013 + seed clean, exit 0; local RPC
  introspection confirms 3 public + 3 private functions (`follow_user`,
  `unfollow_user`, `get_profile_follow_counts`) with `prosecdef`, execute
  granted to authenticated only, anon revoked; `follows` RLS enabled with
  participant-only SELECT policy, authenticated has SELECT only (no
  INSERT/UPDATE/DELETE — RPC-only writes). Native assess post-commit
  `--base-ref 45239b8` → risk **medium** (`executable_change` on
  useFollows.js), `review_due` = slice_budget_reached (424 changed lines);
  preflight STATUS stopped `managed_assets_outdated`; `gentle-ai sync`
  failed (telemetry runtime ownership conflict in ~/.config/opencode,
  custom files preserved) — T4 slice native review BLOCKED until the
  global-config issue is resolved, per system decision.
- T5 (branch feat/hito4-s42-contrib-feed): `pnpm lint` 0 warnings (writer
  + parent spot-check, exit 0); `pnpm build` success (150 modules, exit 0;
  parent spot-check re-run exit 0); `supabase db reset` 0001→0013 + seed
  clean, exit 0. No migration in this slice (client-side composition of
  follows RLS read + public_library_entries view). Native assess
  post-commit `--base-ref c3c7c65` → risk **medium** (`executable_change`
  on useDiscoveryFeed.js), 195 changed lines, `review_due` **false**
  (`under_budget`) → deferred; T4 slice still carries the earlier
  review_due=true budget hold, blocked on the sync/plugins issue.

## Next step

- S4.2 chain PRs #131–#136 created and pushed (2026-09-19). Merge order:
  #131 → #132 → #133 → #134 → #135 → #136 (tracker).
- `gentle-ai sync` still fails (telemetry runtime ownership conflict in
  ~/.config/opencode). Native review lifecycle blocked until resolved.
  PRs are open for manual review in the meantime.
- After merge: verify hosted API behavior gates (license_confirmed raise,
  owner-only, one-live-per-song, lineage, withdraw) via
  `supabase db query --linked` per the S4.1 pattern.

## Commits (S4.2.4)

- `feat: S4.2 follows (RLS + follow/unfollow RPCs + profile follow UI)` —
  migration 0013 + src/lib/follows.js + src/hooks/useFollows.js +
  Profile.jsx follow UI (c3c7c65 on feat/hito4-s42-contrib-follows).
- `docs(odd): record T4 verification evidence + commit identity` (b68b2bd).

## Commits (S4.2.5)

- `feat: S4.2 discovery feed (Following tab on library)` —
  getDiscoveryFeed in follows.js + useDiscoveryFeed.js + PublicLibrary
  Following tab (40d5067 on feat/hito4-s42-contrib-feed).

## Commits (S4.2.1)

- `docs: odd tasks hito4-s42 contributions & profiles` — task document.
- `feat: S4.2 contribution RPCs (publish/withdraw)` — migration 0012.
- `docs: evidence hito4-s42.1 db reset + lint + RPC introspection` — this
  verification evidence.

## Commits (S4.2.2)

- `feat: S4.2 contribution UI (publish/withdraw + my contributions)` —
  SongDetail contribute modal + withdraw, /library My contributions tab,
  publicLibrary.js publish/withdraw + usePublicLibrary.js actions
  (2baab6f on feat/hito4-s42-contrib-ui).
- `docs(odd): record T2 verification evidence + commit identity`
  (2a55bbf on feat/hito4-s42-contrib-ui).

## Commits (S4.2.3)

- `feat: public contributor profile page (/profile/:userId)` — Profile.jsx
  (80 new lines), PublicSongCard attribution → profile Link, App route
  (45239b8 on feat/hito4-s42-contrib-profile).