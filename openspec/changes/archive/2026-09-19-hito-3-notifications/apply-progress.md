# Apply Progress — Hito 3 — Notifications feed + @mention (chain: PR#0 0008 core + PR#1 0009 activity; PR#2a data layer + PR#2b UI shell; then PR#4, PR#5)

- **Change**: hito-3-notifications
- **Slice (current)**: PR#5 — comments + @mention (tasks 5.1–5.4): two-identity comment walk → SongDetail deep-link target (`?anchor&cid`) → comment/mention rows (reconciled) → mention-scope path checks — **LAST SLICE OF THE CHAIN; all 6 PRs implemented**. Prior: PR#4 event wiring + read-state + offline (4.1–4.7); PR#2a client data layer (2.1–2.2) → PR#2b UI shell (2.3–2.5); PR#0 core (0.1–0.5) and PR#1 activity (1.1–1.5) completed in prior batches. The original monolithic first-pass PR#2 (5 commits `9910754`→`45689eb`, 633 changed lines) was RE-SLICED by owner decision 2026-09-18 (RQ #8 — `size:exception` rejected).
- **Store mode**: hybrid (this file + Engram mirror topic `sdd/hito-3-notifications/apply-progress`)
- **Mode**: Standard (`strict_tdd: false` — no test runner; validation = `node -e` demo() self-checks + `pnpm lint` + `pnpm build`; no invented test commands)
- **Delivery**: auto-chain / feature-branch-chain (owner-confirmed 2026-09-18) — tracker `feat/hito-3-notifications` (from `main` @ `f8c1860`), PR#0 `feat/hito-3-notifications-pr0-migration`, PR#1 `feat/hito-3-notifications-pr1-activity` (base = PR#0 branch), PR#2a `feat/hito-3-notifications-pr2a-data-layer` (base = PR#1 branch), PR#2b `feat/hito-3-notifications-pr2b-ui-shell` (base = PR#2a branch), then PR#4 (base = PR#2b) + PR#5 (base = PR#4) — **PR#3 intentionally does not exist**; each PR targets its parent branch; only the tracker merges to main (orchestrator gates PR creation)
- **Owner decisions (2026-09-18)**: (1) original single-file `0008_notifications.sql` SPLIT into `0008_notifications_core.sql` (PR#0, 249 lines) + `0009_notifications_activity.sql` (PR#1, ~300 lines); (2) **NO `size:exception` for PR#2** — first-pass 633-line slice RE-SLICED into PR#2a (303) + PR#2b (330); (3) chain renumbering: former PR#3 (tasks 3.1–3.7) → **PR#4 (tasks 4.1–4.7)**, former PR#4 (tasks 4.1–4.4) → **PR#5 (tasks 5.1–5.4)**; fixed 400-line budget for every slice
- **Status**: PR#0 **5/5** tasks complete · PR#1 **5/5** tasks complete · PR#2a **2/2** + PR#2b **3/3** tasks complete (re-slice validated 2026-09-18; both diffs ≤ 400; both branches pushed; first-pass branch deleted) · PR#4 **7/7** tasks complete (2026-09-18; diff 294 ≤ 400; branch pushed) · **PR#5 **4/4** tasks complete (2026-09-19; diff 56 ≤ 400; branch pushed) — THE FULL 6-PR CHAIN IS IMPLEMENTED (PR#0 → PR#1 → PR#2a → PR#2b → PR#4 → PR#5; PR#3 intentionally does not exist)

## First pass (honest note — preserved)

The original apply produced a single `0008_notifications.sql` (501 authored lines) and, per the apply rule, recommended `size:exception` for the PR#0 diff (one atomic migration file, no cohesive sub-split). The owner REJECTED that on 2026-09-18 and ordered the migration split into TWO migrations → TWO PRs (0008 core + 0009 activity), each within the fixed 400-line budget. The previous single-file commit history (`48db4ae` → `cefcd2c`, 8 commits, now dangling) was rewritten: PR#0 commits only the core file (4 commits); the activity half lives in PR#1 (4 commits). **No `size:exception` is requested for either PR** — both diffs fit the budget: PR#0 = 249 insertions, PR#1 ≈ 300.

## PR#2 re-slice — owner decision honored (supersedes the first-pass PR#2)

The first PR#2 batch landed 5 commits (`9910754`→`45689eb`) on `feat/hito-3-notifications-pr2-data-layer` (633 changed lines: 632+/1−) and requested `size:exception` per the apply rule (no self re-slice). The owner REJECTED `size:exception` on 2026-09-18 and ordered a bipartite re-slice + a demo subcount fix. This batch executed:

1. **PR#2a** `feat/hito-3-notifications-pr2a-data-layer` (base `aa77884` = pr1 head): cherry-picks of `9910754` (2.1) → `64dcbe5`, `52f82f6` (2.2) → `0f4decf`, plus the mandated fix commit `1251ca0` `fix(notifications): correct demo assertion count (19→24 actual)` — the demo printed a stale literal 19 while executing **24** `assertEq(` invocations (verified `grep -c "assertEq("` = 24: 12 deep-link + 7 normalize + 5 groupByCategory). Diff = **303 changed lines ≤ 400 ✓**.
2. **PR#2b** `feat/hito-3-notifications-pr2b-ui-shell` (base = pr2a tip `1251ca0`, INCLUDES the fix): cherry-picks of `e4bf8b5` (2.3) → `bb2d2ea`, `ca926c7` (2.4) → `45fcfc5`, `45689eb` (2.5) → `b024872`. Diff = **330 changed lines (329+/1−) ≤ 400 ✓**.
3. **Superseded branch deleted**: `git push origin --delete feat/hito-3-notifications-pr2-data-layer` (never had an open PR — safe). Original commits `9910754`/`52f82f6`/`e4bf8b5`/`ca926c7`/`45689eb` live on in local history only; the re-sliced equivalents are the cherry-pick hashes above.
4. **Chain renumbering applied to tasks.md** (owner-approved): former PR#3 (3.1–3.7) → **PR#4 (4.1–4.7)**; former PR#4 (4.1–4.4) → **PR#5 (5.1–5.4)**; **PR#3 intentionally does not exist** (documented gap in tasks.md RQ #8, forecast, work units, chain boundaries, headers, scenario map). Task CONTENT unchanged — only numbers and internal cross-refs.
5. Old commit subjects keep the original "(Hito 3 PR#2, task 2.x)" markers (owner prescribed the cherry-picks; only the fix commit carries a new message) — noted here for reviewers.

## Completed tasks (cumulative)

### PR#0 — 0008 core (5/5)

| Task | Status | Evidence |
|------|--------|----------|
| 0.1 shared definer helpers (`notify_user`, `notifier_actor_name`) — consumed by 0009 | [x] | commit `7062c79` |
| 0.2 bandmate_links triggers ×2 (invite/accept/decline) | [x] | commit `3ea60fa` |
| 0.3 setlist_collaborators INSERT/UPDATE (invite/permission) | [x] | commit `1fdad77` |
| 0.4 setlist_collaborators deferred DELETE (removal, spec-literal title) | [x] | commit `1fdad77` |
| 0.5 `transfer_setlist_ownership` RPC (zero-'removed' invariant) | [x] | commit `0d1a34c` |

### PR#1 — 0009 activity (5/5)

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 `move_setlist_items` RPC (two-phase bump + GUC + grants) + statement-level reorder trigger | [x] | commit `720a6a8` |
| 1.2 setlist_items song-added trigger (key/tempo body) | [x] | commit `75ec8dc` |
| 1.3 shared_comments ONE trigger (comment + @mention, 0006 scope chain) | [x] | commit `386aef5` |
| 1.4 realtime publication + `replica identity full` | [x] | commit `aa77884` |
| 1.5 divided dry-run walk (PR#1 activity + PR#0 core portions) + `pnpm lint`/`pnpm build` | [x] | walk exit 0 (**17 OK PR#1 + 17 OK PR#0**; the earlier "16/18" phrasing was a count error — the walk scripts/logs contain exactly 17+17, see Validation table); `pnpm lint` exit 0 (0 warnings); `pnpm build` exit 0 |

### PR#2a — Client Data Layer (2/2)

| Task | Status | Evidence |
|------|--------|----------|
| 2.1 `src/utils/relativeTime.js` (pure buckets + boundary demo) | [x] | commit `64dcbe5` (cherry-pick of `9910754`) |
| 2.2 `src/lib/notifications.js` (feed/unread/read-state/realtime + pure helpers + demo) | [x] | commits `0f4decf` (cherry-pick of `52f82f6`) + `1251ca0` (demo assert-count fix 19→24) |

### PR#2b — UI Shell (3/3)

| Task | Status | Evidence |
|------|--------|----------|
| 2.3 `src/hooks/useNotifications.js` (read-through + debounced realtime + listeners) | [x] | commit `bb2d2ea` (cherry-pick of `e4bf8b5`) |
| 2.4 `/notifications` route (`src/App.jsx`) + `src/pages/Notifications.jsx` shell (tabs/groups/read-toggle/Mark-all/empty+offline states) | [x] | commit `45fcfc5` (cherry-pick of `ca926c7`) |
| 2.5 `src/components/layout/AppLayout.jsx` Notifications nav link + unread badge (authed only, hidden at 0, capped 99+) | [x] | commit `b024872` (cherry-pick of `45689eb`) |

### PR#4 — Event Wiring + Read-State + Offline (7/7; base = pr2b tip `b024872`; branch `feat/hito-3-notifications-pr4-event-wiring` @ `aa26726`)

| Task | Status | Evidence |
|------|--------|----------|
| 4.1 `moveSongInSetlist` → single `move_setlist_items` RPC call (offline enqueueOp + WRITE_OPS replay unchanged) | [x] | commit `3f19ad2` (+17/−20, setlists.js) |
| 4.2 `transferOwnership` → `transfer_setlist_ownership` RPC (replay-safe early return + `guardTransfer` pre-flight kept; setlistCollab.js untouched) | [x] | commit `197ff95` (+13/−28, setlists.js) |
| 4.3 Two-identity verification walk (no file changes) | [x] | walk `walk_pr4_rpc.sql` exit 0 under `ON_ERROR_STOP` (session-only `/tmp/opencode/`); asserts a0/b0–b2/c0–c2/d0/e0–e2/f0/g0 |
| 4.4 Invitation-row action buttons (Notify.jsx; View/Decline/Accept on invite/accepted/declined rows; decline = read, never delete) | [x] | commit `715bb94` (+76/−4, Notifications.jsx) |
| 4.5 Silent-refetch (loading only while no rows; echo converges without flicker) | [x] | commit `56a3427` (+5/−1, useNotifications.js) |
| 4.6 Off2 delta-summary `{count, byCategory}` + banner + `consumeSummary` persists `lastSeenUnread` (new additive kv key) | [x] | commit `91d5a23` (+83/−11, useNotifications.js + Notifications.jsx) |
| 4.7 SetlistDetail deep-link `?song=<id>` scroll + temporary highlight via `data-song-id` (Activity panel untouched) | [x] | commit `aa26726` (+35/−3, SetlistDetail.jsx) |

### PR#5 — Comments + @mention (4/4; base = pr4 tip `aa26726`; branch `feat/hito-3-notifications-pr5-comments` @ `c20e66a`)

| Task | Status | Evidence |
|------|--------|----------|
| 5.1 Two-identity comment walk (no file changes) | [x] | walk `walk_pr5_comments.sql` exit 0 under `ON_ERROR_STOP` (session-only `/tmp/opencode/`); asserts a0/a1/b0–b4/5.4×3 — 11 blocks OK |
| 5.2 SongDetail deep-link `?anchor=<section>&cid=<comment_id>` → jumpToComment + comments-panel scroll + comment-row highlight (`data-comment-id`) | [x] | commit `11a9518` (+42/−7, SongDetail.jsx) |
| 5.3 Comment/mention row rendering (reconciled — no functional change) | [x] | commit `c20e66a` (+5/−2 header-only, Notifications.jsx); behavior pre-built by 2.2 `notificationTarget` (demo-asserted) + 2.4 generic rows — proven by walk b0/b1 exact titles + 24-assert demo |
| 5.4 Mention-scope path checks (walk): zero out-of-scope rows + no 42501 on open of every emitted mention row + no double rows | [x] | walk `walk_pr5_comments.sql` blocks 5.4/julian, 5.4/outsider, 5.4/sweep — all OK, EXIT 0 |

## Work Unit Evidence (PR#1 batch)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `supabase db reset --yes` (applies 0001–0009 in filename order + seed) → exit 0; then the divided psql walk via `docker exec -i supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1` → exit 0, `N OK` assertions, 0 errors. Client smoke: `pnpm lint` exit 0 (zero warnings), `pnpm build` exit 0. |
| Runtime harness command/scenario and exact result | Local Supabase stack (`supabase_db_cemurm`) role-switched psql transactions (`set local role authenticated; set local request.jwt.claim.sub/role`) against the seeded identities demo …0001 / isolation …0002 / outsider …0003, setlist …001, items …002/…003. Deferred-trigger assertions run in committing transactions (real COMMITs). Reorder discriminator: `move_setlist_items` moving a song to position ≠ 0 on a ≥3-item setlist must yield `payload->>'song_id'` = the passed `p_moved_song_id` (the `min(new.position)` fallback would name a different song and fail the assertion). |
| Rollback boundary | Drop `supabase/migrations/0009_notifications_activity.sql` + `supabase db reset` → 0008 core stays; move RPC + reorder/song-added/comment emissions stop; `notifications` leaves the publication; replica identity reverts. PR#0 core rolls back independently (drop `0008_notifications_core.sql` → 0007 baseline). Client slices revert individually (PR#5→PR#4→PR#2b→PR#2a). |

## Work Unit Evidence (PR#2a + PR#2b batch)

| Evidence | Required value |
|---|---|
| Focused test command and exact result (PR#2a) | `node -e "import('./src/utils/relativeTime.js').then(m=>m.demo())"` → exit 0, `relativeTime demo OK: 9 asserts (0s/1m/59m/1h/2h/3d/older buckets, edges)`; `node -e "import('./src/lib/notifications.js').then(m=>m.demo())"` → exit 0, **`notifications demo OK: 24 asserts (deep-link map, normalization, grouping)`** — count corrected 19→24 (fix commit `1251ca0`; `grep -c "assertEq("` = 24: 12 deep-link + 7 normalize + 5 groupByCategory). Both demos touch zero network/supabase (lazy import; `supabase.js` env gate never opened). |
| Focused test command and exact result (PR#2b) | `pnpm lint` → exit 0 (0 warnings); `pnpm build` → exit 0 (pre-existing >500 kB chunk warning only). UI-only slice — hook/page are UI-bound, no pure demo; combined re-check of both 2a demos on the 2b tip: `9 asserts` + `24 asserts`, both exit 0. |
| Runtime harness command/scenario and exact result | Dev-browser walk of `/notifications` as `demo@cemurm.app` (tabs, empty states, badge 0) is defined in tasks.md unit-2b as the runtime harness but is a MANUAL browser walk that belongs to the PR#4 4.3 two-identity walk (no producers verified until PR#4 — the feed renders against an empty/post-seed table). Not executed in this batch: a browser session with an authed Supabase session is not available to this executor; `pnpm build` exit 0 compiles every route incl. `/notifications`, and the page renders deterministically from `useNotifications` (empty state path). Full runtime proof lands with 4.3's walk. |
| Rollback boundary | PR#2a: revert `64dcbe5..1251ca0` (or reset to `aa77884` = PR#1 head) — touches `src/utils/relativeTime.js` + `src/lib/notifications.js`, no DB dependency. PR#2b: revert `bb2d2ea..b024872` (or reset to `1251ca0` = PR#2a tip) — touches `src/hooks/useNotifications.js`, `src/pages/Notifications.jsx`, `src/App.jsx`, `src/components/layout/AppLayout.jsx`. IDB cache keys (`notifications:<userId>`, `notifications-unread:<userId>`) are disposable new keys. PR#0/PR#1 branches untouched. |

## Work Unit Evidence (PR#4 batch)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node /tmp/opencode/setlists-demo-runner.mjs` (session-only shim — see deviation 18) → exit 0, `setlists demo OK: 765s → 12:45 (scenario 4: 3:30+4:00+5:15=12:45)` (4 pure-function cases, unchanged count); `node -e "import('./src/lib/notifications.js').then(m=>m.demo())"` → exit 0, `notifications demo OK: 24 asserts` (unchanged, re-run on the tip); `pnpm lint` → exit 0 (0 warnings); `pnpm build` → exit 0 (pre-existing >500 kB chunk warning only). |
| Runtime harness command/scenario and exact result | Two-identity psql walk `walk_pr4_rpc.sql` (session-only, `/tmp/opencode/`) after `supabase db reset --yes` (0001–0009 + seed): `docker exec -i supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1` → **exit 0, all asserts OK**: (a0) 8 triggers + both RPCs granted to authenticated only; (b0–b2) invite row / accept / decline with inviter-actor; (c0–c2) share to julian …0004, permission flip → Edit, outsider removal row; (d0) song-add body `Key: C · 120 BPM`; (e0) outsider reorder rejected `No access.`; (e1) **exactly ONE reorder row** naming the moved song …0004 (GUC) + actor self-suppressed; (e2) collab accept emits no permission row; (f0) transfer → owner flip, **zero 'removed' rows**, demo re-added as accepted collab; (g0) removed demo gets zero further rows (row absence), julian still receives. Discriminator: seed rows carry NO `actor_id` (seed runs as postgres) — every assert filters `payload ? 'actor_id'` or by action/song_id. |
| Rollback boundary | Branch base `b024872` (pr2b tip): revert `aa26726..3f19ad2` or reset to base — touches `src/lib/setlists.js` (4.1/4.2), `src/pages/Notifications.jsx` (4.4/4.6), `src/hooks/useNotifications.js` (4.5/4.6), `src/pages/SetlistDetail.jsx` (4.7). No migration, no schema, no DB_VERSION change; the new IDB key `notifications-last-seen:<userId>` is disposable; both RPCs already exist in the merged 0008/0009 — the client swaps are pure JS and revert cleanly. Per-task commits are individually revertible. |

## Validation results (per command)

| Command | Exit | Result |
|---|---|---|
| `supabase db reset --yes` (0001–0009 + seed) | 0 | all 9 migrations + seed applied; no errors |
| Divided psql dry-run walk (PR#1 activity → PR#0 core) | 0 | `walk_pr1_activity.sql`: **17 OK assertions** (a1, b1, song-added, fallback, GUC, no-op, c1, c2, m1, m2, g, h1×2, i1×4) — 0 errors; `walk_pr0_core.sql`: **17 OK assertions** (a0, b0, c0×3, d0×4, h2×3, e0, e2, f0, e3, i2) — 0 errors. Scripts session-only (`/tmp/opencode/`), never in `supabase/migrations/` |
| `pnpm lint` | 0 | 0 warnings (`--max-warnings 0`) |
| `pnpm build` | 0 | Vite build OK (chunk >500 kB warning pre-existente, not an error) |
| Per-PR diff bound: `git diff --stat` PR#0 vs tracker / PR#1 vs PR#0 | — | PR#0 = 249 insertions (`0008_notifications_core.sql`, f8c1860..0d1a34c); PR#1 = 300 insertions (`0009_notifications_activity.sql`, 0d1a34c..HEAD) — both ≤ 400 ✓ |
| `node -e ... relativeTime.demo()` (PR#2a) | 0 | `relativeTime demo OK: 9 asserts (0s/1m/59m/1h/2h/3d/older buckets, edges)` |
| `node -e ... notifications.demo()` (PR#2a) | 0 | `notifications demo OK: 24 asserts (deep-link map, normalization, grouping)` — **fixed from stale literal 19** |
| `pnpm lint` (PR#2a) | 0 | 0 warnings (`--max-warnings 0`) |
| `pnpm build` (PR#2a) | 0 | Vite build OK in 3.18s (chunk >500 kB warning pre-existente, not an error) |
| Slice diff PR#2a vs pr1 base `aa77884` | 303 | **303 changed lines (303 insertions) ≤ 400 ✓** (`relativeTime.js` 51, `notifications.js` 252) |
| `pnpm lint` (PR#2b) | 0 | 0 warnings (`--max-warnings 0`) |
| `pnpm build` (PR#2b) | 0 | Vite build OK in 3.11s (chunk >500 kB warning pre-existente, not an error) |
| Combined demos on PR#2b tip | 0 | `relativeTime demo OK: 9 asserts` + `notifications demo OK: 24 asserts`, both exit 0 |
| Slice diff PR#2b vs pr2a tip `1251ca0` | 330 | **330 changed lines (329 insertions, 1 deletion) ≤ 400 ✓** (`useNotifications.js` 144, `Notifications.jsx` 161, `App.jsx` 2, `AppLayout.jsx` 23/−1) |
| Sum PR#2a + PR#2b | 633 | 303 + 330 = 633 — **exactly the first-pass slice, nothing lost** |
| `supabase db reset --yes` (PR#4 baseline) | 0 | 0001–0009 + seed re-applied on branch `feat/hito-3-notifications-pr4-event-wiring`; stacks restarted |
| Two-identity walk 4.3 (`walk_pr4_rpc.sql` via docker exec psql, `ON_ERROR_STOP=1`) | 0 | exit 0; asserts a0, b0–b2, c0–c2, d0, e0–e2, f0, g0 all OK — reorder EXACTLY 1 row naming …0004; transfer 0 'removed'; removed user 0 further rows (see Work Unit Evidence PR#4) |
| `node -e ... notifications.demo()` (PR#4 tip) | 0 | `notifications demo OK: 24 asserts (deep-link map, normalization, grouping)` (unchanged) |
| `node /tmp/opencode/setlists-demo-runner.mjs` (PR#4 tip; setlists.js NOT bare-node — see deviation 18) | 0 | `setlists demo OK: 765s → 12:45 (scenario 4: 3:30+4:00+5:15=12:45)` — 4 pure-function cases via the env-shim loader |
| `pnpm lint` (PR#4 tip) | 0 | 0 warnings (`--max-warnings 0`) |
| `pnpm build` (PR#4 tip) | 0 | Vite build OK in 3.55s (chunk >500 kB warning pre-existente, not an error) |
| Slice diff PR#4 vs pr2b base `b024872` | 294 | **294 changed lines (228 insertions, 66 deletions) ≤ 400 ✓** (`useNotifications.js` 78, `setlists.js` 78, `Notifications.jsx` 100, `SetlistDetail.jsx` 38) |

## PR#2 slice size — first-pass overage report (SUPERSEDED by the owner-ordered re-slice — preserved as history)

First pass: the monolithic PR#2 diff vs `aa77884` was **633 changed lines (632+, 1−)**, exceeding the fixed 400-line budget; per the apply rule the executor did NOT re-slice on its own (reported, recommended `size:exception`). The owner REJECTED `size:exception` on 2026-09-18 and ordered the bipartite re-slice (RQ #8). The re-slice is complete: PR#2a = 303 changed lines (relativeTime 51 + notifications 252, incl. the 1-line demo-count fix), PR#2b = 330 changed lines (useNotifications 144, Notifications.jsx 161, App.jsx 2, AppLayout 23/−1). Every file remains a cohesive work unit with its demo/verification in the same commit; nothing was deleted, compressed, or restyled to fit the budget. **No `size:exception` is requested or granted for any PR in the chain.**

## Deviations from design (and notes)

1. **Migration split (owner decision)**: see "First pass" note + Resolved Design Question #7 in tasks.md. Both halves derive from the original single file — 0009's SQL bodies are byte-identical to original sections 4/5/7/8 (verified with `diff`), only the header/section titles were adapted to the split.
2. **RPC grants**: `revoke all … from public, anon` + `grant execute … to authenticated, service_role` for BOTH RPCs (0002 lines 33–39 precedent; the tasks.md parenthetical "(+ service_role per 0002 precedent)" resolves it). Dry-run (b)/(h) prove authenticated-only client access; anon/public revoked.
3. **Actor injection**: `notify_user` injects `payload.actor_id` only when `auth.uid()` is non-NULL (a SQL-NULL `jsonb_set` `new_value` is version-dependent; the absent key reads `IS NULL`).
4. **Key/tempo body**: emitted only when BOTH `base_key` and `base_tempo` resolve in `song_versions` (prefer `version_id`, else latest by `created_at desc`; literal `Key: {base_key} · {base_tempo} BPM`). Seed has no `song_versions` rows → seed-driven song-added rows carry NULL body (silent omission, source write unaffected).
5. **Seed-induced emission rows (expected)**: seed runs as postgres → bandmate invite + collaborator shared + song-added rows with actor 'Someone'. The walk uses targeted (user, action) count-deltas, not global counts.
6. **Reorder no-op over-emission**: an RPC call with an unchanged ordering still emits exactly ONE reorder row (the final pass sees every row change vs the bumped values) — this is the documented over-emission; the client-side no-op guard lands with task 4.1 (RPC swap). Walk documents it, asserts the count, and removes the probe row.
7. **Commit history rewrite**: PR#0's original 8 commits (`48db4ae` → `cefcd2c`) were replaced by 4 core-only commits; the old objects are dangling in the object store (no branch or PR referenced them). PR#1 adds 4 activity commits on top. A 5th PR#0 commit `1f83ede` (docs: correct 0008 core header) was added to the origin PR#0 branch during review — outside both apply batches; PR#2a/PR#2b do not contain it (base `aa77884`).
8. **No committed walk script**: task 1.5 forbids `.sql` files under `supabase/migrations/` (db reset executes every `.sql` there); the walk runs from session-only scripts (`/tmp/opencode/walk_pr1_activity.sql` + `/tmp/opencode/walk_pr0_core.sql`, never committed). Note: `@julian.guitar` / `@marco.tempo` do not exist in seed — the walk creates them session-locally (auth.users + profiles username) to prove the in-scope/out-of-scope mention chain deterministically.
9. **Open question (a) — mention charset**: `src/lib/auth.js` never writes usernames → the design's `@[A-Za-z0-9._-]+` regex holds as-is (matches the `profiles_username_key` partial unique index, 0006 line 37). No alignment change needed.
10. **Open question (b) — realtime non-PK filter**: not verifiable at the migration level (no client). Remains open for the PR#4 4.3 walk; the focus-refetch fallback is designed in 2.3/4.6.
11. **PR#2 re-slice (owner decision) — supersedes the first-pass size:exception deviation**: see the dedicated "PR#2 re-slice" section. The first-pass branch `feat/hito-3-notifications-pr2-data-layer` was deleted from origin; `9910754`→`45689eb` exists in local history only.
12. **Demo assert-count fix (mandated)**: `notifications.demo()` printed a stale literal "19 asserts" while executing 24 `assertEq(` invocations; corrected to 24 in commit `1251ca0` (verified `grep -c` = 24: 12 deep-link + 7 normalize + 5 groupByCategory). The relativeTime demo (9 asserts) was already exact.
13. **Cherry-picked subjects unchanged**: PR#2a/PR#2b commits keep their original "(Hito 3 PR#2, task 2.x)" subjects (owner prescribed the cherry-picks; only `1251ca0` carries a new message) — the PR/branch context supplies the re-slice attribution.
14. **`subscribeNotifications` is async (returns a Promise<unsubscribe>)**: the lazy supabase import (bandmates precedent, required so demo() never touches supabase) means the channel can only be created after `await supabase()`; `useNotifications` awaits it and stores the unsubscribe (cancelled-flag guards the unmount-before-resolution race). The "returns unsubscribe" contract holds — the consumer gets the unsubscribe fn asynchronously.
15. **Read-state optimism lives in the hook (2.3), page/badge wiring stays lean**: `markRead`/`markAllRead` in the hook apply optimistic local state and refresh-on-failure; per design, deep cross-instance convergence via the realtime echo and the page-level wiring refinements land in 4.5. The hook's optimistic update IS echoed back by postgres_changes (same-user UPDATE), so the badge converges even now.
16. **`summary`/`consumeSummary` are contract stubs (always null)**: the 2.3 return shape includes them per tasks.md; Off2 delta synthesis + `lastSeenUnread` persistence land in 4.6. Page does not render a summary banner yet (4.6).
17. **Amended commit note (superseded)**: the first-pass `ca926c7` (was `066bcf3`) fixed a `react/prop-types` error with the repo precedent; that fix is baked into the cherry-picked PR#2b commit `45fcfc5` — lint-clean.
18. **setlists demo is NOT bare-node (design.md line 408 assumption inaccurate)**: `src/lib/setlists.js` has a static `import { supabase } from './supabase.js'` (line 8, Hito 1) which reads Vite-only `import.meta.env` — bare `node -e ... demo()` throws `Cannot use import statement outside a module`/`import.meta` errors. The PR#4 verification ran the 4 pure-function cases through a session-only shim pair in `/tmp/opencode/` (`setlists-demo-runner.mjs` + `env-shim-loader.mjs`, never committed) that registers a loader solving the Vite env gate; the demo output is byte-identical to the bare-node form. The real bare-node demos remain notifications (24) + relativeTime (9).
19. **`move_setlist_items` typed-array literal casts in the walk**: inside PL/pgSQL DO blocks / `select` the `array['…']` of string literals resolves to `text[]`, which does not coerce to `uuid[]` → `function move_setlist_items(unknown, text[], unknown) does not exist`. The walk casts each id `::uuid` (and the array element literals) explicitly — client code (`supabase.rpc`) is unaffected; this is a session-script-only detail.
20. **Walk needs an extra identity + acceptance (two-identity → 3-identity baseline)**: to prove "removed user → zero further rows" with a surviving non-owner recipient, the walk creates julian …0004 (session-local, julian@cemurm.app) as a second collaborator and has julian ACCEPT after the reorder proof (so the reorder recipient set stays exactly {isolation} — unambiguous "exactly one row" assert) and before the transfer/removal steps (so the removed-user and post-removal song-add both have a live non-owner recipient). All walk-created rows are session-local to the reset DB; nothing is committed.
21. **Stale comment refs fixed in-slice**: `Notifications.jsx` header referenced "PR#3 task 3.4 / PR#4 task 4.3" for the action buttons (now "PR#4 task 4.4 / PR#5 task 5.3"); `useNotifications.js` referenced "3.6" for the Off2 summary (now 4.6). These were renumbering leftovers from RQ #8, not code drift.
22. **`offlineGet` returns the `{data, savedAt}` wrapper, not the raw value**: the 4.6 `lastSeenUnread` baseline reads `lastSeen?.data ?? null` (offlineCache.js line 74 stores `put({ data, savedAt }, key)`); writes go through the same `offlineSet` wrapper. data-layer keys (`notifications:*`) stay private to notifications.js — the hook's new `notifications-last-seen:<userId>` key is additive and distinct.

## Work-unit commits

### PR#0 — `feat/hito-3-notifications-pr0-migration` (4 commits, 249 insertions)

| Hash | Subject | Tasks |
|------|--------|-------|
| `7062c79` | feat(migration): 0008 core shared notification helpers + grants (Hito 3 PR#0, task 0.1) | 0.1 |
| `3ea60fa` | feat(migration): 0008 core bandmate_links invite/accept/decline triggers (Hito 3 PR#0, task 0.2) | 0.2 |
| `1fdad77` | feat(migration): 0008 core setlist_collaborators invite/permission + deferred removal triggers (Hito 3 PR#0, tasks 0.3-0.4) | 0.3, 0.4 |
| `0d1a34c` | feat(migration): 0008 core transfer_setlist_ownership RPC — zero-'removed' invariant (Hito 3 PR#0, task 0.5) | 0.5 |

### PR#1 — `feat/hito-3-notifications-pr1-activity` (4 commits, ~300 insertions)

| Hash | Subject | Tasks |
|------|--------|-------|
| `720a6a8` | feat(migration): 0009 activity move_setlist_items RPC + statement-level reorder trigger (Hito 3 PR#1, task 1.1) | 1.1 |
| `75ec8dc` | feat(migration): 0009 activity song-added trigger — key/tempo body (Hito 3 PR#1, task 1.2) | 1.2 |
| `386aef5` | feat(migration): 0009 activity shared_comments comment + @mention trigger, ONE function (Hito 3 PR#1, task 1.3) | 1.3 |
| `aa77884` | feat(migration): 0009 activity realtime publication + replica identity full (Hito 3 PR#1, task 1.4) | 1.4 |

### PR#2a — `feat/hito-3-notifications-pr2a-data-layer` (3 commits, 303 changed lines — re-slice of the first-pass PR#2 half)

| Hash | Subject | Tasks |
|------|--------|-------|
| `64dcbe5` | feat(utils): relativeTime pure helper with boundary demo (Hito 3 PR#2, task 2.1 — notifications Feed1) [cherry-pick of `9910754`] | 2.1 |
| `0f4decf` | feat(notifications): data layer — feed/unread/read-state/realtime + pure helpers + demo (Hito 3 PR#2, task 2.2 — Feed1-7, realtime delivery) [cherry-pick of `52f82f6`] | 2.2 |
| `1251ca0` | fix(notifications): correct demo assertion count (19→24 actual) (Hito 3 PR#2a, task 2.2) | 2.2 (fix) |

### PR#2b — `feat/hito-3-notifications-pr2b-ui-shell` (3 commits, 330 changed lines — re-slice of the first-pass PR#2 half; base includes the 2a fix)

| Hash | Subject | Tasks |
|------|--------|-------|
| `bb2d2ea` | feat(notifications): useNotifications hook — read-through + debounced realtime (150ms) + online/sync-done/focus listeners (Hito 3 PR#2, task 2.3 — realtime, Off1/Off2 surface) [cherry-pick of `e4bf8b5`] | 2.3 |
| `45fcfc5` | feat(notifications): /notifications route + feed page shell — tabs, groups, read toggle, Mark-all, empty/offline states (Hito 3 PR#2, task 2.4 — Feed3-5) [cherry-pick of `ca926c7`] | 2.4 |
| `b024872` | feat(notifications): AppLayout Notifications nav link + unread badge (authed only, hidden at 0, capped 99+) (Hito 3 PR#2, task 2.5 — Feed7) [cherry-pick of `45689eb`] | 2.5 |

### PR#4 — `feat/hito-3-notifications-pr4-event-wiring` (6 commits, 294 changed lines — event wiring + read-state + offline; base = pr2b tip `b024872`; walk 4.3 is session-only, no commit)

| Hash | Subject | Tasks |
|------|--------|-------|
| `3f19ad2` | refactor(setlists): moveSongInSetlist via move_setlist_items RPC (single-statement reorder, one notification row) (Hito 3 PR#4, task 4.1 — S15) | 4.1 |
| `197ff95` | refactor(setlists): transferOwnership via transfer_setlist_ownership RPC (single transaction, zero 'removed' rows) (Hito 3 PR#4, task 4.2 — shared-setlist transfer scenario) | 4.2 |
| `715bb94` | feat(notifications): invitation-row View/Decline/Accept buttons (dismissal = read, never delete) (Hito 3 PR#4, task 4.4 — I1/I2/I3 invitation-row action contract) | 4.4 |
| `56a3427` | feat(notifications): silent-refetch — loading only when no rows yet (no flicker on echo convergence) (Hito 3 PR#4, task 4.5 — Feed2/Feed3 cross-instance read-state convergence) | 4.5 |
| `91d5a23` | feat(notifications): Off2 delta-summary banner — synthesize {count, byCategory} on reconcile refetches, consume persists lastSeenUnread (Hito 3 PR#4, task 4.6 — Off1/Off2 offline recipient side) | 4.6 |
| `aa26726` | feat(setlists): deep-link target — ?song=<id> scrolls to + temporarily highlights the item row (Hito 3 PR#4, task 4.7 — Feed6 song-added/reorder deep links, S15) | 4.7 |

## PR#5 — Comments + @mention (tasks 5.1–5.4) — LAST SLICE OF THE CHAIN

**Slice**: comment/mention emission walk (5.1) + comment deep-link target in SongDetail (5.2) + comment/mention row rendering (5.3, reconciled) + mention-scope path checks (5.4). Branch `feat/hito-3-notifications-pr5-comments` created from PR#4 branch @ `aa26726`; diff vs `aa26726` = **56 changed lines (47 insertions, 9 deletions) ≤ 400 ✓** (SongDetail.jsx 49, Notifications.jsx 7). No migrations, no read-only refs touched (comments.js, ChordProRenderer.jsx, auth.js, bandmates.js, setlistCollab.js, offline*.js all untouched).

### Work-unit commits

| Hash | Commit | Task |
|------|--------|------|
| `11a9518` | feat(songs): comment deep-link target — ?anchor=<section>&cid=<comment_id> jumps to the section, opens the comments panel and highlights the comment row (Hito 3 PR#5, task 5.2 — S11/S12 deep links, Feed6) | 5.2 |
| `c20e66a` | docs(notifications): comment/mention row contract reconciled — generic row renders 0009-baked titles, notificationTarget (2.2) routes the tap to the 5.2 deep link (Hito 3 PR#5, task 5.3 — S11/S12) | 5.3 |

Walk tasks 5.1/5.4 produce no repo artifacts (session-only `/tmp/opencode/walk_pr5_comments.sql`, never committed — same convention as walk 4.3).

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node -e "import('./src/lib/comments.js').then(m=>m.demo())"` → `comments demo OK: 12 asserts (version isolation, thread tree, anchors)` exit 0; `node -e "import('./src/lib/notifications.js').then(m=>m.demo())"` → `notifications demo OK: 24 asserts (deep-link map, normalization, grouping)` exit 0 (notificationTarget comment/mention rows asserted: lines 206–213 → `/songs/:id?anchor=<section>&cid=<comment_id>`) |
| Runtime harness command/scenario and exact result | Two-identity psql walk `walk_pr5_comments.sql` via `supabase db reset --yes` + `docker exec -i supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/opencode/walk_pr5_comments.sql` → **EXIT 0, 11 blocks OK** (a0 baseline surface, a1 julian setup, b0 comment emission, b1 in-scope mention, b2 self-mention suppressed, b3 out-of-scope zero rows, b4 dedup across two membership paths, 5.4/julian openability, 5.4/outsider invisibility, 5.4/sweep no duplicate rows, final PASSED notice); `pnpm lint` exit 0 (0 warnings); `pnpm build` exit 0 (pre-existing >500 kB chunk warning only) |
| Rollback boundary | Branch reverts at `aa26726` (PR#4 head). Reverting `11a9518` + `c20e66a` removes the whole PR#5 slice with zero touch to PR#0–PR#4 files; walks 5.1/5.4 are session-only DB state (gone on `supabase db reset` — next batch's fresh baseline). No migration reverted, no read-only file touched |

### Deviations from design (incremental over the 22 prior)

23. **5.2**: the deep-link effect waits for BOTH the parsed chart and the comment thread (commentTree) so `jumpToComment` finds the section anchor el and the `data-comment-id` row el; `jumpToComment` was converted from a function declaration to `useCallback` (same body) purely so the effect can list it in deps without an exhaustive-deps lint warning. Highlight applies to both root and reply rows (resolved roots also carry `data-comment-id` for targetability).
24. **5.3 RECONCILED (no functional code change — documented like the comments.js reconciliation, design.md line 127)**: the task's two behaviors were already pre-built — the 0009 trigger bakes the exact `"{Actor} commented on {Song}"` / `"@{username} mentioned you in {Song}"` titles with body NULL (witnessed: walk b0 title `Isolation User commented on Way Maker`, b1 title `@julian.guitar mentioned you in Oceans (Where Feet May Fail)`), and `notificationTarget` (2.2 data layer, demo-asserted) maps `comment`/`mention` → `/songs/:song_id` with `{anchor: section, cid: comment_id}`; the generic row path (2.4) renders those rows and `handleRowTap` (2.4) already marks read + navigates. Only the Notifications.jsx header comment was updated to record the contract (7 lines). Functional proof: walk b0/b1 exact-title asserts + the 24-assert demo + build. No invented View buttons (frozen 4.4 contract keeps action buttons on the three invitation actions only).
25. **Mention-regex open question (design.md line 435) resolved by evidence**: `src/lib/auth.js` contains ZERO username references — only `EMAIL_RE` + user_metadata (firstName/lastName/displayName); usernames come from `supabase/seed.sql` updates (`demo`, `isolation`, `outsider`) and walk-created profiles (`julian.guitar`). The trigger regex `@[A-Za-z0-9._-]+` (0009 line 221) matches the profiles.username charset exactly; there is no signup validation to differ from. auth.js untouched.

### Walk evidence (5.1 + 5.4, one session-only script, EXIT 0)

- **a0**: `shared_comments_insert_notify` trigger + `notify_comment_activity()` + authenticated SELECT/INSERT grants present; fresh-reset discriminator: zero `comment_id`-payload rows, seed-time rows carry no `actor_id`.
- **a1**: julian …0004 created (`julian@cemurm.app`, username `julian.guitar`, display_name `Julian Guitar`) + accepted collaborator on Demo Setlist.
- **b0 — comment emission** (isolation posts on Way Maker): EXACTLY 2 comment rows → demo + julian (owner + all accepted collabs of any setlist containing the song, minus author); demo row: action `comment`, title `Isolation User commented on Way Maker`, payload `{song_id …,0001, setlist_id …,0001, section 'Chorus', comment_id, actor_id …0002}`, read_at NULL; author isolation gets ZERO.
- **b1 — in-scope mention** (demo posts on Oceans with `@julian.guitar`): julian EXACTLY 1 row, action `mention`, title `@julian.guitar mentioned you in Oceans (Where Feet May Fail)`, payload exact (Bridge / Oceans / sl1 / comment_id); julian gets ZERO `comment`-action rows for that comment (mention supersedes — no double rows); isolation 1 comment row (in-scope, non-mentioned); author demo ZERO.
- **b2 — self-mention**: isolation posts `@isolation` → ZERO mention rows; 2 comment rows (demo + julian).
- **b3 — out-of-scope**: demo posts `@outsider and @marco.tempo` → ZERO mention rows (`@outsider` = known username but PENDING collaborator → 0006 scope EXISTS fails; `@marco.tempo` = unknown → null candidate → continue); 2 comment rows (isolation + julian).
- **b4 — dedup across membership paths**: second setlist (Tour Setlist, owner isolation) + Oceans item + julian accepted collab added; isolation posts on Oceans → EXACTLY 2 comment rows — julian ONE row despite membership via sl1 + sl2, demo one (owner sl1), author isolation zero.
- **5.4 — openability (RLS active, ON_ERROR_STOP proves no 42501)**: as julian → selects his own mention row via `notifications_select_self` (1 row) and opens the mentioned Oceans comment + the Way Maker comment via the 0006 scoped select (1 row each) — the tap→SongDetail path returns rows; as outsider (pending only) → the out-of-scope comment returns ZERO rows (invisible, not an error); global sweep: zero `(comment_id, user_id)` groups with count > 1 across the whole walk.

### Section notes

- 4.6's `offlineGet` wrapper (`{data, savedAt}`) unaffected — no offline surface touched in this slice.
- `useNotifications` demo suite unchanged (24 asserts) — comment/mention deep-link targets were already in the 2.2 data layer.

## Branch topology

```
main f8c1860 (= origin/main)
 └─ feat/hito-3-notifications            (tracker; f8c1860, 0 commits)
     └─ feat/hito-3-notifications-pr0-migration   (PR#0 slice; 4 commits + 1 review docs commit 1f83ede; 249 insertions)
         └─ feat/hito-3-notifications-pr1-activity (PR#1 slice; 4 commits, ~300 insertions)
             └─ feat/hito-3-notifications-pr2a-data-layer (PR#2a slice; 3 commits incl. demo fix, 303 changed lines, PUSHED @ 1251ca0)
                 └─ feat/hito-3-notifications-pr2b-ui-shell (PR#2b slice; 3 commits, 330 changed lines, PUSHED @ b024872)
                     └─ feat/hito-3-notifications-pr4-event-wiring (PR#4 slice; 6 commits, 294 changed lines, PUSHED @ aa26726; walk 4.3 session-only)
                         └─ feat/hito-3-notifications-pr5-comments (PR#5 slice — FINAL; 2 commits, 56 changed lines, PUSHED @ c20e66a; walks 5.1/5.4 session-only)
```

Full chain implemented (owner-approved renumbering; **PR#3 intentionally does not exist** — documented gap, tasks.md RQ #8). PRs open on origin: **#117 (pr0), #118 (pr1), #119 (pr2a), #120 (pr2b), #121 (pr4)**; **PR#5 pending orchestrator** (base = PR#4 branch `aa26726`). The superseded first-pass branch `feat/hito-3-notifications-pr2-data-layer` was **deleted from origin** (never had an open PR). `openspec/changes/hito-3-notifications/` remains untracked (decision files untouched except this apply-progress + task checkboxes) — not committed per the launch contract.

## Remaining

- PR#2a + PR#2b DONE: both diffs ≤ 400 (303 / 330), demos exit 0 (9 + **24** asserts), `pnpm lint` 0 warnings, `pnpm build` exit 0, both branches pushed, first-pass branch deleted.
- **PR#4 DONE**: diff 294 ≤ 400 (228+/66−), setlists demo 4 cases + notifications demo 24 asserts + two-identity walk 4.3 all exit 0, `pnpm lint` 0 warnings, `pnpm build` exit 0, branch pushed @ `aa26726`. PR #121 open.
- **PR#5 (this batch) DONE — LAST SLICE**: diff 56 ≤ 400 (47+/9−), comments demo 12 asserts + notifications demo 24 asserts + two-identity comment walk 5.1/5.4 (11 blocks) all exit 0, `pnpm lint` 0 warnings, `pnpm build` exit 0, branch pushed @ `c20e66a`. **All 6 PRs of the chain implemented; all 22 IN scenarios covered. Orchestrator next: open PR#5 (base = pr4 branch `aa26726`), then verify + archive** (PR creation and archive are orchestrator-gated per the launch contract).

## Local stack state

Walk PR#5 left the local DB mid-scenario (julian …0004, Tour Setlist …0005 owned by isolation, comment/mention rows, ±noise — all session-local to the reset baseline; verified by the same walk's a0/b-5.4 asserts on a fresh `supabase db reset --yes`). Repo tree clean except the untracked `openspec/changes/hito-3-notifications/` (never committed). Branch `feat/hito-3-notifications-pr5-comments` @ `c20e66a` pushed; no PR opened (orchestrator gate — same as PR#4). Verification and archive remain for the orchestrator.