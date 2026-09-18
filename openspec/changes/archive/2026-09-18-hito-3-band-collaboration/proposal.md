# Proposal: Hito 3 — Band Collaboration (bandmates + shared setlists + comments)

## Intent

Collaboration is impossible today: no searchable user identity (auth.users is unexposed to PostgREST), setlists are owner-only (`src/lib/setlists.js` queries filter `owner_id`), `bandmate_links`/`shared_comments` are deny-by-default gap tables (revoked in 0002, no policies since), and Realtime is unused. This is change 1 of 3 Hito 3 changes: bandmates (15 scn) + shared setlists (15 scn) + collaborative comments (13 scn) = **43 scenarios**.

## Scope

### In Scope
- **Migration 0006 (PR#0)** — order per 0004 precedent (RLS enable → revokes → policies → grants; initPlan `auth.uid()`; nested single-relation exists, no joins):
  - NEW `profiles` table (**DEVIATION**, see Decisions)
  - `bandmate_links` pair-scope RLS; `shared_comments` scope RLS (migration-first, stays even though triggers defer)
  - `setlist_collaborators` self-accept UPDATE policy (0002 granted owner-management only — invitee acceptance loop is broken today)
  - `alter publication supabase_realtime add table` → setlists, setlist_items, setlist_collaborators
- **Bandmates (PR#1)**: username/ID search via profiles, invite, accept/decline, list, remove; proximity-code offline flows **iff PR#1 ≤400** (`size:exception` otherwise).
- **Shared setlists (PR#2, B1/B2 split if >400)**: visibility, permissions, transfer/remove, Realtime WS subscription (member RLS), view-only badge, conflict toast = client advisory lock (schema-v2 §3 precedent, no DB row), offline queue merge (non-conflicting only).
- **Comments (PR#3)**: threads anchored `{section,index}` (personal_annotations convention), reply/resolve/soft-delete, author-only edit, RLS-scope enforcement (no-access → insert 42501).

### Out of Scope
- Notifications feed/preferences + comment/@mention triggers → **change 2** (shared_comments RLS skeleton stays in 0006).
- Collections → change 2. Song version history/duplicates → change 3. Conflict policy → change 3. Practice full surface → change 3. Music-notation → standalone. OS-push/quiet-hours/digest → deferred (in-app feed only).

**Named scenario deferrals**: bandmates S2 (email search — profiles column set has no email; default defer), S6–S9 + S13 (proximity, conditional on PR#1 budget); setlists S8 (merge-conflict screen) + S14 (revert) → change 3, S15 (change-notifications push) → change 2; comments S11 (notify bandmates) + S12 (@mention) → change 2.

## Capabilities

### New Capabilities
- `collaboration-bandmates`: profiles surface + search/invite/accept/decline/remove.
- `shared-setlist-collaboration`: visibility, roles, transfer, realtime, advisory lock, offline merge.
- `collaborative-comments`: threads, anchors, resolve/delete, scope enforcement.

### Modified Capabilities
- `row-level-security`: profiles self/read-for-search, bandmate_links pair scope, shared_comments arrangement scope, self-accept policy.

## Approach

Stacked PRs: `main ← PR#0 (0006) → PR#1 bandmates → PR#2 setlists → PR#3 comments`. Each ≤400 lines (review guard). Realtime publication migration-first (hosted + local `config.toml` — realtime `enabled = true`, verified).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0006_*.sql` | New | profiles + collab RLS + publication |
| `src/pages/Bandmates.jsx`, `src/lib/bandmates.js`, `src/lib/profiles.js`, `src/hooks/useBandmates.js` | New | search/invite/accept UI |
| `src/pages/SetlistDetail.jsx`, `src/lib/setlists.js`, `src/hooks/useSetlists.js` | Modified | visibility/permissions/realtime/lock/badge |
| `src/pages/SongDetail.jsx`, `src/lib/comments.js`, `src/hooks/useComments.js` | New/Mod | comment thread panel |
| `src/pages/Settings.jsx`, `src/App.jsx` | Modified | profile edit; `/bandmates` route |

## Decisions

**PROFILES** — NEW `profiles` (id→auth.users CASCADE, display_name, username UNIQUE nullable, instrument, avatar_url) + RLS (self CRUD; search-select limited cols for authenticated; trigger auto-creates on signup). **Documented deviation** from 48-table contract (`docs/database-schema-v2.md` models users as auth.users directly): auth.users is not client-queryable, so bandmate search needs a public identity surface; Supabase-standard pattern; adds a 49th DDL table. Visibility lives in `setlists.visibility` (`'private' | 'shared' | 'public'`; `org`/`branch` reserved → Hito 4). Roles: owner (`owner_id`) / can_edit (`can_edit` + accepted) / can_view (accepted, `can_edit=false`) — 0002 setlists UPDATE shape already gates writes (view-only PATCH → 42501). Activity feed: client-derivable from Realtime change events (actor/payload/timestamp); revert scenario deferred → change 3 (named delta-table candidate `setlist_activity` if spec rejects client-derivation).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RLS recursion (comment multi-hop scope) | Med | 0004 nested-exists shape, no joins → acyclic |
| Realtime data leak | Med | publication on RLS tables only; postgres_changes honors RLS |
| PR >400 | Med | proximity deferral; B1/B2 split |
| Offline merge ambiguities | Med | non-conflicting merges in; same-field → change 3 |

## Rollback Plan

- 0006: revert migration → collab surfaces 403; Hito 1/2 (songs/setlists owner flows) unaffected.
- Slices: revert merged PR individually; no data migration beyond 0006.

## Dependencies

Local Supabase stack (`supabase start`; realtime already enabled); `@supabase/supabase-js` 2.116 (realtime built-in); two seeded identities for RLS walk. No new npm deps.

## Success Criteria

- [ ] 43 scenarios mapped: 32 definite IN, 11 named deferrals, 5 conditional (proximity).
- [ ] Demo: two users see setlist edits <2s via Realtime; invite accept loop works; anchored comments render on the chart.
- [ ] `pnpm build` + `pnpm lint` pass; RLS walk with two identities; zero Hito 1/2 regression.