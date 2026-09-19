# Verify Report: hito-3-band-collaboration

- **Verifier**: sdd-verify (read-only; no repo mutations, no commit/push/branch)
- **Date**: 2026-09-18
- **Base**: `main` @ `f8c1860` (clean worktree; only untracked `openspec/changes/hito-3-band-collaboration/`)
- **Mode**: Standard (`strict_tdd: false`; no test framework in repo)
- **Verificat**: VERDICT **PASS-WITH-WARNINGS**

## Command Evidence (exact observed output)

| # | Command | Result |
|---|---|---|
| 1 | `pnpm lint` (`eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0`) | **exit 0**, zero warnings |
| 2 | `pnpm build` (vite v5.4.21) | **exit 0**, `✓ built in 1.78s`. Only the pre-existing >500 kB chunk warning + the informational dual static/dynamic supabase.js import note (matches annotations/gigs precedent). No new warnings |
| 3a | `node -e "import('./src/lib/comments.js').then(m=>m.demo&&m.demo())"` | `comments demo OK: 12 asserts (version isolation, thread tree, anchors)` **exit 0** |
| 3b | `node -e "import('./src/lib/setlistCollab.js').then(m=>m.demo&&m.demo())"` | `setlistCollab demo OK: 26 asserts (visibility, share targets, transfer guard, feed labels, advisory locks, reconcile)` **exit 0** |
| 3c | `node -e "import('./src/lib/bandmates.js').then(m=>m.demo&&m.demo())"` | `bandmates demo OK: 8 asserts (guards, direction mapping, offline optimism)` **exit 0** |
| 3d | `node -e "import('./src/lib/annotations.js').then(m=>m.demo&&m.demo())"` | `annotations demo OK: 11 asserts (anchors, substitution map, transpose movement, offline)` **exit 0** |
| 3e | `setlists.js` / `offlineSync.js` bare-node `demo()` | **NOT EXECUTABLE** — known limitation, not a defect: static `songs.js → supabase.js` chain evaluates `import.meta.env` at module scope (disclosed in apply-progress Batches 2–4). Pure collab/reconcile logic lives in zero-dep `setlistCollab.js` (executed above) |
| 4 | Transactional dry-run `begin; <0006>; <0007>; rollback;` via `docker exec -i supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1` (container `supabase_db_cemurm` Up, healthy; PostgreSQL 17.6) | **exit 0**. Every statement OK (CREATE TABLE/INDEX/FUNCTION/TRIGGER ×6, POLICIES ×9+2, GRANTS, 3× ALTER PUBLICATION). In-tx assertions: **8 collab policies**, **4 triggers**, publication = exactly `setlist_collaborators,setlist_items,setlists` (all RLS-enabled, no non-RLS table), `shared_comments` UPDATE column grants = exactly `body,deleted,resolved,updated_at`. ROLLBACK applied. Post-rollback: `profiles` table absent, **0** collab policies (of 62 pre-existing Hito 1/2 policies), 0 named triggers, 0 publication tables, 0 comment grants → **zero persistent state** |
| 5 | `git log --oneline -13` (+ extended) | Chain landed: `c81e551` (#101 0006) → `5c33b03` (#102 bandmates libs) → `5881a03` (#103 bandmates UI) → `dcfd941`/`e667b29`/`8d55424` (#104/#105/#106 PR#2a ×3) → `1e559d8` (#107 realtime+lock) → `a6401b4`/`47bba8f`/`d99a9f2` (#108→#109 revert→**#110 re-land** of offline reconcile) → `c30a748` (#111 collab offline queue) → `9829fa6`/`0255784`/`b55013b` (#112/#113/#114 comments) → `f8c1860` (#115 0007). 15 commits, all conventional (revert itself conventional). Migration + seed files present |

Behavioral two-user RLS walk / two-browser realtime/lock/comment walks: **NOT EXECUTED** — they require deploying 0006+0007 onto the persistent local stack (`supabase db reset`/`db push`, persistent mutation) plus seeded-identity browser sessions. The brief marks the behavioral walk not-required; the migration's executable evidence is the transactional dry-run (above), which is green. Not executed ≠ failure on any scenario below; those scenarios are rated by code evidence with the runtime gap stated.

## Per-Requirement Verification (32 IN + RLS delta)

Legend: **VB-C** = verified by code/demo/migration evidence · **VB-R** = verified by runtime walk · **NV** = not verified (gap listed).

### collaboration-bandmates (9 IN)

| Scenario | Status | Evidence / Note |
|---|---|---|
| Search + add by username | VB-C | `profiles.searchProfiles` (ILIKE, col-limited `id,username,display_name,avatar_url`, excludes self, limit 10) + Bandmates.jsx Add flow. 2-account walk NOT EXECUTED |
| Search finds no user | VB-C | Verbatim "No user found with that username." (Bandmates.jsx) |
| Add by unique user ID | VB-C | `resolveById` maybeSingle + Add-by-ID UI section |
| Accept pending invitation | VB-C | `acceptInvite` (UPDATE own incoming pending row) + 0006 `setlist_collaborators_update_self` policy in dry-run |
| Remove cancels pending invite | VB-C | `removeBandmate` pair-scope DELETE (kills the row); accept of a dead row → "This invitation is no longer valid."; `respondInvite` drops revoked on drain replay |
| Decline pending invite | VB-C (partial) | `declineInvite` → status `declined`, declined row surfaces to the inviter in the list. The spec's "I receive a notification that Lucia declined" is NOT implemented as a notification — no notification system exists; disclosed in apply-progress Batch 2 (deferred-to-change-2 class). NOT in the proposal's named-deferral table — see Finding 4 |
| Cannot add yourself | VB-C (demo) | `guardInvite` no-self + search excludes own row; "You cannot add yourself." verbatim |
| Cannot add existing active bandmate | VB-C (demo) | `guardInvite` → "Already in band." + disabled Add button |
| Offline invite while active / pending path | VB-C | `inviteBandmate`/`respondInvite` enqueueOp + optimistic `pendingSync`; drain replay idempotent (revoked invite swallows) |

### shared-setlist-collaboration (12 IN)

| Scenario | Status | Evidence / Note |
|---|---|---|
| Create shared + invite; view-not-edit pre-accept | VB-C (partial) | `setVisibility` + `shareWithBandmates` (shareTargets dedupe/exclude owner) + pending rows. **Spec wording "view but NOT edit until accept" is not reachable**: 0002 `setlists_select_member` requires `accepted_at IS NOT NULL`, so pre-accept = no view at all; accept is a *view*-unlock. Disclosed in apply-progress Batch 3 Issues Found; the delta spec text was NOT updated → archive spec-sync must reconcile (Finding 3) |
| Realtime live edit <2s | VB-C | `subscribeSetlistRealtime` (postgres_changes on the 3 published tables, `setlist_id=eq` filters) + `useSharedSetlist` 150 ms debounce + `refreshSilent`. Runtime <2s walk NOT EXECUTED. RLS caps delivery (publication = RLS tables only, dry-run) |
| Conflict toast keep/accept | VB-C | Conflict = postgres_changes item event while I hold that song's lock; toast "Keep my changes" / "Accept server version" verbatim (SetlistDetail.jsx:269–277); `acceptServerVersion` releases lock + refetch. Walk NOT EXECUTED |
| Lock song during edit | VB-C | Persistent `setlist-lock:<id>` channel, send-queue until SUBSCRIBED, 30 s TTL + 15 s heartbeat, non-holder unlock ignored, no steal of active foreign lock (demo 7 asserts); "`<song>` is being edited by `<actor>`" + disabled move/remove/select. Walk NOT EXECUTED |
| Collaborative reorder + "X reordered" | VB-C | `handleMove` → `broadcastActivity('reorder')` + local prepend; `describeActivity` label (demo). Feed is live-broadcast-only (D5/D6 ceiling, disclosed) |
| Offline edit pending sync + offline indicator | **PARTIAL — NV clause** | Local "pending sync" flag exists in the data layer (`buildOptimisticCollab`, cache-persisted). **No UI badge renders it for setlists** (Bandmates.jsx and SongDetail render their pendingSync badges; Setlists.jsx / SetlistDetail.jsx do not). **"Bandmates see an offline indicator" is not implemented** — no server/feed signal exists for a local pending edit. NOT disclosed in the artifacts (Finding 1) |
| Non-conflicting offline merge | **PARTIAL — NV clause** | Merge decision `reconcileSetlistOp` verified by 8 demo asserts (replay vs drop+notice vs silent no-op). **Spec clause "both changes appear in the activity feed" not implemented**: drained ops never broadcast activity events (feed records only share/reorder/transfer broadcasts + local emits; no drain-time emit). NOT disclosed (Finding 2) |
| Offline add vs online delete | VB-C (with deviation) | Drop + notice verified (demo + `buildNotice`). Notice text names the **song** ("`"<song>" was removed from the setlist before your sync.`"), not the actor ("removed by Julian" per spec) — actor unknowable from `postgres_changes` (D5). Disclosed in Batch 4 deviations; behavior (drop + tell user) preserved |
| Permissions + view-only badge | VB-C | `setCollaboratorPermission` (owner UPDATE); "View only" badge (`!isOwner && !canEdit`); move/remove/Add Song gated on `canEdit`, Rename on `isOwner`; 42501 view-only PATCH denial preserved by 0002 (unchanged) |
| Ownership transfer | VB-C | Ordered non-atomic steps (drop new-owner row → insert old owner accepted can_edit → flip owner_id LAST; mid-failure leaves old owner owning); `guardTransfer` demo; feed "Ownership transferred to X" label + emit; replay-safe early return |
| Bandmate removal from setlist | VB-C (partial) | `removeCollaborator` (0002 delete_owner revokes view+edit) + "N collaborator(s) remaining" notice. Spec's "Julian sees a notification that she was removed" NOT implemented (no notification system). Partially disclosed (Batch 2's general no-notification statement covers it in spirit, not by name) — Finding 4 |
| Activity feed chronological | VB-C | Broadcast `{action, actor, ts}` + chronological panel (local prepend + subscriber prepend). Live-subscribed-only ceiling (D5/D6) disclosed in proposal + spec. Historic persistence = change-2/3 territory |

