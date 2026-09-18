## Exploration: hito-3-band-collaboration — Bandmates, Shared Setlists, Collaborative Comments

Change 1 of 3 Hito 3 changes. Pre-proposal handoff confirmed by orchestrator (user decisions frozen — no re-interview). This file records the state and scenario boundaries sdd-propose consumed.

### Current State

- **No collab surface in `src/`**: zero references to bandmate/shared_comment/visibility; `src/lib/setlists.js` reads/writes are owner-scoped (`eq('owner_id', userId)`), `src/App.jsx` has no `/bandmates` route.
- **Data layer exists, RLS gaps**: 0001 defines `bandmate_links`, `shared_comments`, `invite_codes`, `setlist_collaborators`, `setlist_items` (48-table contract, verbatim). 0002 granted setlists/setlist_collaborators/setlist_items/personal_annotations to authenticated and revoked bandmate_links/shared_comments/invite_codes/notifications (deny-by-default gap tables).
- **0002 policy gap found**: `setlist_collaborators` UPDATE/INSERT/DELETE are owner-only (`private.session_owns_setlist`), SELECT self — the **invitee accept path (setting `accepted_at`) has no policy**; the join loop breaks at acceptance today.
- **Realtime**: `supabase/config.toml` `[realtime] enabled = true`; `publication supabase_realtime` not yet populated (no publication DDL in 0001–0005).
- **Precedents**: 0002 (revoke→policies→grants order, initPlan `(select auth.uid()) is not null`, `private.session_owns_setlist` recursion fix), 0004 (nested single-relation exists chains, no joins; `grant usage on schema private`), 0005 (`public.session_org_ids()` bridge — PGRST202 lesson: PostgREST exposes only config.toml schemas).
- **Anchor convention**: `personal_annotations.anchor` = structural `{section: name, index: lineIdx}` (0001 comment D4; `src/lib/annotations.js` `noteForLine`). Reused for `shared_comments` (freeze).
- **Advisory lock precedent**: schema-v2 §3 line 709 — conflict toast is client-layer advisory state ("Julian is editing Song B"), not a DB row.

### Decision Record (frozen at handoff)

| # | Decision |
|---|----------|
| D1 | **DEV** NEW `profiles` table (id→auth.users, display_name, username UNIQUE, instrument, avatar_url) + RLS; deviation from 48-table contract — recorded in proposal. |
| D2 | Migration numbering: next free = **0006** (0001–0005 exist). |
| D3 | Visibility enum: `'private' \| 'shared' \| 'public'`; org/branch reserved → Hito 4. |
| D4 | Roles: owner / can_edit / can_view; RLS per 0002 setlists UPDATE shape (view-only → 42501). |
| D5 | Comment anchors reuse `{section,index}`; version_id column attaches comments to versions. |
| D6 | No setlist activity/revert table in PR#2 — activity feed client-derivable from Realtime events; revert → change 3 (conflict policy); named candidate `setlist_activity` if client-derivation rejected. |
| D7 | Notification trigger approach → change 2; shared_comments RLS skeleton stays migration-first in 0006. |
| D8 | Advisory lock = client-layer, no DB table. |

### Scenario Inventory (43 total, per features/*.feature, counted verbatim)

| Feature | IN (definite) | Conditional | Deferred (named) |
|---|---|---|---|
| collaboration-bandmates (15) | 9: search-by-username, resolve-by-id, accept, decline, no-self, non-existent, already-exists, offline-invite-while-active, revoked-auto-cancel | 5: proximity S6–S9 + expiry S13 (iff PR#1 ≤400) | 1: email search S2 (no email column in frozen profiles set) |
| shared-setlist-collaboration (15) | 12: create+invite, realtime edit, conflict toast, reorder, lock, offline edit, non-conflicting merge, offline-add/online-delete, permissions, transfer, remove, activity feed | — | 3: merge-conflict screen S8 + revert S14 (→ change 3), change-notifications push S15 (→ change 2) |
| collaborative-comments (13) | 11: post, section anchor, version attach, reply, edit-own, resolve, delete-own, scope visibility, annotations-separate, no-access, offline queue | — | 2: notify bandmates S11 + @mention S12 (→ change 2) |

Total: 32 definite IN + 5 conditional + 11 named deferrals = 48 slots covering 43 scenarios (email-search S2 double-counts as deferred-only).

### Approach (from proposal)

Migration-first PR#0 (`0006_*: profiles + bandmate_links RLS + shared_comments RLS + setlist_collaborators self-accept + realtime publication`), then PR#1 bandmates, PR#2 shared setlists (B1/B2 split if >400), PR#3 comments. Each ≤400 lines per review guard.

### Risks

- RLS policy-graph recursion (comment scope hops songs→setlists→collaborators) — 0004 nested-exists shape.
- Realtime RLS leakage — publication restricted to RLS-enabled tables.
- 400-line budget on PR#1/PR#2 — conditional proximity deferral + B-split.
- Email-search scenario blocked by frozen profiles column set — default defer, column addition is the upgrade path.

### Ready for Proposal

Handoff confirmed; `proposal.md` written; specs (sdd-spec) next.