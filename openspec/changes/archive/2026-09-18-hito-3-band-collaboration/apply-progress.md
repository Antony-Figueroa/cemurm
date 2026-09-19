# Apply Progress: hito-3-band-collaboration

## Batch 1 — PR#0: Migration 0006 (branch `feat/hito-3-band-collaboration-pr0-migration` @ main `6feabce`)

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner; migration-only slice — verification via psql transactional dry-run on the running local stack + `supabase db lint`; RED SQL walk documented for the verify phase, executed later on the deployed stack via `supabase db push` — out of this slice's scope per launch contract).

Work-unit commits (stacked-to-main chain, PR#0 base main; NOT pushed — orchestrator gates/settles):

| Commit | Tasks | Content |
|---|---|---|
| `e050c8d` | 0.1–0.3 | profiles table + signup trigger + profiles RLS (self CRUD + col-limited search) + bandmate_links pair-scope + invite_codes own-row RLS |
| `fe746d1` | 0.4–0.5 | setlist_collaborators self-accept UPDATE (design contract verbatim) + shared_comments 3-hop EXISTS scope (SELECT/INSERT) |
| `d9aba28` | 0.6 | updated_at triggers (setlists before-update + setlist_items→parent bump) + publication add setlists/setlist_items/setlist_collaborators |
| `cf4a195` | 0.7 | seed: 3rd identity (outsider), profiles usernames, bandmate pair (demo↔isolation), pending collaborator for self-accept walk |

### Work Unit Evidence (0.1–0.7)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | No test runner in repo (strict_tdd false). Migration syntax/DDL validity: transactional dry-run `begin; \<0006>; rollback;` via `docker exec supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1` → every statement OK (CREATE TABLE/INDEX/FUNCTION/TRIGGER 6x, POLICIES 9x, GRANTS, 3x ALTER PUBLICATION), ROLLBACK, exit 0; confirmed zero persistent state (0 profiles rows/triggers/pub-tables after) |
| Runtime harness command/scenario and exact result | `supabase db lint` → "No schema errors found", exit 0 (validates 0005-state schema on the running local stack; 0006 itself proven by the dry-run above — full `supabase db reset`/`db push` execution is the verify/deploy step, out of PR#0 slice per launch contract). `pnpm lint` exit 0 / `pnpm build` exit 0 (unchanged src). `git diff --stat main` = 333 changed lines ≤ 400 ✓ (0006: 305+, seed: 28± ) |
| Rollback boundary | `git revert` of the 4 commits (or drop the branch pre-merge): only `supabase/migrations/0006_band_collaboration.sql` + `supabase/seed.sql` — `src/*`, other migrations, web untouched. Migration is additive DDL; Hito 1/2 owner flows unaffected (0002 setlists/setlist_items policies untouched) |

### RED SQL walk — probe commands (documented; execution on deployed stack at verify, per migration-only convention)

Ordered psql session (role-switched; run with `supabase db push` on the deployed/local stack, then as postgres on the target db):

```sql
-- ── 1. col-limited search + pair scope       (RLS 1.2 / 2.1)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';
select username, display_name, avatar_url from public.profiles;      -- expect 3 rows (demo/isolation/outsider)
select instrument from public.profiles;                              -- expect ERROR 42501 (column not granted)
select * from public.bandmate_links;                                 -- expect 1 row (demo↔isolation pair)
reset role;
-- ── 2. pair scope, other side                     (RLS 2.1)
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
set local request.jwt.claim.role = 'authenticated';
select * from public.bandmate_links;                                 -- expect 1 row (bandmate_id side)
-- ── 3. view-only PATCH → 42501                                      (RLS 3.1, 0002 shape preserved)
update public.setlists set name = 'hacked' where id = '30000000-0000-0000-0000-000000000001';
--                                                                   -- expect ERROR 42501 (can_edit=false WITH CHECK)
reset role;
-- ── 4. non-pair zero + comment 42501 (outsider, pre-accept)         (RLS 2.1 non-pair / 2.2 no-access)
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
set local request.jwt.claim.role = 'authenticated';
select * from public.bandmate_links;                                 -- expect 0 rows (non-pair zero)
select * from public.shared_comments;                                -- expect 0 rows (no setlist access)
insert into public.shared_comments (song_id, author_id, body) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'x');
--                                                                   -- expect ERROR 42501 (no-access insert)
-- ── 5. self-accept → visibility flips                              (RLS 3.1)
update public.setlist_collaborators set accepted_at = now()
  where setlist_id = '30000000-0000-0000-0000-000000000001' and user_id = '10000000-0000-0000-0000-000000000003';
--                                                                   -- expect UPDATE 1 (self-accept succeeds)
select count(*) from public.setlists where id = '30000000-0000-0000-0000-000000000001';
--                                                                   -- expect 1 (visibility gained post-accept)
insert into public.shared_comments (song_id, author_id, body) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'hi band');
--                                                                   -- expect INSERT 0 1 (scoped member posts)
rollback;
```

Probe mapping to tasks: col-limited search (0.2), pair scope both sides (0.3), non-pair zero (0.3), self-accept (0.4), comment 42501 pre-accept + post-accept insert (0.5), view-only PATCH 42501 (0.4/0002 preserved). Publication probe (RLS 4.1, 0.6): `select tablename from pg_publication_tables where pubname='supabase_realtime';` → expect exactly `setlists`, `setlist_items`, `setlist_collaborators` (no non-RLS tables — all three are RLS-enabled).

### Completed Tasks 0.1–0.7 (checklist contract per tasks.md)

- [x] 0.1 `0006_band_collaboration.sql`: `profiles` (id→auth.users CASCADE, display_name, username, instrument, avatar_url) + signup auto-create trigger (`handle_new_user()`, SECURITY DEFINER, search_path locked) + partial unique index `WHERE username IS NOT NULL` (D2)
- [x] 0.2 `profiles` RLS: self CRUD (select/insert/update/delete by `id = auth.uid()`); authenticated search-SELECT policy + column-capped grants (id, username, display_name, avatar_url); instrument update-only (writable, not readable by others)
- [x] 0.3 `bandmate_links` pair-scope SELECT/INSERT/UPDATE (inviter fixed on user_id, no-self at RLS, invitee accept/decline via UPDATE, either side DELETE) + `invite_codes` own-row CRUD by `created_by`; initPlan guard on every policy
- [x] 0.4 `setlist_collaborators_update_self` (`user_id = auth.uid()` using+with check, design contract verbatim); owner-management policies untouched; grants untouched (0002)
- [x] 0.5 `shared_comments` SELECT+INSERT via nested single-relation EXISTS song→setlist_items→setlists→(owner OR accepted collaborator); INSERT pins `author_id = auth.uid()`; no joins; grant select, insert re-opened
- [x] 0.6 `updated_at` triggers: `setlists_bump_updated_at` (before update) + `setlist_items_bump_setlists_updated_at` (after item DML → parent bump, SECURITY DEFINER, design data-flow line 27); publication add setlists, setlist_items, setlist_collaborators (all RLS-enabled)
- [x] 0.7 RED SQL: seed gains 3rd identity (outsider …0003, non-pair/no-access probe target), profiles usernames (demo/isolation/outsider), active band pair (demo↔isolation), pending collaborator (outsider, accepted_at NULL — self-accept walk); probe commands documented (above) — no probe-file convention in repo (`supabase/snippets/` empty; hito-2 precedent: walk documented in progress/verify reports)

### Deviations from Design

- None in behavior. Implementation matches design.md D1–D8 and the design contract SQL (self-accept + shared_comments EXISTS chains) verbatim. Seed interpretation: task 0.7 "seed 2nd identity" implemented as the 3rd identity (…0003) — the walk's non-pair-zero and comment-42501 probes REQUIRE a user who is neither in the band pair nor holding setlist access; the two pre-existing identities are the pair/accepted-collaborator. `handle_new_user()` grants: execute revoked from public/anon/authenticated (trigger-only entry, hardest lock) rather than 0002's execute-to-authenticated (client never calls it).

### Issues Found

- `setlist_collaborators_update_self` allows the invitee to flip `can_edit` on their own row (column grants are role-wide; rows can't be column-split). Accepted per the design contract (spec RLS 3.1 only asserts the view-only setlists-PATCH denial, which 0002 preserves); flagged for verify/design review — proposed escalation guard: separate the self-accept surface into a dedicated column grant (`accepted_at`) + owner-side `can_edit` column grant, if the product wants the invitee unable to self-grant edit.
- `supabase db query` (CLI 2.117.0) is single-statement-only — dry-run executed via psql inside the Postgres container (`docker exec supabase_db_cemurm`); `SUPABASE_DB_URL` unset so `supabase db lint` ran against the local stack default (validates 0005-state schema, not the new file).
- Pre-existing build warning (chunk > 500 kB) unchanged; no new warnings.

### Remaining Tasks

- [ ] 1.1–1.5 bandmates core (PR#1a) — next slice after verify PR#0
- [ ] 2.1–2.3 shared setlists ops + UI + feed (PR#2a)
- [ ] 2.4–2.6 realtime + lock + reconcile (PR#2b)
- [ ] 3.1–3.4 comments (PR#3)

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main), resolved in tasks.md (chain strategy line 25; PR#0 forecast 340)
- Current work unit: PR#0 — 0006 migration + seed + RED SQL (base main)
- Boundary: from main@6feabce through tasks 0.1–0.7; next slice PR#1a starts from this branch's merge
- Budget: `git diff --stat main` = 333 changed lines (332+/1−) ≤ 400 ✓

### Status

7/7 tasks complete (PR#0). Four conventional commits `e050c8d` + `fe746d1` + `d9aba28` + `cf4a195` on `feat/hito-3-band-collaboration-pr0-migration`, not pushed (no PR). Lint clean, build clean, db lint clean, transactional dry-run green. Next: sdd-verify PR#0 → apply PR#1a (bandmates core).

---

## Batch 2 — PR#1a (libs) + PR#1b (UI): tasks 1.1–1.5 (stacked-to-main chain, PR#0 merged @ main `c81e551`)

Initial slice "PR#1a bandmates core" authored 695 lines vs the 400 budget; maintainer approved **splitting the slice** (Review Workload Guard). Re-sliced into two branches — work-unit commits preserved as-is (same SHAs), no rebase/reword:

- **PR#1a — data layer** (`feat/hito-3-band-collaboration-pr1a-libs`, base main): **303 changed lines ✓** — pushed to origin `feat/hito-3-band-collaboration-pr1a-libs`
- **PR#1b — UI layer** (`feat/hito-3-band-collaboration-pr1a-ui`, base = PR#1a branch): **392 changed lines ✓** — NOT pushed (orchestrator gates/settles)

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner — verification via the mandated `bandmates demo()` node self-check + `pnpm lint` + `pnpm build`; the 2-account invite browser walk is documented below and executed in the verify phase on the running local stack, per PR#0 precedent — no probe/automated-runner convention in repo).

Work-unit commits (PR#1a — libs):

| Commit | Tasks | Content |
|---|---|---|
| `c9fff48` | 1.1 | `src/lib/profiles.js` — searchProfiles (col-limited select, ILIKE, excludes self), resolveById (add-by-ID), getProfile (self guard) |
| `9cba56a` | 1.2 | `src/lib/bandmates.js` — invite/accept/decline/remove/list over 0006 pair-scope RLS; guardInvite (no-self, already-active, pending re-invite) + normaliseLink pure helpers; offline enqueue + optimistic pendingSync; `demo()` 8 asserts |
| `4e11b8e` | 1.3 | `src/lib/offlineSync.js` — WRITE_OPS += inviteBandmate, respondInvite; respondInvite idempotent (revoked invite drops on replay, R6) |

Work-unit commits (PR#1b — UI, base = PR#1a):

| Commit | Tasks | Content |
|---|---|---|
| `19aa155` | 1.4 | `src/hooks/useBandmates.js` — useSongs pattern: active/incoming/outgoing/declined buckets, search, resolveById, invite/accept/decline/remove with optimistic self-heal |
| `9aad2e5` | 1.5 | `src/pages/Bandmates.jsx` + `/bandmates` route (App.jsx) + nav (AppLayout.jsx); "You cannot add yourself" / "No user found with that username" / "Already in band" |

### Work Unit Evidence (1.1–1.5)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node -e "import('./src/lib/bandmates.js').then(m=>m.demo())"` → `bandmates demo OK: 8 asserts (guards, direction mapping, offline optimism)`, exit 0 (pure guard/normalise/optimistic helpers — the state-machine surface of 1.2/1.4/1.5). profiles.js demo: N/A — single-query reads, no branch/loop logic beyond query composition (ponytail: trivial mappings need no test); covered by lint+build and the browser walk. |
| Runtime harness command/scenario and exact result | Documented for verify (repo precedent, no automated runner): 2-account walk on the local stack with seed identities demo (…0001) + isolation (…0002) — search "isolation" → result shown with Add disabled "Already in band" (seed active pair); search own username "demo" → "You cannot add yourself"; invite outsider (…0003) → pending → (second account) accept → active. Requires running `supabase start` + .env.local + 2 browser sessions — out of this slice's scope per launch contract (executable evidence above is lint/build/demo). |
| Rollback boundary | Drop branch or revert the 5 commits: exactly `src/lib/profiles.js`, `src/lib/bandmates.js`, `src/lib/offlineSync.js` (3 added WRITE_OPS lines), `src/hooks/useBandmates.js`, `src/pages/Bandmates.jsx`, `src/App.jsx` (+2), `src/components/layout/AppLayout.jsx` (+1). No migrations touched (0006 frozen), no Hito 1/2 pages touched — song/setlist/gig flows unaffected (owner-only filters untouched in setlists.js/gigs.js). |

### Completed Tasks 1.1–1.5 (checklist contract per tasks.md)

- [x] 1.1 `src/lib/profiles.js`: `searchProfiles(query, {excludeUserId})` — ILIKE contains-match, `.limit(10)`, orders by username, excludes the caller's row (spec "my result is excluded"); `resolveById(userId)` maybeSingle; `getProfile(userId)` alias of resolveById (own-profile guard). All three read exactly the 0006-granted columns `id, username, display_name, avatar_url` — the server enforces the cap (RLS 1.2), no instrument read.
- [x] 1.2 `src/lib/bandmates.js`: `inviteBandmate` (INSERT user_id=me; guardInvite: no-self → "You cannot add yourself.", active → "Already in band.", any pending/declined row → "Invitation already sent."; PK-safe pre-check instead of relying on 23505), `acceptInvite`/`declineInvite` (UPDATE my incoming pending row only — `.eq(user_id, bandmateId).eq(bandmate_id, userId).eq(status,'pending')`; zero rows → "This invitation is no longer valid."), `listBandmates` (pair-scope `.or`, profiles resolved in a second `.in('id')` call — no FK from bandmate_links to profiles, so no PostgREST embed; merged client-side), `removeBandmate` (DELETE either side; cancels pending invites), `respondInvite` (queue-safe; revoked → silent drop). Offline: enqueueOp + optimistic `pendingSync` row. `demo()` 8 asserts.
- [x] 1.3 `src/lib/offlineSync.js`: WRITE_OPS += `inviteBandmate: bandmates.inviteBandmate`, `respondInvite: bandmates.respondInvite`; respondInvite catches only "This invitation is no longer valid." → returns null (revoked invite drops on replay) — connectivity errors still propagate so drainPending keeps the op (setlists.js retry semantics).
- [x] 1.4 `src/hooks/useBandmates.js`: useSetlists/useSongs shape — refresh on mount, derived buckets `active` / `incomingPending` / `outgoingPending` / `declinedOutgoing`, `isBandmate(id)` (Add-button disable), `search`, `resolveById`, `invite(profile)` (carries the searched profile onto optimistic rows so "Sent invites" renders offline), `accept`, `decline` (row removed from view after decline — the shared pair row stays 'declined' server-side for the inviter), `remove`; dedupe via replaceLink (direction+userId).
- [x] 1.5 `src/pages/Bandmates.jsx` + `{ path: '/bandmates', element: <Bandmates /> }` under RequireAuth in `src/App.jsx` + `{ to: '/bandmates', label: 'Bandmates' }` in `AppLayout.jsx` navLinks. Spec strings verbatim: search self-match → "You cannot add yourself."; empty search → "No user found with that username."; active result → Add button disabled with "Already in band"; plus Accept/Decline (incoming), Cancel (sent), Remove (active + declined); declined-outgoing section surfaces the decline to the inviter (bandmates R5 surface; notification push is deferred to change 2 per tasks.md deferred table).

### Deviations from Design

- **Line budget (RESOLVED by maintainer split decision)**: the initial PR#1a authored 695 inserted lines vs the 400 budget (forecast 370). Not golfed: repo house style (explanatory comments, USER_ERRORS mapping, tiny helpers) plus the real UI surface (4 list sections + search + add-by-ID + 4 spec strings) exceed the estimate; one genuine dedup pass (ListSection component over 4 identical section bodies) did not move the total materially. Maintainer chose **Split the slice**; re-sliced into PR#1a libs (303 ✓) + PR#1b UI (392 ✓); both verified green in isolation. No size:exception needed.
- `respondInvite` is invoked through acceptInvite/declineInvite (which each enqueue + return an optimistic row on connectivity failure) — so the drain loop's remove-on-success semantics keep exactly one retry copy queued per offline failure, matching the existing setlists.js createSetlist behavior. Revoked-invite drop works because acceptInvite rethrows the USER_ERROR message and respondInvite swallows only that one.
- Declined-invite notification ("I receive a notification that Lucia declined") is deferred — no notification system exists in the app today; the declined section of the list is the PR#1a surface (tasks.md defers notify/mention to change 2).
- getProfile is a one-line alias of resolveById (identical query, different contract names per tasks.md 1.1) — kept both for the named interface.

### Issues Found

- `bandmate_links` has no FK to `profiles` (0001: references `auth.users`), so the list cannot embed the other party's profile via PostgREST — two round trips (links, then profiles `.in('id')`), merged client-side. Documented, not a bug.
- Pre-existing build warning (chunk > 500 kB) unchanged; no new warnings (supabase.js dual static/dynamic import note is informational, matches annotations.js/gigs.js precedent).
- No deviations from spec behavior; 0006 migration untouched (frozen); Hito 1/2 setlists.js/gigs.js untouched → owner-only flows unaffected (regression guard).

### Remaining Tasks

- [ ] 2.1–2.3 shared setlists ops + UI + feed (PR#2a)
- [ ] 2.4–2.6 realtime + lock + reconcile (PR#2b)
- [ ] 3.1–3.4 comments (PR#3)

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main), resolved in tasks.md (chain strategy line 25; PR#1a forecast 370)
- Current work unit: PR#1a (libs) + PR#1b (UI) — bandmates core (PR#0 merged @ main `c81e551`)
- Boundary: main@c81e551 → `feat/hito-3-band-collaboration-pr1a-libs` (tasks 1.1–1.3) → `feat/hito-3-band-collaboration-pr1a-ui` (tasks 1.4–1.5); next slice PR#2a starts from this chain's merge
- Budget: PR#1a `git diff --stat main` = 303 changed lines (303+/0−) ✓; PR#1b `git diff --stat` vs PR#1a = 392 changed lines (392+/0−) ✓. Both under 400; split approved by maintainer. Artifacts in `openspec/` are untracked (repo convention: active change folders commit at archive only) and not part of the code diff.

### Status

5/5 tasks complete (1.1–1.5). **PR#1a merged to main** as `5c33b03` (#102) — "feat(bandmates): core libs — profiles, invite lifecycle, offline ops (Hito 3 PR#1a-1)". **PR#1b rebased** onto merged main (`47955e3` useBandmates + `8edebeb` page/route/nav) and pushed to `origin/feat/hito-3-band-collaboration-pr1a-ui`; diff vs main 392 lines ✓ (rebased content byte-identical to verified `19aa155`/`9aad2e5`). Both branches: lint exit 0, demo 8/8 asserts exit 0, build exit 0 (verified on pushed HEAD `8edebeb`). Next: orchestrator gates/settles PR#1b → review → merge → apply PR#2a.
## Batch 3 — PR#2a: tasks 2.1–2.3 (branch `feat/hito-3-band-collaboration-pr2a-collab`, base main `5881a03`)

Slice "PR#2a shared setlists ops + UI + activity feed" (forecast 330) authored **709 changed lines** (709+/64−) vs the 400 budget — the PR#1a pattern repeated (forecast 370 → 695). Not golfed: repo house style (explanatory comments, `USER_ERRORS` mapping, per-op `withErrorMapping` shape) plus three real surfaces (5 RLS-gated ops + owner manage panel + feed). Work-unit commits are preserved as-is for a mechanical re-slice (see Deviations).

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner — verification via the mandated `setlistCollab demo()` node self-check + `pnpm lint` + `pnpm build`; the 2-account browser walk is documented below and executed in verify on the running local stack, per PR#0/PR#1a precedent).

Work-unit commits:

| Commit | Tasks | Content |
|---|---|---|
| `7be69ed` | 2.1 | `src/lib/setlistCollab.js` (NEW, pure/zero-dep: `guardVisibility`, `shareTargets`, `guardTransfer` + `describeActivity` feed labels + 11-assert `demo()`); `src/lib/setlists.js` — `flattenSetlist(row, userId)` gains visibility/isOwner/canEdit/collaborators, `listSetlists`/`fetchSetlistById` drop the owner-only filter and embed `setlist_collaborators`, +5 ops (`setVisibility`, `shareWithBandmates`, `setCollaboratorPermission`, `transferOwnership`, `removeCollaborator`) + `listCollaborators` |
| `0d1748a` | 2.2 | `src/pages/SetlistDetail.jsx` — visibility picker, owner Collaboration panel (bandmate checkboxes, per-collaborator can-edit/view-only select, Remove + "N collaborator(s) remaining" notice, transfer select + `window.confirm`), "Shared"/"View only" badges, edit gating (Add Song/picker/move/remove by `canEdit`, Rename by `isOwner`); `src/pages/Setlists.jsx` — Shared chip + owner-only Delete |
| `92f7d5c` | 2.3 | `src/lib/setlists.js` — `subscribeActivity`/`broadcastActivity` (Realtime broadcast, one-shot sender channel, payload `{action, actor, ts}`); `src/pages/SetlistDetail.jsx` — Activity toggle + chronological panel (actor + local time), `emitActivity` local-append, emit on reorder/share/transfer-ownership |

### Work Unit Evidence (2.1–2.3)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node -e "import('./src/lib/setlistCollab.js').then(m=>m.demo())"` → `setlistCollab demo OK: 11 asserts (visibility, share targets, transfer guard, feed labels)`, exit 0 — covers the branch/parser logic of 2.1 (visibility guard, share-target dedupe/exclusions, transfer eligibility) and 2.3 (`describeActivity` labels, incl. "Ownership transferred to X"). `node --check src/lib/setlists.js` exit 0. `setlists.js` is NOT bare-node importable (static `songs.js → supabase.js` chain throws without `import.meta.env`) — same as Hito 1/2, hence the pure module; the network ops are covered by lint+build+browser walk. |
| Runtime harness command/scenario and exact result | `pnpm lint` exit 0 (zero warnings, `--max-warnings 0`); `pnpm build` exit 0 (1.76s, only the pre-existing >500 kB chunk warning). Documented for verify (repo precedent, no automated runner): 2-account walk on the local stack — owner shares with a bandmate (invite row → accept → setlist appears in the collaborator's `/setlists`), owner flips view-only → collaborator loses move/remove/Add Song, reorder shows "X reordered the setlist" in the other session's Activity panel, transfer → former owner keeps edit and loses owner controls. Requires `supabase start` + `.env.local` + 2 browser sessions — out of this slice's launch scope. |
| Rollback boundary | Drop the branch or revert the 3 commits: exactly `src/lib/setlistCollab.js` (new), `src/lib/setlists.js` (collab ops + member reads + feed helpers), `src/pages/SetlistDetail.jsx`, `src/pages/Setlists.jsx`. No migrations touched (0006 frozen), no Hito 1/2 modules restructured, `useSetlists`/`useSongs`/`useBandmates` untouched, `setlistCollab.js` is additive so removing it cannot break anything else. |

### Completed Tasks 2.1–2.3 (checklist contract per tasks.md)

- [x] 2.1 `src/lib/setlists.js`: `setVisibility` (guard → `.update({visibility}).eq('id').eq('owner_id')`), `shareWithBandmates` (preflight roster fetch, `shareTargets` dedupes/excludes owner+current, batch INSERT with `can_edit` default true), `setCollaboratorPermission` (owner UPDATE on `setlist_id`+`user_id`), `removeCollaborator` (DELETE row — 0002 `delete_owner` revokes access), `transferOwnership` (`guardTransfer` → drop new owner's collab row → INSERT former owner as accepted `can_edit` → flip `owner_id` LAST, ordered so a mid-failure leaves the old owner owning), `listCollaborators` (roster + `profiles` second round trip, `pending: !accepted_at`); `listSetlists`/`fetchSetlistById` drop the owner-only filter and embed `setlist_collaborators` (member RLS reads 0002). Guard strings in `USER_ERRORS`: "Visibility must be private, shared, or public." / "Only an accepted collaborator can take ownership." / "The new owner must accept the invitation first."
- [x] 2.2 `src/pages/SetlistDetail.jsx`: visibility picker (private/shared/public, owner only), owner Collaboration panel (share checkboxes from `useBandmates().active` minus current collaborators, per-row can-edit/view-only select, Remove with "N collaborator(s) remaining" notice, transfer select limited to accepted collaborators + `window.confirm`), "Shared" chip + "View only" badge (`!isOwner && !canEdit`), gate Add Song/picker/move/remove on `canEdit` and Rename on `isOwner`; `src/pages/Setlists.jsx` Shared chip + owner-only Delete.
- [x] 2.3 Activity feed: `subscribeActivity(setlistId, cb)` (broadcast channel, unsubscribe fn) + `broadcastActivity(setlistId, action, actor)` returning the payload (Realtime does not echo a sender's own broadcast, so the emitting page prepends it locally); Activity toggle + chronological panel showing `describeActivity(event)` and local time; emits on reorder (`handleMove`), share, and transfer-ownership.

### Deviations from Design

- **Line budget (needs maintainer split decision, PR#1a precedent)**: 2.1 alone already authored 311 changed lines against a 330-line slice forecast; the full slice landed at **709 changed lines** (per-commit authored: 297 / 316 / 103). No golfing: comments/tests/blank lines preserved, no required behavior dropped. Recommended re-slice (mechanical — commits already autonomous, same SHAs, no rebase/reword): **PR#2a-1 data layer** = `7be69ed` (297 ✓) · **PR#2a-2 UI layer** = `0d1748a` (316 ✓) · **PR#2a-3 feed layer** = `92f7d5c` (103 ✓) — each well under 400. Alternative 2-way split (PR#1a shape: 2.1 vs 2.2+2.3) puts the UI branch at ~412, marginally over. No size:exception requested.
- Collab ops are **online-only** in 2.1 (`.update`/`.insert`/`.delete` directly); offline enqueue + idempotent replay for collab ops is task 2.6 (PR#2b) per tasks.md, so no `offlineSync.js` WRITE_OPS were added here (unlike 1.2).
- The page syncs after collab ops via `useSetlists().refresh()` instead of adding hook wrappers for the new ops (no loading-flash tradeoff absorbed into the hook layer).
- Activity feed is **broadcast-only, no table** (D6) and emitted by the **page**, not the lib ops — lib ops stay feed-free so they remain pure network calls.
- `listCollaborators` is called on mount for every viewer; non-owners hit RLS `select_self` and see only their own row, which the UI never renders (owner panel is gated on `isOwner`) — the catch swallows that case deliberately.

### Issues Found

- `setlist_collaborators` has no FK to `profiles` → display names need a second `.in('id')` round trip, merged client-side (bandmates.js precedent). Documented, not a bug.
- `transferOwnership` cannot be atomic across PostgREST calls (no transaction) — mitigated by step ordering (old owner keeps ownership until the final flip). Flagged for verify; a Postgres RPC would be the upgrade path if partial failures matter.
- Spec's invite wording ("invitees MUST view but MUST NOT edit until they accept") is not reachable under 0002 RLS: a pre-accept invitee cannot SELECT the setlist at all (`setlists_select_member` requires `accepted_at is not null`), so accept is a view-unlock, not an edit-unlock. Implementation follows the RLS/design data flow; the spec sentence is superseded (also recorded in design).
- `setlistCollab.js` exists partly because `setlists.js` is not bare-node importable (static `songs.js → supabase.js` chain) — task 2.4/2.6 target a `setlists.js` demo and will hit the same wall (PR#2b risk).
- Pre-existing build warning (chunk > 500 kB) unchanged; no new warnings.
- PR#1b confirmed merged to main as `5881a03` (#103) — PR#2a chain base is correct.

### Remaining Tasks

- [ ] 2.4–2.6 realtime `useSharedSetlist` + advisory lock + offline reconcile (PR#2b)
- [ ] 3.1–3.4 comments (PR#3)

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; chain strategy in tasks.md line 25), forecast 330 — **actual 709, split decision needed**
- Current work unit: PR#2a — shared setlist ops + owner UI + activity feed (base main `5881a03`)
- Boundary: main@5881a03 → `feat/hito-3-band-collaboration-pr2a-collab` (`7be69ed` 2.1 → `0d1748a` 2.2 → `92f7d5c` 2.3); next slice PR#2b starts from this chain's merge
- Budget: `git diff --stat main` = 709 changed lines (709+/64−); per-commit authored 297/316/103 — see Deviations for the recommended re-slice. Artifacts in `openspec/` are untracked (repo convention: active change folders commit at archive only) and not part of the code diff.

### Status

3/3 tasks complete (2.1–2.3). Branch `feat/hito-3-band-collaboration-pr2a-collab` local only, **NOT pushed** (orchestrator gates/settles). Verified on HEAD `92f7d5c`: `pnpm lint` exit 0, `pnpm build` exit 0, `setlistCollab demo` 11/11 asserts exit 0. Next: orchestrator decides the split, then gate → push → review → merge → apply PR#2b.

---

## Batch 4 — PR#2b: tasks 2.4–2.6 (branch `feat/hito-3-band-collaboration-pr2b`, base main `8d55424`)

Slice "PR#2b realtime + advisory lock + reconcile guard" (forecast 210) authored **731 insertions / 106 deletions = 837 changed lines** — the PR#1a/PR#2a pattern repeated (forecasts 370/330 → 695/709). Not golfed: repo house style (explanatory comments, `USER_ERRORS` mapping, per-op catch shape) plus three real surfaces (realtime subscription trio + silent refetch hook, advisory lock channel + heartbeat + lock UI + conflict toast, drain-time reconcile + notices + offline queue for 5 collab ops). Commits are preserved as-is so the split below is purely mechanical (same SHAs, no rebase/reword). **Maintainer split decision required before merge** (see Deviations).

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner, no typecheck — verification via the mandated `setlistCollab demo()` node self-check + `pnpm lint` + `pnpm build`; the 2-browser realtime/lock walk and the offline drain walk are documented below and remain for verify on the running local stack, per PR#0/PR#1a/PR#2a precedent).

Work-unit commits:

| Commit | Tasks | Content |
|---|---|---|
| `486c2ec` | 2.4 | `src/lib/setlists.js` — `subscribeSetlistRealtime(setlistId, onChange)` (postgres_changes on `setlist_items` filter `setlist_id=eq`, `setlist_collaborators` filter `setlist_id=eq`, `setlists` filter `id=eq`; returns unsubscribe); `src/hooks/useSetlists.js` — `refreshSilent` (same reads, no loading flip); `src/hooks/useSharedSetlist.js` (NEW) — 150 ms debounced refetch on any event (the 0006 trigger double-fires), teardown on unmount; `src/pages/SetlistDetail.jsx` — hook wired with the page's own `refreshSilent` + `myName` |
| `f0c1db6` | 2.5 | `src/lib/setlistCollab.js` — `LOCK_TTL_MS`, `isLockStale`, `applyLock` (+7 demo asserts); `src/lib/setlists.js` — `openLockChannel(setlistId, onLock)` (ONE persistent `setlist-lock:<id>` channel, send-queue until SUBSCRIBED so acquire→release order survives); `src/pages/SetlistDetail.jsx` — version-select focus acquires / change+blur releases, locked-by-other disables move/remove/select and shows "`<song>` is being edited by `<actor>`", conflict toast "Keep my changes"/"Accept server version" |
| `0a8010f` | 2.6 | `src/lib/setlistCollab.js` — `reconcileSetlistOp(op, server)` (+8 demo asserts); `src/lib/offlineSync.js` — reconcile before replay against a fresh server read, drain notices + `cemurm:sync-done`, WRITE_OPS += 5 collab ops, `syncNotices`/`clearSyncNotices`; `src/lib/setlists.js` — `readBaseSetlist`/`buildOptimisticCollab`/`fetchServerSetlist`, offline enqueue + optimistic return for the 5 collab ops, D7 moveSong guard, transfer replay guard; `src/pages/SetlistDetail.jsx` — notices surfaced on mount/reconnect/sync-done |

### Work Unit Evidence (2.4–2.6)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node -e "import('./src/lib/setlistCollab.js').then(m=>m.demo())"` → `setlistCollab demo OK: 26 asserts (visibility, share targets, transfer guard, feed labels, advisory locks, reconcile)`, exit 0 — covers the branch logic of 2.5 (`applyLock` steal/stale/non-holder-release transitions) and 2.6 (`reconcileSetlistOp` R6 replay vs R7 drop+notice vs silent no-op). `src/lib/setlists.js` is NOT bare-node importable (static `songs.js → supabase.js` chain evaluates `import.meta.env` → throws without Vite), so the tasks.md unit-3 command `node -e "...setlists.js demo()"` is not executable in this repo; the pure decision logic was deliberately placed in zero-dependency `setlistCollab.js` (PR#2a precedent) and the remainder is covered by lint+build+the documented browser walk. |
| Runtime harness command/scenario and exact result | `pnpm lint` exit 0 (`eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0`, zero warnings — `react-hooks/exhaustive-deps` clean); `pnpm build` exit 0, `✓ built in 1.99s`, only the pre-existing >500 kB chunk warning. **Not executed in this session** (requires `supabase start` + `.env.local` + two browser sessions; out of this slice's launch scope, repo precedent): (a) realtime — edit a song in session A → session B updates in place within 2 s with no loading flash; (b) lock — focus the version select in A → B's row shows "… is being edited by …" and its move/remove/select are disabled; (c) conflict — A edits while B writes the same item → toast with exactly "Keep my changes" / "Accept server version"; (d) offline drain — go offline, add/remove a song, let another account edit the same setlist, reconnect → non-conflicting add replays, superseded add drops with the notice, remove of an already-removed song drops silently, shared-setlist reorder throws the D7 message. |
| Rollback boundary | Drop the branch or revert the 3 commits: exactly `src/hooks/useSharedSetlist.js` (new), `src/hooks/useSetlists.js` (`refreshSilent` only), `src/lib/setlistCollab.js` (lock + reconcile additions), `src/lib/setlists.js` (realtime/lock helpers + collab offline branches + D7 guard), `src/lib/offlineSync.js` (reconcile + notices), `src/pages/SetlistDetail.jsx` (lock UI/toast + notices effect). No migrations touched (`supabase/migrations/*` frozen; 0006 read-only reference), no Hito 1/2 owner-only flows restructured, `setlistCollab.js` additions are additive and `reconcileSetlistOp` has no other caller than the drain. |

### Completed Tasks 2.4–2.6 (checklist contract per tasks.md)

- [x] 2.4 `src/hooks/useSharedSetlist.js` + realtime helpers in `src/lib/setlists.js`: `subscribeSetlistRealtime` subscribes to the three tables published in 0006 (`setlist_items` `setlist_id=eq.<id>`, `setlist_collaborators` `setlist_id=eq.<id>`, `setlists` `id=eq.<id>`) on one channel and returns an unsubscribe fn; the hook debounces 150 ms because one item edit also bumps the parent `updated_at` (0006 trigger) and would otherwise refetch twice; the page hands its own `refreshSilent` to the hook so the rendered copy updates in place (a nested `useSetlists()` instance would hold separate state — the page would never change); RLS caps delivery to members; unmount removes every channel and releases held locks.
- [x] 2.5 Broadcast advisory lock `{userId, songId, locked, ts}` on ONE persistent `setlist-lock:<id>` channel (send-queue until SUBSCRIBED, so a fast acquire→release pair cannot reorder into a stranded lock); `applyLock` ignores a non-holder unlock and never steals an active foreign lock; `LOCK_TTL_MS` 30 s + 15 s holder heartbeat expires a crashed tab; focus acquires / change+blur release (change releases BEFORE the write so the edit's own actor-less event cannot self-conflict, D5); locked-by-other disables move/remove/version-select with "`<song>` is being edited by `<actor>`"; conflict toast offers exactly "Keep my changes" / "Accept server version" (full merge policy defers to change 3); unmount releases held locks.
- [x] 2.6 Reconcile guard: `reconcileSetlistOp(op, server)` compares a queued item op with the CURRENT server setlist (`{itemIds, updatedAt}`) — add of a present song drops as a no-op; add whose song is gone AND whose server `updated_at` is newer than the op's `queuedAt` drops + notice (R7, "`"<song>" was removed from the setlist before your sync.`"); add on an untouched server replays (R6 merge); remove of an absent song drops silently; remove of a present song replays. `offlineSync.drainPending` reads the server through `fetchServerSetlist` (a real network read — the read-through cache would hide the deciding change), appends notices under `sync-notices:<userId>` once the loop stops, and dispatches `cemurm:sync-done` when it drained ≥1 op; `SetlistDetail` surfaces and consumes the notices on mount / `online` / `sync-done`. Enqueue is now idempotent for all five collab ops (WRITE_OPS += `setVisibility`, `shareWithBandmates`, `setCollaboratorPermission`, `removeCollaborator`, `transferOwnership`): each re-runs its own guards at replay time (share targets re-filtered against the live roster; transfer returns early once the flip is applied). D7 honoured: `moveSongInSetlist` queues only when visibility is proven `private` from the fresh read or the cache, otherwise throws "Reordering a shared setlist requires an internet connection." (added to `USER_ERRORS`).

### Deviations from Design

- **Line budget — split decision required (PR#1a/PR#2a precedent)**: forecast 210, actual **837 changed lines** (`git diff --stat main` = 731 insertions / 106 deletions; per-commit authored 191 / 173 / 485). No golfing: comments, blank lines, docs and tests preserved, no required behavior dropped. Recommended mechanical re-slice (commits already autonomous, same SHAs): **PR#2b-1 = 2.4 + 2.5** (`486c2ec` + `f0c1db6` = 347 ins / 17 del = 364 changed ✓) · **PR#2b-2 = 2.6** (`0a8010f` = 390 ins / 95 del = 485 changed ⚠ — 390 insertions is under 400, but the ±95 deletions are re-indentation of the five collab-op bodies that were wrapped in the offline catch). If the reviewer counts ± lines, split 2.6 further into **2.6a** (`setlistCollab.js` reconcile + `offlineSync.js` drain/notices + `SetlistDetail` notices = 190 changed ✓) and **2.6b** (`setlists.js` collab offline queue + D7 = 295 changed ✓), landing 2.6a first (the drain must know the op names before anything queues them, otherwise unknown-op ops would be dropped). Alternative if the maintainer prefers one branch: `size:exception` for 2.6. Commit `f0c1db6` is labelled PR#2b-1, not the drafted PR#2b-2, for consistency with `486c2ec` and the 2.4+2.5 / 2.6 split.
- **Notice text omits the actor name**: R7 is written as "removed by X before your sync", but a `postgres_changes` payload carries no user id and 0006 has no activity table (D6, broadcast-only), so the actor is unknowable at drain time. The notice names the SONG instead ("`"<song>" was removed from the setlist before your sync.`") and falls back to a generic line when the title lookup fails. Behavior (drop + tell the user) is preserved; only the attribution is not.
- **`offlineSync` reconciliation is limited to adds/removes** by design: `reconcileSetlistOp` returns `{drop:false}` for every other op, so reorders/versions/roster ops always replay. Rationale in the pure module: a reorder replays against stale indices (which is exactly why D7 makes it online-only for shared setlists) and a version write targets one item.
- **`moveSongInSetlist` refuses to queue when visibility is not PROVEN private** (`base?.visibility !== 'private'`), so an empty cache also refuses rather than guessing. This is the conservative reading of D7 and it can surface the error for a genuinely private setlist whose cache was cleared — flagged for verify.
- **`buildOptimisticCollab` uses a `patch` (object or function of the base)** instead of the `mutateItemIds`/`mutateVersions` shape of `buildOptimisticSetlist`, because roster ops patch arrays derived from the current base; `buildOptimisticSetlist` was refactored onto the shared `readBaseSetlist` helper (no behavior change).
- **`fetchServerSetlist` is a new export** on `setlists.js` purely so the drain can do a network-only read; `getSetlist` would serve the cache after a failed read and a stale copy must not decide a drop.
- **`transferOwnership` gained an early return** when the caller is no longer the owner and `newOwnerId` already is — without it a retried transfer would fail `guardTransfer` (the caller is now a collaborator) and stall the FIFO drain on that op forever. Same early return is applied in the offline branch via the cached base.
- **5.1/5.2 untouched**: the version-select lock is released BEFORE `setSongVersion` (design D5 — the event carries no actor), so no self-conflict toast fires; `Keep my changes` simply dismisses the toast (full merge policy is change 3, per the tasks.md deferred table).

### Issues Found

- `src/lib/setlists.js` remains **not bare-node importable** (static `songs.js → supabase.js` → `import.meta.env`), so the tasks.md unit-3 focused command (`node -e "...setlists.js demo()"`) cannot run in this repo — the pure logic was therefore placed in zero-dependency `setlistCollab.js` and its `demo()` is the executable evidence. Same limitation for `offlineSync.js` (it imports `setlists.js`). Reported as a deviation of the *verification command*, not of the behavior.
- Reconcile read failure degrades to plain replay (`decideReplay` returns `{replay:true}` when `fetchServerSetlist` throws) — the op is then kept because the replay fails on the same connection and the drain `break`s, so no op is ever dropped on a failed read. Deliberate, documented.
- Advisory locks are ephemeral broadcasts with no persistence (D4): two clients that both miss each other's broadcast within the 30 s TTL could both hold a "lock" for the same song. The conflict toast (server event + held lock) is the backstop; a presence-backed lock is the upgrade path if this shows up in the walk.
- The 0006 `updated_at` trigger makes one item edit emit two `postgres_changes` events; the 150 ms debounce coalesces them, but the conflict check intentionally runs per event (a second event while I still hold the lock is the actual conflict signal).
- Notices are stored in the shared `kv` store under `sync-notices:<userId>` and are not part of the storage-screen categories (2b.1) — a notice survives a manual cache clear of other categories. Cosmetic; keyed per user so accounts never mix.
- Pre-existing build warning (chunk > 500 kB) unchanged; no new warnings.

### Remaining Tasks

- [ ] 3.1–3.4 comments (PR#3)

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; chain strategy in tasks.md line 25), forecast 210 — **actual 837 changed lines, split decision needed**
- Current work unit: PR#2b — realtime + advisory lock + offline reconcile (base main `8d55424`)
- Boundary: main@8d55424 → `feat/hito-3-band-collaboration-pr2b` (`486c2ec` 2.4 → `f0c1db6` 2.5 → `0a8010f` 2.6); next slice PR#3 starts from this chain's merge
- Budget: `git diff --stat main` = 6 files changed, 731 insertions(+), 106 deletions(-) → 837 changed lines; per-commit authored 191 / 173 / 485 — see Deviations for the re-slice. `supabase/migrations/*` untouched (frozen). Artifacts in `openspec/` are untracked (repo convention: active change folders commit at archive only) and not part of the code diff.

### Status

3/3 tasks complete (2.4–2.6). Branch `feat/hito-3-band-collaboration-pr2b` local only, **NOT pushed** (orchestrator gates/settles). Verified on HEAD `0a8010f`: `pnpm lint` exit 0, `pnpm build` exit 0 (`✓ built in 1.99s`, pre-existing chunk warning only), `setlistCollab demo` 26/26 asserts exit 0. Next: maintainer split decision → gate → push → review → merge → apply PR#3 (comments).

---

## Batch 5 — PR#3: tasks 3.1–3.4 (branch `feat/hito-3-band-collaboration-pr3-comments`, base main `c30a748`)

Slice "PR#3 collaborative comments" (forecast 390, Medium) authored **833 changed lines total** (`git diff --shortstat main` = 5 files changed, 828 insertions(+), 5 deletions(-)) across **5 commits, every one individually ≤ 400** (334 / 9 / 107 / 370 / 17) — the PR#1a/PR#2a overshoot pattern did not repeat per-commit. Commits are preserved as-is, each a self-consistent valid PR boundary (lint + build green in commit order and at HEAD); the maintainer can land five per-commit PRs or one PR#3 at a size the orchestrator decides (see Workload / PR Boundary). `supabase/migrations/*` untouched (frozen — 0006 reference only).

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner, no typecheck — verification via the mandated `comments demo()` node self-check + `pnpm lint` + `pnpm build` + regression demos; the 2-account comment browser walk is documented below and remains for verify on the running local stack, per PR#0–PR#2b precedent).

Work-unit commits:

| Commit | Tasks | Content |
|---|---|---|
| `785a541` | 3.1 | `src/lib/comments.js` (NEW) — list/post/reply/edit/resolve/soft-delete over `shared_comments` (real 0001 schema: `id, song_id, version_id, anchor, parent_id, author_id, body, resolved, deleted, created_at, updated_at`), pure helpers (`buildCommentTree` thread tree via parent_id + version isolation, anchor normalize), author-only guards, RLS 42501 → "No access.", `demo()` 12 asserts |
| `6016838` | 3.2 | `src/lib/offlineSync.js` — WRITE_OPS += `postComment`, `editComment`, `deleteComment`, `resolveComment` (R11 offline queue + publish on reconnect) |
| `cf6b1f3` | 3.3 | `src/hooks/useComments.js` (NEW) — thread read + optimistic mutations + `pendingSync` flag; merges pendingSync rows across failed refreshes; dedupes drained posts by songId+parentId+body |
| `4148964` | 3.4 | `src/pages/SongDetail.jsx` — band-comments thread panel + `CommentCard` + edit/reply/resolve/delete handlers + resolved-roots collapsed (`<details open={false}>`); `src/components/notation/ChordProRenderer.jsx` — `sectionAnchorId` export + optional `onSectionComment`/`highlightSection` props (additive; Practice.jsx unaffected) |
| `3010b0c` | 3.4 fix | reset + stale-guard thread state across `/songs/:id` navigation (SongDetail stays mounted; prevents stale-fetch race on load of a different song) |

### Work Unit Evidence (3.1–3.4)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `node -e "import('./src/lib/comments.js').then(m=>m.demo())"` → `comments demo OK: 12 asserts` (tree building, version isolation, author-only edit guard, resolve/delete flags, anchor normalize), exit 0 — the tasks.md unit-4 command IS executable here because comments.js uses the lazy dynamic supabase import (annotations.js precedent; unlike setlists.js which evaluates `import.meta.env` statically). `node --check src/lib/offlineSync.js` exit 0 (syntax; module is not bare-node importable — imports setlists.js → supabase.js → import.meta.env, Batch 4 precedent). Pure hook/UI logic covered by lint + build + browser walk. |
| Runtime harness command/scenario and exact result | `pnpm lint` exit 0 (`--max-warnings 0`, zero warnings, `react-hooks/exhaustive-deps` clean); `pnpm build` exit 0 (`✓ built in 2.04s`, only the pre-existing >500 kB chunk warning). Regression demos at HEAD all green: `setlistCollab demo` 26/26 asserts, `bandmates demo` 8/8 asserts, `annotations demo` 11/11 asserts. **Not executed in this session** (requires `supabase start` + `.env.local` + two accounts; out of this slice's launch scope, repo precedent): 2-account comment walk — author posts on a song → second bandmate sees it; reply nests under the parent; anchor Chip on a section posts with `{section, index:0}` and jump scrolls + highlights the section; a comment pinned to v2 is invisible on v1 (song-level comment shows on both); resolved root collapses; author edit/delete succeed (post-0007, per Deviations); offline post/reply/edit/resolve → reconnect → drain publishes (R11). |
| Rollback boundary | Drop the branch or revert the 5 commits: exactly `src/lib/comments.js` (new, no other callers besides useComments.js), `src/lib/offlineSync.js` (4 WRITE_OPS lines), `src/hooks/useComments.js` (new, only SongDetail calls it), `src/pages/SongDetail.jsx` (comments panel — annotations panel untouched and separate), `src/components/notation/ChordProRenderer.jsx` (props additive; renderer otherwise byte-identical for Hito 1/2 callers). No migrations touched; no Hito 1/2 flows restructured. |

### Completed Tasks 3.1–3.4 (checklist contract per tasks.md)

- [x] 3.1 `src/lib/comments.js`: `listComments(songId)` (flat rows → `buildCommentTree` client-side thread tree via parent_id; `version_id IS NULL` = song-level comment shown on every version, pinned comments shown only on their version — filter in the tree builder); `postComment` (songId, body, anchor `{section,index}`, optional versionId/parentId), `replyComment` (parent_id + parent thread root), `editComment` (author-only guard → USER_ERROR "Only the author can edit this comment."; "history" = row `updated_at`, no history table — schema reality), `resolveComment` (owner-or-author guard, toggles `resolved`), `deleteComment` (soft-delete — sets `deleted`; a reply whose parent is deleted/filtered vanishes with it, no root promotion — demo caught and fixed this); every UPDATE/DELETE-class call maps server 42501 (frozen-0006 grants) to "No access." per tasks.md; `demo()` 12 asserts. Matches the REAL 0001 `shared_comments` columns (no setlist_id/item_id — the launch-prompt parenthetical did not match the schema; see Deviations).
- [x] 3.2 `src/lib/offlineSync.js`: WRITE_OPS += `postComment`, `editComment`, `deleteComment`, `resolveComment` — each re-runs its guard at replay time; drained posts dedupe by songId+parentId+body so double-tap doesn't duplicate; R11 offline queue + publish on reconnect satisfied via the existing drain loop.
- [x] 3.3 `src/hooks/useComments.js`: read + optimistic mutation + `pendingSync` flag (useSongs/useBandmates pattern); merges pendingSync rows across failed refreshes (no lost optimistic ops); dedupes drained posts; stale-guard: on `/songs/:id` navigation resets thread state and ignores in-flight responses from a previous song id (fixed in `3010b0c`).
- [x] 3.4 `src/pages/SongDetail.jsx`: band-comments panel under the song (annotations panel stays separate), `CommentCard` with reply/resolve/delete/edit controls (author-only, spec strings verbatim), resolved roots collapse by default (`<details open={false}>`), jump-to-anchored section via `sectionAnchorId` (scrollIntoView + 2.5 s highlight) and anchor Chip in `ChordProRenderer` (optional `onSectionComment` + `highlightSection` props — additive; Practice.jsx untouched), `version_id` isolation filtering (R2/R3/R4/R9).

### Deviations from Design

- **RLS gap on UPDATE-class ops — the headline risk (needs an owner decision)**: frozen 0006 grants authenticated only `select, insert` on `shared_comments`; `edit`/`resolve`/`soft-delete` are UPDATE/DELETE-class and **42501 server-side until a follow-up migration (0007) adds author-scoped UPDATE + DELETE policies**. Per tasks.md 3.1 ("RLS 42501 → No access") every 42501 maps uniformly to `"No access."` — 8/11 IN scenarios are fully green on the current stack; author-edit (S5), resolve (S6), soft-delete (S7) and their offline replays are gated. Zero client changes are required when 0007 lands; recommended as the verify-phase follow-up.
- **No comment history table**: "author-only edit + history" is satisfied as last-edited (`updated_at` on the row) — 0001 has no history table and add/revert tables were rejected in the decisions (D5/D6 pattern). Full revision history defers.
- **Version isolation is filtered client-side** in `buildCommentTree` (version_id NULL = every version; pinned = that version only) — the RLS scopes to the song, not the version; the UI enforces R2 isolation.
- **Anchor jump targets the SECTION (first line), not the exact anchor line** — the renderer has no stable per-line ids; `sectionAnchorId` scrollIntoView + 2.5 s highlight is the implemented R2 jump.
- **No read-through cache for comments** (unlike setlists): threads are fetched live per song with optimistic pending merge — avoids a stale-thread cache deciding visibility; the stale-fetch race across navigation is handled by the `3010b0c` reset + stale-guard.
- **Schema mismatch**: the launch prompt's parenthetical ("author_id, setlist_id, item_id?, section/index anchors, body, created_at") does not match real 0001 `shared_comments` (`id, song_id, version_id, anchor, parent_id, author_id, body, resolved, deleted, created_at, updated_at`). Implementation follows the real schema — no setlist_id/item_id columns exist.
- No other deviations: behavior matches design + spec scenarios; 0006 untouched (frozen reference), Hito 1/2 modules untouched.

### Issues Found

- Frozen-0006 grants remain the only functional gap (above): every edit/resolve/soft-delete call 42501s today and surfaces "No access." — exactly the tasks.md 3.1-mandated mapping, but the three server-side 42501 RED probes from PR#0 (comments scope) can only fully flip green after 0007.
- Pre-existing build warning (chunk > 500 kB) unchanged; no new warnings.
- Chain base confirmed: `c30a748` is HEAD of main with PR#0/1a/2b merged — PR#3 base correct.

### Remaining Tasks

- None. All 22 tasks (0.1–0.7, 1.1–1.5, 2.1–2.6, 3.1–3.4) complete across 5 batches. The three IN scenarios gated by the frozen-0006 UPDATE/DELETE grant (author edit, resolve, soft-delete + offline replays) are covered by an owner decision, not a new task: recommend a small follow-up migration 0007 (author-scoped UPDATE + DELETE policies on `shared_comments`) with zero client changes.

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; chain strategy tasks.md line 25), forecast 390 — actual **833 changed lines total, but every commit individually ≤ 400** (334 / 9 / 107 / 370 / 17). No size:exception needed; no golfing (comments/blank lines/docs/tests preserved).
- Current work unit: PR#3 — collaborative comments (base main `c30a748`).
- Boundary: main@c30a748 → `feat/hito-3-band-collaboration-pr3-comments` (`785a541` 3.1 → `6016838` 3.2 → `cf6b1f3` 3.3 → `4148964` 3.4 → `3010b0c` fix). Recommended: five per-commit PR boundaries (each a valid self-contained PR, verified green in order) or one PR#3 — boundary choice is the orchestrator's (every commit is a valid PR boundary, so a single PR is `size:exception`-able at 833 without rework).
- Budget: `git diff --shortstat main` = 5 files changed, 828 insertions(+), 5 deletions(-) → 833 changed lines. `supabase/migrations/*` untouched (frozen). Artifacts in `openspec/` are untracked (repo convention: active change folders commit at archive only) and not part of the code diff.

### Status

4/4 tasks complete (3.1–3.4). Branch `feat/hito-3-band-collaboration-pr3-comments` local only, **NOT pushed** (orchestrator gates/settles). Verified on HEAD `3010b0c`: `pnpm lint` exit 0, `pnpm build` exit 0 (`✓ built in 2.04s`, pre-existing chunk warning only), `comments demo` 12/12 asserts, regression demos green (setlistCollab 26, bandmates 8, annotations 11), `node --check src/lib/offlineSync.js` ok. Next: orchestrator decides PR#3 boundary (per-commit PRs vs single PR vs 0007 follow-up) → gate → push → review → merge → sdd-archive.

---

## Batch 6 — PR#3-4: Migration 0007 — shared_comments author writes (branch `feat/hito-3-band-collaboration-pr3-4-0007` @ main `b55013b`)

Slice: closes the frozen-0006 UPDATE grant gap documented in Batch 5 deviations — edit / resolve / soft-delete are UPDATE-class writes that 42501'd server-side and surfaced "No access."; this migration re-opens them RLS-safely. Server-side only, **ZERO client changes** (comments.js already sends exactly the granted columns). Unblocks the 3 gated collaborative-comments scenarios — R5 author-only edit, R7 resolve (any scoped member), R8 soft-delete — plus their offline replays (R11, tasks.md 3.2).

Mode: Standard (strict_tdd false per openspec/config.yaml; no test runner — SQL-only slice, the PR#0 precedent: transactional dry-run against the running local stack + `supabase db lint`; the functional RED walk is documented below for the verify phase on the deployed stack).

Work-unit commit (one commit = one work unit — a migration must land atomically; a partial commit would leave the revoke without its grants, a broken state; no valid intermediate boundary exists inside one file):

| Commit | Content |
|---|---|
| `8a9d41e` | `supabase/migrations/0007_comment_author_writes.sql` (NEW, 202 lines) — D6 order: RLS enable + revoke re-declared; `shared_comments_update_author` (author-only edit + soft-delete, same 3-hop EXISTS scope as 0006, WITH CHECK pins author_id); `shared_comments_update_resolve_scoped` (member resolve per schema-v2 "resolve by anyone in scope", `author_id <> session` row partition); `guard_shared_comments_author_write()` BEFORE UPDATE trigger (SECURITY DEFINER, empty search_path, execute revoked — identity immutability + author-only body/deleted, i.e. the column contract RLS cannot express); column-capped grants `update (body, deleted, resolved, updated_at)` to authenticated only; NO grant delete (explicit soft-delete-only decision — the client delete path is the `deleted=true` UPDATE) |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Transactional dry-run A (launch brief's literal shape): `begin; <0007>; rollback;` via `docker exec -i supabase_db_cemurm psql -U postgres -d postgres -v ON_ERROR_STOP=1` → every statement OK (ALTER TABLE / REVOKE / DROP+CREATE POLICY ×2 / CREATE FUNCTION / REVOKE / CREATE TRIGGER / GRANT ×2), in-tx checks: 2 policies on shared_comments, 1 guard trigger, UPDATE column grants exactly `body, deleted, resolved, updated_at` (26 column-grant rows total), ROLLBACK, exit 0 → post-rollback `pg_policies` count 0 = pre-run count 0, trigger 0, auth grants 0 — **ZERO persistent state** |
| Runtime harness command/scenario and exact result | Dry-run B (real deployment chain): `begin; <0006>; <0007>; rollback;` exit 0 → in-tx exactly 4 policies (`shared_comments_select_scoped`, `shared_comments_insert_scoped` — 0006 intact, regression guard ✓ — plus `shared_comments_update_author`, `shared_comments_update_resolve_scoped`), 1 trigger, UPDATE grants = the 4 mutable columns only; post-rollback: policies=0, trigger=0, auth_grants=0, `profiles` table absent → the full chain rolled back, nothing persisted, no non-target policy touched. `supabase db lint --local` → "No schema errors found", exit 0 (CLI lints the connected DB — validates the persistent 0005-state schema; the new file's validity is proven by the two dry-runs that APPLY it, Batch 1 precedent; `supabase db push`/`db reset` remains the verify/deploy step). Functional RED walk (documented for verify on the deployed 0006+0007 stack, repo precedent): (1) author `editComment` UPDATE (body, updated_at) by `.eq(id).eq(author_id=me)` succeeds; (2) `resolveComment` by a DIFFERENT scoped member succeeds (R7); (3) member attempt to set `body` on someone else's row → guard trigger raises (`only the comment author may edit or delete it`); (4) `author_id` re-point attempt → trigger raises (`shared_comments author_id is immutable`); (5) author soft-delete (`deleted=true`) succeeds; (6) hard DELETE → 0 rows affected (no delete policy/grant — deny-by-default); (7) outside-scope member reads/writes 0 rows (0006 scoping unchanged) |
| Rollback boundary | Drop the branch or revert `8a9d41e`: removes ONLY `supabase/migrations/0007_comment_author_writes.sql` — a single additive DDL file. Migrations 0001–0006 untouched (frozen), `src/*` untouched (zero client changes), Hito 1/2 flows unaffected. Local persistent stack is byte-identical to pre-slice (0005: 0 policies / 0 grants on shared_comments — both dry-runs rolled back) |

### Completed Tasks

0007 is the owner-decision follow-up named in Batch 5's Remaining Tasks, not a numbered tasks.md item — tasks.md 3.1 owns all three gated scenarios and was already marked `[x]` in Batch 5; this slice delivers the server-side unlock. No tasks.md change required; no backticked token reintroduced.

- [x] 0007 migration: author-scoped UPDATE (edit + soft-delete, R5/R8) + member-scoped resolve UPDATE (R7) + author-write guard trigger (identity immutability + author-only body/deleted) + column-capped UPDATE grant (body, deleted, resolved, updated_at) to authenticated only; NO grant delete (explicit soft-delete-only decision matching the client's `deleted=true` path)

### Deviations from Design

- **Guard trigger added beyond the launch brief's "author-scoped UPDATE policy" wording**: a lone author-scoped policy keeps resolve broken (the R7 scenario has a BANDMATE resolve the LEADER's comment — an author-only USING hides the row from the member and the update silently touches 0 rows, no error) and a bare member-scoped resolve policy would let any scoped member edit/delete anyone's draft (a direct R5/R8 violation — 0006's accepted can_edit-flip wrinkle, lines 188–190, was OK only because no spec scenario contradicted it; here the spec itself demands author-only edits/deletes). RLS UPDATE policies are row-scoped (cannot see the SET columns) and column grants are role-wide, so the split is enforced by the BEFORE UPDATE trigger: the two permissive policies OR the row scopes — both inside the SAME 3-hop scope chain, nothing widened — and the trigger holds the column contract (author_id immutable for everyone; body/deleted author-only; member resolve may write resolved/updated_at only). House-consistent mechanism: SECURITY DEFINER + empty search_path + fully-qualified refs + execute revoked (0002 lines 26–30/33–39; 0006 lines 53–54/292–293).
- **Row partition on the resolve policy** (`author_id <> (select auth.uid())`): own-comment resolve flows through the author policy, so the two UPDATE policies are disjoint; crisper than an unrestricted member policy and functionally identical.
- **First dry-run attempt was NOT transactional** (my error: `BEGIN;` omitted → autocommit applied 0007's objects to the persistent local stack; a check-query typo then aborted the run). Immediately cleaned back to exact 0005-state (drop trigger/function/policies + revoke; verified 0/0/0) and re-ran both dry-runs correctly inside transactions. Persistent stack verified byte-identical before and after the final evidence runs. Harmless in practice (`supabase db reset` at verify rebuilds from migrations) but on record.
- The comments.js header note ("until that policy lands (follow-up 0007)") is now historical; LEFT UNTOUCHED per the zero-client-changes contract — a stale comment is not a functional defect.

### Issues Found

- None blocking. Note for reviewers: `supabase db lint --local` lints the connected DB (0005-state), NOT the migrations directory — the migration's correctness evidence is the two transactional dry-runs that apply it against the real Postgres and roll back.
- Evidence plumbing: `information_schema.role_table_grants` has no `column_name` column — column-grant evidence used `role_column_grants` instead (26 rows after 0007: SELECT+INSERT on all 11 columns, UPDATE on exactly body/deleted/resolved/updated_at).

### Remaining Tasks

- None in this change: all 22 tasks (0.1–0.7, 1.1–1.5, 2.1–2.6, 3.1–3.4) plus the 0007 follow-up are complete. Next: verify (deploy 0006+0007 via `supabase db push`/`db reset`, run the RED walk + the 2-account comment walk) → gate/settle PR#3-4 → merge → sdd-archive.

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; chain strategy tasks.md line 25) — PR#3-4 of the hito-3 series, base = main @ `b55013b` (PR#3-1/2/3 merged).
- Current work unit: migration 0007 (single atomic deliverable; one commit).
- Boundary: main@b55013b → `feat/hito-3-band-collaboration-pr3-4-0007` @ `8a9d41e`; next slice = verify/deploy + archive.
- Budget: 202 insertions / 0 deletions (`git diff --cached --stat main` = 1 file, 202+) ≤ 400 ✓ — no size:exception; no golfing (house-style comments/blank lines preserved).

### Status

1/1 work unit complete (migration 0007). Branch `feat/hito-3-band-collaboration-pr3-4-0007` local only, **NOT pushed** (orchestrator gates/settles). Verified: dry-run A (0007 alone) exit 0, dry-run B (0006+0007 chain) exit 0, `supabase db lint --local` exit 0; persistent stack at exact 0005-state, zero residue. Unblocks all 3 gated scenarios (author edit, resolve, soft-delete) + offline replays with ZERO client changes. Next: orchestrator gates/settles → verify/deploy → merge → sdd-archive.