### collaborative-comments (11 IN)

| Scenario | Status | Evidence / Note |
|---|---|---|
| Post a shared comment | VB-C | `postComment` pins `author_id = auth.uid()`; 0006 `shared_comments_insert_scoped` EXISTS chain in dry-run; author name + time rendered (withAuthorNames 2nd round trip) |
| Section anchoring + jump | VB-C (deviation) | Anchor = `{section, index}` **exactly the personal_annotations convention** (comments.js `formatAnchor`; annotations.js `noteForLine` — 0-based index, compatible). Jump = `sectionAnchorId(section)` scrollIntoView + 2.5 s highlight. Deviation (disclosed Batch 5): jump targets the **section header**, not the exact anchor line (renderer has no per-line ids) |
| Version attachment | VB-C (demo) | `version_id` isolation: null = every version, pinned = that version only; 4 demo asserts; client-side filter (UI-enforced R2) — disclosed |
| Threaded replies | VB-C (demo) | `buildCommentTree` parent_id nesting + oldest-first, orphan replies dropped; 3 demo asserts |
| Author-only edit + history | VB-C | `editComment` scoped `.eq('author_id', userId)`; 0007 `shared_comments_update_author` policy + guard trigger (author_id immutable, body/deleted author-only). "History" = row `updated_at` (no history table exists in 0001) — disclosed deviation |
| Resolve + collapse | VB-C | `resolveComment` by any scoped member via 0007 `shared_comments_update_resolve_scoped`; `<details open={false}>` collapse |
| Soft-delete own | VB-C | `deleteComment` (`deleted=true`); 0007 grants UPDATE on `deleted`; **no DELETE grant** — hard delete stays service-role (explicit soft-delete-only decision, disclosed) |
| Scope visibility (other org zero) | VB-C | 0006 scoped SELECT via nested single-relation EXISTS (song→setlist_items→setlists→owner/accepted-collaborator), no joins; shape verified in dry-run |
| Annotations stay separate | VB-C | SongDetail: annotations panel and comments panel distinct; ChordProRenderer props additive (diff checked — Practice.jsx callers unaffected) |
| No-access → 42501 "No access" | VB-C | `isRlsDenied` (code 42501) → "No access." on insert/update/delete-class paths. Runtime 42501 probe NOT EXECUTED (needs deployed 0006+0007 stack) |
| Offline queue + publish on reconnect | VB-C | 4 comment ops in WRITE_OPS; optimistic pendingSync merge across failed refreshes; drained-post dedupe by song+parent+body |

