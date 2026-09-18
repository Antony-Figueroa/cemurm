# Design: Hito 3 — Band Collaboration (bandmates + shared setlists + comments)

## Technical Approach

Stacked PRs `main ← PR#0 (0006) → PR#1 bandmates → PR#2 shared setlists → PR#3 comments`, each ≤400 lines. Migration-first RLS follows the 0002/0004 precedent (RLS → revokes → policies → grants; initPlan guard; nested single-relation EXISTS, no joins). Data layers clone the `setlists.js` read-through + `enqueueOp` + optimistic `pendingSync` pattern. No `src/store/` exists → state stays in hooks (`useBandmates`/`useComments` new, `useSetlists` extended), no Zustand. Next migration = **0006**; realtime `enabled = true`, publication empty.

## Architecture Decisions

| # | Decision | Alternative | Chosen | Why |
|---|---|---|---|---|
| D1 | New `profiles` (49th table, documented deviation) | Query `auth.users` | `profiles` | `auth.users` is not PostgREST-exposed; search needs a public identity |
| D2 | `username text UNIQUE` **nullable** | `NOT NULL` | nullable | Signup trigger creates the row before a username exists; RLS spec says nullable (Open Q) |
| D3 | Publication on the 3 RLS tables | Logical replication | `alter publication supabase_realtime add table` | `postgres_changes` honors RLS per subscriber |
| D4 | Advisory lock = client **broadcast** | DB lock row | client-layer | schema-v2 §2.10 precedent |
| D5 | Activity feed = realtime **broadcast** `{actor, action, ts}` | `setlist_activity` table | broadcast (D6) | `postgres_changes` carries **no actor**. Ceiling: live-subscribed only; fallback `setlist_activity` |
| D6 | Offline collab: enqueue **idempotent** ops + reconcile guard | blind FIFO replay / block offline | enqueue + reconcile | Spec needs offline edit + merge; FIFO re-creates online-deleted rows |
| D7 | `moveSong` online-only for shared setlists | queue reorder | online-only | Replay uses stale indices → order corruption; S8 defers |
| D8 | Comment scope = nested EXISTS | joins | EXISTS | 0004 shape; acyclic via definer helper |

## Data Flow

```
Invite:  Bandmates → bandmates.js (profiles search) → bandmate_links pending
         → invitee: UPDATE status=active/declined (self-accept RLS)
Share:   SetlistDetail → visibility='shared' → setlist_collaborators rows
         → invitee accept (0006) → SELECT policy unlocks setlist/items
Edit:    write → setlist_items → bump setlists.updated_at (trigger)
         → postgres_changes → members refetch + broadcast {actor,action}
         └ offline: enqueueOp(tagged queuedAt) → reconcile vs server
           (server newer ⇒ drop op + "removed by X" notice); moveSong offline-blocked
Comments: SongDetail → comments.js → RLS (song→item→setlist→collab) → thread/{parent_id}
          anchor {section,index} via noteForLine; version_id pins version
```

## File Changes

| File | Action | Description |
|---|---|---|
| `supabase/migrations/0006_band_collaboration.sql` | Create | profiles + trigger; bandmate_links/invite_codes/shared_comments RLS; setlist_collaborators self-accept; `updated_at` trigger; publication |
| `src/lib/profiles.js`, `src/lib/bandmates.js`, `src/hooks/useBandmates.js` | Create | identity/search/invite lifecycle |
| `src/lib/setlists.js`, `src/hooks/useSetlists.js` | Modify | collab ops, permissions, realtime, advisory lock, offline reconcile |
| `src/lib/comments.js`, `src/hooks/useComments.js` | Create | thread CRUD/anchors/offline queue |
| `src/pages/Bandmates.jsx`, `src/pages/Settings.jsx`, `src/App.jsx` | New/Mod | `/bandmates` route, profile edit, nav |
| `src/pages/SetlistDetail.jsx`, `src/pages/SongDetail.jsx` | Modify | visibility/permissions/badge/lock/conflict toast; comment panel |
| `src/lib/offlineSync.js` | Modify | WRITE_OPS + reconcile |

## Interfaces / Contracts

```sql
-- 0006 setlist_collaborators invitee self-accept (owner policies unchanged)
create policy setlist_collaborators_update_self on public.setlist_collaborators
  for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- 0006 shared_comments scope (nested single-relation EXISTS, no joins)
using ((select auth.uid()) is not null and exists (
  select 1 from public.setlist_items i where i.song_id = public.shared_comments.song_id
    and exists (select 1 from public.setlists s where s.id = i.setlist_id and
      (s.owner_id = (select auth.uid()) or exists (select 1 from public.setlist_collaborators c
        where c.setlist_id = s.id and c.user_id = (select auth.uid()) and c.accepted_at is not null)))));
```
Realtime: `supabase.channel('setlist:'+id).on('postgres_changes',{event:'*',schema:'public',table:'setlist_items',filter:'setlist_id=eq.'+id},cb).subscribe()`; broadcast `edit-lock` / `activity`; teardown on unmount. `WRITE_OPS` gains `postComment`, `editComment`, `deleteComment`, `resolveComment`, `inviteBandmate`, `respondInvite`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | anchor match, reconcile drop rule, comment tree ordering | `demo()` asserts |
| Integration | RLS walk two identities: profiles columns, pair scope, comment 42501, self-accept, view-only PATCH 42501 | psql/Supabase SQL |
| E2E | invite→accept→share→realtime <2s→lock toast→comments | manual walk |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Additive DDL; no data migration. PR#0 gates (collab code 403s without 0006); rollback = revert merged PR, Hito 1/2 owner flows unaffected. Seed adds a second identity for the RLS walk.

## Open Questions

- [ ] **`username` NULL vs NOT NULL** — spec + proposal say nullable; task prompt said NOT NULL. Design follows the spec (nullable). Confirm.
- [ ] **Activity-feed actor** — no actor in `postgres_changes`; D5 uses a client broadcast channel (no cross-session history). Accept, or promote to `setlist_activity`?
- [ ] **`replica identity full`** on published tables — only if deletes must be RLS-filtered by non-PK columns.
