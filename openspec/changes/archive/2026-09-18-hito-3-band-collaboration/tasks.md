# Tasks: Hito 3 — Band Collaboration (bandmates + shared setlists + comments)

## Resolved Design Questions (decisions)

1. **Activity feed**: BROADCAST-ONLY — no `setlist_activity` table. S1–S12 in-scope scenarios need no cross-session history; S8 (merge-conflict) + S14 (revert), which would, defer to change 3. Broadcast channel carries `{actor, action, ts}` for "edited by X", "X reordered", conflict toast. Add table iff a later spec requires persistence. *(D5/D6 confirmed)*
2. **`username` NULLABLE**: KEEP NULL per spec — signup trigger creates the row pre-username; NOT NULL would break row creation. Enforce uniqueness with partial unique index `WHERE username IS NOT NULL`. *(D2 confirmed)*
3. **`replica identity full`**: verification gate, not migration blocker — plan it for the 3 published tables IF PR#0 RLS walk shows delete events leaking on non-PK filter; verify on live stack, amend 0006 only then.

**Constraints**: `moveSong` offline = online-only for shared setlists (D7 — task constraint, not a task). Reorder replay uses stale indices → order corruption; S8 defers. No down-file convention (0001–0005 single files) → rollback = revert PR. Threat matrix N/A → no RED security tasks.

## Review Workload Forecast

| PR | Content | Est. | Risk |
|----|---------|------|------|
| #0 | 0006 migration + seed + RED SQL | 340 | Low |
| #1a | bandmates core (profiles/bandmates/hook/page/routes/queue) | 370 | Low |
| #2a | shared setlist collab ops + UI + activity feed | 330 | Low |
| #2b | realtime + advisory lock + reconcile guard | 210 | Low |
| #3 | comments (lib/hook/SongDetail panel/queue) | 390 | Medium (borderline) |

Total ≈ 1640 changed lines; every slice ≤400.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----|----------------------|-----------------|-------------------|
| 0 | 0006 RLS + publication | #0 | `supabase db reset` + RED SQL walk | 2-identity psql session (`docs/local-dev.md`) | revert 0006 + seed |
| 1 | bandmates core | #1a | `node -e "import('./src/lib/bandmates.js').then(m=>m.demo())"` | 2-account invite walk in dev browser | revert profiles/bandmates/hook/page/routes |
| 2 | collab ops + UI + feed | #2a | `pnpm lint && pnpm build` | 2-browser share/permission walk | revert setlists.js + SetlistDetail.jsx |
| 3 | realtime + lock + reconcile | #2b | `node -e "import('./src/lib/setlists.js').then(m=>m.demo())"` | 2-browser edit <2s + lock walk | revert useSharedSetlist + realtime code |
| 4 | comments | #3 | `node -e "import('./src/lib/comments.js').then(m=>m.demo())"` | 2-account comment walk | revert comments.js/useComments/SongDetail |

## PR#0 — 0006 Migration (base: main, `.sql` only)
> Verification: `supabase db reset` + RED SQL walk; `pnpm lint && pnpm build` smoke

- [x] 0.1 Create `supabase/migrations/0006_band_collaboration.sql`: `profiles` (id→auth.users CASCADE, display_name, username UNIQUE NULL, instrument, avatar_url) + signup auto-create trigger
- [x] 0.2 `profiles` RLS: self CRUD; authenticated search-SELECT limited cols (username, display_name, avatar_url) — RLS spec 1.1/1.2
- [x] 0.3 `bandmate_links` pair-scope SELECT/INSERT/UPDATE + `invite_codes` own-row RLS (initPlan guard) — RLS spec 2.1
- [x] 0.4 `setlist_collaborators` self-accept UPDATE policy (`user_id = auth.uid()`, using+with check); owner policies unchanged — RLS spec 3.1
- [x] 0.5 `shared_comments` SELECT+INSERT: nested single-relation EXISTS song→setlist_items→setlists→setlist_collaborators, no joins — RLS spec 2.2
- [x] 0.6 `updated_at` trigger on `setlists`; `alter publication supabase_realtime add table` setlists, setlist_items, setlist_collaborators — RLS spec 4.1
- [x] 0.7 RED SQL: seed 2nd identity in `supabase/seed.sql` + walk — col-limited search, pair scope, non-pair zero, self-accept, comment 42501, view-only PATCH 42501

## PR#1a — Bandmates Data Layer (base: main; branch `feat/hito-3-band-collaboration-pr1a-libs`, 303 lines ✓)
> Verification: `node -e "import('./src/lib/bandmates.js').then(m=>m.demo())"`; `pnpm lint && pnpm build`

- [x] 1.1 Create `src/lib/profiles.js`: `searchProfiles` (col-limited), `getProfile`, `resolveById` — bandmates R1/R2
- [x] 1.2 Create `src/lib/bandmates.js`: invite/accept/decline/remove/list + guards (no-self, already-active, revoked-pending invalid) + `demo()` — R3–R5
- [x] 1.3 `src/lib/offlineSync.js` WRITE_OPS += `inviteBandmate`, `respondInvite` (idempotent: revoked invite drops on replay) — R6

## PR#1b — Bandmates UI (base: PR#1a; branch `feat/hito-3-band-collaboration-pr1a-ui`, 392 lines ✓)
> Verification: `pnpm lint && pnpm build`; 2-account invite walk (verify phase)