### row-level-security (delta requirements, 7 scenarios)

| Scenario | Status | Evidence / Note |
|---|---|---|
| Profiles self-only CRUD | VB-C | 0006 lines 67–85 (4 self policies) + column grants; trigger auto-create on auth.users insert (dry-run) |
| Authenticated search column-limited | VB-C | `profiles_select_search` (row) + grant `select (id, username, display_name, avatar_url)`; `instrument` writable-but-not-readable — matches RLS 1.2 |
| Bandmate pair reads/writes their link | VB-C | Pair-scope SELECT/INSERT/UPDATE/DELETE `user_id OR bandmate_id = auth.uid()`; INSERT pins initiator, no self-loops (RLS-invariant; client guards add UX strings) |
| Non-pair sees zero rows | VB-C (shape) | Policy predicate verified in source + dry-run; behavioral non-pair probe NOT EXECUTED |
| Band member reads/comments | VB-C (shape) | EXISTS chain verified in source + dry-run; behavioral walk NOT EXECUTED |
| No-access insert denied (42501) | VB-C (shape) | WITH CHECK pins author + scope; behavioral 42501 probe NOT EXECUTED |
| Invitee self-accept / view-only cannot write | VB-C | `setlist_collaborators_update_self` (design contract verbatim); 0002 setlists owner/can_edit UPDATE policies untouched (dry-run regression)
 | |
| Realtime RLS-safe (readable rows only / no non-RLS tables) | VB-C | Dry-run: publication = exactly the 3 RLS-enabled tables; `postgres_changes` honors RLS per subscriber (supabase-js 2.116 built-in). Subscriber-level walk NOT EXECUTED |

## Findings

### CRITICAL
None.

### WARNING

1. **Offline "indicator to bandmates" is unimplemented (setlists S6 clause)** — NOT disclosed anywhere in the artifacts. The local pendingSync flag is data-layer-only for setlists (no UI badge in Setlists.jsx/SetlistDetail.jsx, unlike Bandmates.jsx "pending sync…" and SongDetail comment badges), and no mechanism exists to surface an offline edit to *bandmates* (would need a server signal/presence; nothing in 0006 or the code does this). The scenario map assigns this to tasks 2.6+1.3, which implement the queue and the drop-notice, not the indicator.
2. **Drained offline merges never enter the activity feed (setlists S7 clause)** — NOT disclosed. `reconcileSetlistOp` correctly merges/drops (demo-verified), but `drainPending` emits no `broadcastActivity` and no feed entry exists for replayed adds/removes. Spec S7 "both changes appear in the activity feed" is only satisfied for online actions (share/reorder/transfer) under the disclosed D5/D6 live-broadcast ceiling.
3. **Delta spec text vs behavior: pre-accept "view but not edit" (setlists S1 clause)** — disclosed in apply-progress Batch 3 but the *spec itself* still reads "MUST view but MUST NOT edit until they accept" (spec line 11), which 0002 RLS cannot produce (no view until accept). Archive spec-sync must correct this sentence, else the archived "source of truth" contradicts the shipped RLS.
4. **Notification clauses without a notification system** — bandmates S5 "I receive a notification that Lucia declined" and setlists S10 "Julian sees a notification that she was removed" are surfaced only as list sections / local notices. The general absence of a notification system is disclosed (Batch 2) and matches the change-2 boundary ("notifications feed/preferences … → change 2"), but neither appears in the proposal's **named deferral table** (the two comments notifications S11/S12 do). Recommend adding these two clauses to the deferral table at archive for precision.

### SUGGESTION

- `setlist_collaborators_update_self` lets the invitee flip `can_edit` on their own row (row policy + role-wide grants cannot split columns). Disclosed in 0006 header + Batch 1; RLS spec 3.1 only asserts the view-only PATCH denial (preserved). If the product wants the invitee unable to self-grant edit, split the surface into a dedicated `accepted_at` column grant + owner-side `can_edit` grant (separate migration; accepted at design review).
- `moveSongInSetlist` refuses offline reorder unless visibility is **proven** private from cache/fresh read — an empty cache on a genuinely private setlist throws the shared-setlist error. Disclosed conservative reading; consider a fallback read before erroring.
- `transferOwnership` is non-atomic across PostgREST calls; step ordering mitigates (old owner keeps ownership until the final flip). A Postgres RPC would be the upgrade path.

## Disclosed Items — Classification Check (from the verify brief)

| Item | Classification | Verdict |
|---|---|---|
| (a) profiles = 49th table | Documented deviation (proposal Decisions, RLS spec purpose, 0006 header, seed) | **Correctly classified** |
| (b) Activity feed broadcast-only, no `setlist_activity`, no actor in `postgres_changes` | D5/D6 + spec lines 5/117 + Batch 3/4 deviations | **Correctly classified** — ceiling (live-subscribed only) and actor-less notices both stated |
| (c) 11 named deferrals | Proposal + tasks.md deferred tables | **Correctly classified** — modulo Finding 4 (two notification clauses sit outside the named table) |
| (d) Two-browser realtime/lock walks may be NOT EXECUTED | Repo precedent (walk documented, verify executes) | **Correctly classified** — this verify: NOT EXECUTED with reason (needs `db reset`/`db push` persistent mutation + 2 seeded sessions) |
| (e) 0007 guard trigger raises P0001, not 42501, on rogue member path | 0007 lines 172–179 (`raise exception`) | **Correctly classified** — out-of-scope access still 42501s (client maps "No access."); an *in-scope* member writing body/deleted on another's comment passes the row policy but trips P0001 → generic message. Client ops always filter `author_id`, so the app's own paths never hit it |