- [x] 1.4 Create `src/hooks/useBandmates.js` (useSongs pattern: search/invite/accept/decline/list/remove)
- [x] 1.5 Create `src/pages/Bandmates.jsx` + the "bandmates" URL route in `src/App.jsx` + nav in `AppLayout.jsx`; "No user found", "Already in band", "You cannot add yourself"

## PR#2a — Shared Setlists: Ops + UI (base: main)
> Verification: `pnpm lint && pnpm build`; 2-browser share/permission walk

- [x] 2.1 `src/lib/setlists.js`: `setVisibility`, `shareWithBandmates`, `setCollaboratorPermission`, `transferOwnership`, `removeCollaborator`; `listSetlists` drops owner-only filter (member RLS reads) — setlists R1/R8/R9/R10
- [x] 2.2 `src/pages/SetlistDetail.jsx`: visibility picker, collaborator manage, transfer confirm, remove + "N collaborators remaining", view-only badge
- [x] 2.3 Activity feed: broadcast `{actor,action,ts}` → chronological panel incl. "Ownership transferred to Julian" — setlists S11/S12, R4/11

## PR#2b — Realtime + Lock + Reconcile (base: main)
> Verification: `node -e "import('./src/lib/setlists.js').then(m=>m.demo())"`; `pnpm lint && pnpm build`

- [x] 2.4 Create `src/hooks/useSharedSetlist.js` + realtime helpers in `src/lib/setlists.js`: postgres_changes (setlist_items `setlist_id=eq`), broadcast subscribe, teardown on unmount, member refetch <2s — setlists R2
- [x] 2.5 Broadcast advisory lock `{userId, songId}` + conflict toast "Keep my changes"/"Accept server version"; locked-song move disabled — R3
- [x] 2.6 Reconcile guard in `src/lib/offlineSync.js` + `setlists.js`: pre-replay server-`updated_at` compare → drop stale op + "removed by X before your sync"; enqueue idempotent collab ops — R5/R6/R7

## PR#3 — Collaborative Comments (base: main)
> Verification: `node -e "import('./src/lib/comments.js').then(m=>m.demo())"`; `pnpm lint && pnpm build`

- [x] 3.1 Create `src/lib/comments.js`: list (thread tree via parent_id), post/reply, edit (author-only + history), soft-delete, resolve; anchor `{section,index}`; RLS 42501 → "No access"; `demo()` — comments R1–R10
- [x] 3.2 `src/lib/offlineSync.js` WRITE_OPS += `postComment`, `editComment`, `deleteComment`, `resolveComment` — R11
- [x] 3.3 Create `src/hooks/useComments.js`: read + optimistic mutation, pendingSync flag
- [x] 3.4 `src/pages/SongDetail.jsx` thread panel: jump-to-anchored section, `version_id` isolation, reply/resolve/delete/edit, resolved collapsed, annotations stay separate — R2/R3/R4/R9

## IN Scenario → Owning Task Map (32 IN)

### collaboration-bandmates (9 IN)

| Scenario | Owning task(s) |
|---|---|
| Search + add by username; no user found | 1.1 + 1.5 |
| Add by unique user ID | 1.1 (`resolveById`) |
| Accept pending invite | 0.4 + 1.2 + 1.5 |
| Remove cancels pending invite | 1.2 + 1.3 (drop on replay) |
| Decline pending invite | 1.2 + 1.5 |
| Cannot add self; already active "in band" | 1.2 + 1.5 |
| Offline invite while active / pending path | 1.3 + 1.5 |

### shared-setlist-collaboration (12 IN)

| Scenario | Owning task(s) |
|---|---|
| Create shared + invite; view-not-edit pre-accept | 0.4 + 2.1 + 2.2 |
| Realtime live edit <2s | 2.4 |
| Conflict toast keep/accept; lock song during edit | 2.5 |
| Collaborative reorder + "X reordered" | 2.3 (feed) + existing moveSong |
| Offline edit pending sync + offline indicator | 2.6 + 1.3 queue |
| Non-conflicting offline merge | 2.6 |
| Offline add vs online delete notice | 2.6 |
| Permissions + view-only badge | 2.1 + 2.2 |
| Ownership transfer | 2.1 + 2.2 + 2.3 |
| Bandmate removal from setlist | 2.1 + 2.2 |
| Activity feed chronological | 2.3 |

### collaborative-comments (11 IN)

| Scenario | Owning task(s) |
|---|---|
| Post a shared comment | 0.5 + 3.1 + 3.4 |
| Section anchoring + jump | 3.1 + 3.4 |
| Version attachment (v1 vs v2) | 3.1 + 3.4 |
| Threaded replies | 3.1 + 3.4 |
| Author-only edit + history | 3.1 + 3.4 |
| Resolve + collapse | 3.1 + 3.4 |
| Soft-delete own | 3.1 |
| Scope visibility (other org zero) | 0.5 + 3.1 |
| Annotations stay separate | 3.4 |
| No-access → 42501 "No access" | 0.5 + 3.1 |
| Offline queue + publish on reconnect | 3.2 + 3.3 |

## Deferred (NOT tasks)

| Scenario | Ref | Disposition |
|---|---|---|
| Email search | bandmates S2 | default defer — no email column in frozen profiles set |
| Proximity gen/accept/sync/expiry | bandmates S6–S9, S13 | gated — PR#1b only if user opts in (budget) |
| Merge-conflict screen / revert | setlists S8, S14 | change 3 |
| Change-notifications push | setlists S15 | change 2 |
| Notify bandmates / @mention | comments S11, S12 | change 2 |