## Adversarial Probes

| Probe | Outcome |
|---|---|
| Requirements silently unimplemented | Two genuine clause gaps (Findings 1–2), one spec-text staleness (3), one partially-disclosed notification family (4). No scenario is wholesale unimplemented; every other IN scenario is backed by code/demo/migration evidence |
| Scope creep | **None**. `git diff --stat 6feabce..HEAD` = exactly the 20 affected-area files (3410+/89−): 2 migrations, seed, 6 libs, 4 hooks, 4 pages + App/AppLayout/ChordProRenderer. `songs.js`, `gigs.js`, `offlineQueue.js` untouched; renderer diff purely additive (props + id + chip); no new npm deps |
| Comment anchors vs annotations.js `{section,index}` | **Compatible**. comments.js stores/renders the same 0-based `{section, index}` convention (`formatAnchor`; `noteForLine` on the annotations side). Jump resolution is section-level (disclosed) |
| `setlist_collaborators` self-accept | Policy present, design contract verbatim; self `can_edit` flip wrinkle disclosed (SUGGESTION above) |
| Nullable `username` + partial unique index | Implemented exactly: `username text` NULL + `create unique index … where username is not null` (0006 lines 29–37) |
| Realtime publication tables | Dry-run verified: exactly `setlists`, `setlist_items`, `setlist_collaborators`; nothing non-RLS; post-rollback 0 |

## NOT-VERIFIED List

- Behavioral two-user RLS walk (col-limited search, pair scope both sides, non-pair zero, comment 42501 pre/post-accept, self-accept visibility flip, view-only PATCH 42501, publication listing) — batched above as code/dry-run shape only; needs deployed 0006+0007 (`supabase db reset`/`db push`) + role-switched psql session.
- Two-browser realtime <2s walk.
- Two-browser lock + conflict-toast walk (incl. heartbeat expiry and lock-release ordering).
- Offline drain walk (add/remove/reorder/notice) on a live stack.
- 2-account invite walk and 2-account comment walk (including post-0007 author edit/resolve/soft-delete).
- `setlists.js`/`offlineSync.js` bare-node `demo()` — not importable bare-node (disclosed limitation, not a defect; pure logic covered by `setlistCollab.js` demo 26 asserts).
- Spec clauses listed in Findings 1, 2, 4 (offline indicator, feed-recorded merges, notification surfaces).

## Verdict

**PASS-WITH-WARNINGS**

- 32 IN scenarios + RLS delta: **0 runtime-verified**, **25 fully verified by code/demo/migration evidence** (incl. 4 executable `demo()` suites = 57 asserts and a green transactional dry-run of both migrations), **7 partial** (spec-clause gaps: pre-accept view wording; offline indicator; feed-recorded merge; removal/decline notification; plus the disclosed actor-less notice and section-level jump), 0 wholesale-unimplemented.
- Commands: lint 0, build 0 (1.78 s), comments 12/0, setlistCollab 26/0, bandmates 8/0, annotations 11/0, dry-run 0006+0007 exit 0 with rollback-verified zero residue, chain #101–#115 landed (15 conventional commits incl. the #108→#109→#110 revert/re-land cycle).
- No scope creep; adversarial probes all clean or pre-disclosed.
- Warnings are disclosure/classification gaps (Findings 1–4), not runtime failures. None block archive; **all four should be synced into the delta specs / deferral table at archive** so the archived source of truth matches shipped behavior.

## Next Recommended

1. **Archive** the change (implementation complete; all task checkboxes `[x]`; 0007 follow-up merged) — at archive, sync the delta specs: correct the pre-accept "view but not edit" sentence (Finding 3), annotate the offline-indicator and feed-record clauses as deferred/partial (Findings 1–2), and add the two notification clauses to the named deferral table (Finding 4).
2. Deploy 0006+0007 on the local stack (`supabase db reset`), then run the documented RED SQL walk (apply-progress Batch 1 probes 1–5 + Batch 6 probes 1–7) as post-archive verification if desired — none of it gates archive.
3. Change 2 (notifications feed + `@mention`) is the natural home for the notification-clause gaps and any future feed persistence (`setlist_activity` fallback, D5).

## Skill Resolution

- `sdd-verify` — executed read-only diagnostics, persisted `verify-report.md` (only permitted write), returned the result contract below. No `sdd-attempt`, no mem_save (per brief), no subagents, no repo mutation (build `dist/` artifacts are gitignored; worktree remains clean except the untracked change folder).