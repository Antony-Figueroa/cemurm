# Design: Notifications feed + @mention

## Technical Approach

DB-backed, trigger-emitted in-app notifications (exploration A1, proposal Approach). Migration **0008** adds SECURITY DEFINER AFTER triggers on the four emission tables (**8 trigger functions**: bandmate_links ×2, setlist_collaborators ×3, setlist_items ×2, shared_comments ×1) plus **2 security-definer write RPCs** (`move_setlist_items`, `transfer_setlist_ownership`) that make the reorder and removal trigger semantics correct (see Decisions 2–4). Every notification row is inserted **in the same transaction as the event**; `notifications` joins the `supabase_realtime` publication with `replica identity full`; the client gets a data layer (`src/lib/notifications.js`), a hook (`src/hooks/useNotifications.js`), a `/notifications` route + page, and an AppLayout unread badge. Read state reuses the 0002 grants verbatim (`notifications_select_self` / `notifications_update_self` + `grant update (read_at)`). Offline needs **no new queue**: the emitter side reuses the existing IDB outbox (`drainPending` → commit → triggers fire, FIFO); the recipient side caches the unread count in IDB and reconciles on `online` with a locally synthesized summary row. Web Push is out (frozen decision 1); the per-setlist Activity panel stays broadcast-only (frozen decision 2); `notification_preferences` stays deny-by-default (frozen decision 3 — 0008 contains no prefs policy).

Maps to specs: `notifications` (feed/read-state/offline/badge, I1–I3, S1–S4, Sys1, S15, Feed1–7, Off1–2), `collaboration-bandmates` (accept/decline → inviter), `shared-setlist-collaboration` (collaborator invite/permission/removal/reorder/add), `collaborative-comments` (comment + @mention), `row-level-security` (publication + replica identity full).

## Architecture Decisions

### Decision: Emission via SECURITY DEFINER AFTER triggers in migration 0008

**Choice**: After-statement row/statement triggers — **8 trigger functions on 4 tables** (bandmate_links INSERT + UPDATE; setlist_collaborators INSERT + UPDATE + DELETE; setlist_items INSERT + statement-level reorder UPDATE; shared_comments INSERT) — all calling a single shared `public.notify_user(recipient, category, title, body, payload)` definer helper. Functions follow the 0006/0007 trigger contract verbatim: `security definer set search_path = ''`, fully-qualified `public.` refs, `revoke all on function ... from public, anon, authenticated` (trigger-only entry, 0006 lines 53–54, 292–293 precedent). The two write RPCs are definer too but get `grant execute ... to authenticated` (0002 line 34–39 precedent: `revoke` from public/anon, `grant` to authenticated + service_role) and re-assert their own auth checks since definer bypasses RLS.
**Alternatives considered**: (a) Client-initiated RPC emission (`notify(event, context)` called after every write) — non-atomic (a crash between the write and the call loses the row), recipient set computed from a stale client view, every future emission site must remember to call it (exploration A3). (b) Broadcast-only client derivation — no persistence, fails every IN scenario. (c) AFTER vs BEFORE — AFTER sees the committed row and the actor's `auth.uid()` is available in either; AFTER is consistent across all sites and avoids mutating `NEW` in a definer context.
**Rationale**: The trigger variant cannot be forgotten, is atomic with the source write, and computes recipients server-side from post-commit row state (0002's "system writes only" invariant gains its defined writers). The shared helper centralizes actor resolution, name baking, payload shaping, and self-suppression so all eight trigger functions stay small. **Trigger-count reconciliation** (supersedes the proposal's "five emission sites" wording): the five sites (bandmate INSERT, bandmate UPDATE, setlist_collaborators DML, setlist_items INSERT, shared_comments INSERT) expand to **4 tables / 8 trigger functions** — bandmate_links ×2, setlist_collaborators ×3, setlist_items ×2 (INSERT + reorder UPDATE), shared_comments ×1, i.e. **2+3+2+1 = 8** — plus **2 write RPCs** (not triggers). Every count reference in this document and in the 0008 dry-run uses the expanded numbers.

### Decision: Reorder emission — write RPC + statement-level transition-table trigger (exactly one row per reorder)

**Choice**: Migration 0008 adds a security-definer write RPC **`move_setlist_items(p_setlist_id, p_ordered_song_ids uuid[], p_moved_song_id uuid)`** that executes the reorder transactionally — the same two-phase protocol as today (`position = 10000+i` bump, then a **single multi-row** `UPDATE ... position = i` final pass) — and a statement-level `AFTER UPDATE ... referencing old table / new table for each statement` trigger on `setlist_items` that emits **one** row per final-pass statement. Criterion: `exists(new_rows n join old_rows o on o.id = n.id where n.position is distinct from o.position)` AND `not exists(new_rows where position >= 10000)`. The bump pass is the only statement whose rows are all `>= 10000`, so it is excluded; the final pass (all `< 10000`) fires exactly once per reorder. **The moved song is named from a transaction-local GUC** `cemurm.reorder_moved_song_id` that the RPC sets via `set_config(..., true)` before the passes: after the two-phase bump *every* row changes position in the final pass, so `min(new.position)` would name position 0's song, not the moved one. The GUC is `current_setting(..., true)` in the trigger; when unset (only possible for non-RPC writers), the trigger falls back to the row with `min(new.position)` — exact there because a single-row statement has exactly one changed row. `src/lib/setlists.js` `moveSongInSetlist` (lines 481–496) replaces its per-song UPDATE loops with `supabase.rpc('move_setlist_items', { p_setlist_id, p_ordered_song_ids: reordered, p_moved_song_id: moved })`; the offline/queued path (private visibility only, D7) and the WRITE_OPS entry stay on `moveSongInSetlist`, which now replays through the RPC (idempotent — positions recomputed from the ordered ids).
**Alternatives considered**: (a) **The chosen mechanism** (gatekeeper option (a)): the client/protocol emits exactly ONE multi-row UPDATE statement in the final pass (here: inside the RPC), and the statement-level trigger fires once on it. (b) Post-hoc notify RPC (`notify_reorder(setlist_id)`) called after the client loop — non-atomic: a crash between the reorder and the call loses the notification; rejected. (c) Accepting N rows per reorder — the current client loop is one UPDATE *per song* (each its own PostgREST request/statement), so a statement-level trigger would fire N times in the final pass; N rows breaks S15 ("Julian moved Song X to position 1") and the feed's "per change" semantics; rejected. (d) Per-row AFTER UPDATE trigger on position change — fires N×2 times (two passes × N songs) → N×2 rows; rejected. (e) A literal single-statement `UPDATE ... SET position = CASE ...` issued by the client — not expressible through PostgREST PATCH (one value per matched set, no per-row values), and *without* the bump it would transiently violate `UNIQUE (setlist_id, position)` (0001 line 188): the unique check runs per row-update and a permutation always moves one row into a still-occupied position; rejected. (f) Single-statement CASE inside the RPC *without* the bump — same transient-collision failure against the existing unique constraint; rejected.
**Rationale**: The two-phase bump is **required**, not optional: `UNIQUE (setlist_id, position)` is enforced at 0001 line 188 (line 190 is a redundant extra index; the `UNIQUE` comment in setlists.js 478–480 is **accurate**, not stale). The RPC is the only mechanism that (1) keeps the reorder **atomic** with its notification, (2) produces exactly one statement in the final pass, and (3) preserves the constraint-safe protocol — and it adds the moved-song identity via the GUC so S15's deep link names the right song. The trigger criterion couples to the bump's signature (`< 10000` = final pass), which is now stable because the RPC owns the protocol. ponytail: if the bump offsets, the GUC name, or the protocol ever change, `move_setlist_items` and the trigger criterion must change together — noted in code. Private-setlist reorders emit nothing: the recipient set (owner + accepted collaborators, minus actor) is empty for private setlists.

### Decision: Removal emission — transfer RPC + DEFERRABLE INITIALLY DEFERRED DELETE trigger

**Choice**: Migration 0008 adds a security-definer transfer RPC **`transfer_setlist_ownership(p_setlist_id, p_new_owner_id)`** that runs the three ops (drop the new owner's collaborator row → insert the former owner as accepted collaborator → flip `setlists.owner_id`) inside **one transaction**, and replaces the DELETE/INSERT/flip request sequence in `setlists.js` `transferOwnership` (lines 678–700) with `supabase.rpc('transfer_setlist_ownership', ...)`. The removal trigger is `create constraint trigger ... after delete on setlist_collaborators deferrable initially deferred for each row`, evaluating at commit time: emit "You have been removed from {Setlist}" **only if** the setlist still exists (`ON DELETE CASCADE` from `setlists`, 0001 line 170, removed the row with the setlist → skip) **and** the deleted user is not the setlist's current owner (ownership transfer → skip).
**Alternatives considered**: (a) **The chosen mechanism** (gatekeeper option (a)): a single security-definer RPC owning all three ops in one transaction, so the deferred trigger evaluates at commit with `owner_id` already flipped → the deleted user *is* the new owner → no row. (b) DEFERRABLE trigger **without** the RPC: the current client sequence is three *separate* PostgREST transactions (verified: `transferOwnership` issues three sequential requests), so the deferred trigger fires at the DELETE's own commit when `owner_id` is still the transferor → the incoming owner receives a false "removed"; **a deferred trigger alone is insufficient**, and any client-side "not the owner at DELETE time" filter is exactly the same bug; rejected. (c) AFTER/BEFORE DELETE immediate — fires at the DELETE statement, before any flip; same false row; rejected. (d) Client-supplied transfer marker (GUC) — PostgREST/supabase-js cannot send custom GUCs without an RPC; rejected.
**Rationale**: The single-transaction RPC is what makes the deferred trigger correct: by the time the constraint trigger evaluates at commit, `owner_id` has already flipped, so the deleted user *is* the new owner → the check `deleted user = current owner` is false → no row. The RPC also closes the atomicity gap of the current three-request sequence (a mid-failure currently leaves a half-transferred state recoverable only by re-running). The transfer RPC re-asserts the ownership check server-side (`private.session_owns_setlist(p_setlist_id)`, 0002 line 142) since definer bypasses RLS, and re-asserts `guardTransfer` semantics (new owner must be an accepted collaborator) raising the exact existing `USER_ERRORS` messages (`'Only an accepted collaborator can take ownership.'`, `'The new owner must accept the invitation first.'` — setlists.js lines 21–22), so client error mapping passes through unchanged; the client pre-flight guards in `setlistCollab.js` stay for UX.

### Decision: Transfer-safety on `setlist_collaborators` INSERT

**Choice**: The INSERT trigger skips when `new.user_id = (select owner_id from setlists where id = new.setlist_id)` **at statement time** (immediate — *not* deferred).
**Alternatives considered**: Deferred check (compare against the commit-time owner) — inside the transfer RPC the former owner is re-inserted *before* the owner flip, and at commit the flip has happened, so a deferred check would not skip; rejected.
**Rationale**: With the transfer now a single transaction, the re-insert of the former owner runs while `owner_id` still identifies them → the immediate check skips. The owner can never be a legitimate collaborator (client `shareTargets` excludes the owner, setlistCollab.js line 29), so `user_id = current owner` unambiguously identifies the transfer re-insert.

### Decision: Real-time delivery — per-user `postgres_changes` channel filtered on `user_id`

**Choice**: One channel per user: `supabase.channel('notifications:<userId>').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.<me>' }, ...)`, backed by `replica identity full` on `notifications` (required for the non-PK filter to honor RLS per subscriber — 0006 publication precedent plus the row-level-security delta scenario).
**Alternatives considered**: (a) Broadcast channel per event (like the Activity panel) — no RLS cap, no read-state, no persistence; rejected. (b) A single shared `notifications` channel without a filter — every user receives every row's change event; the non-PK filtered subscription is the contract the spec scenario asserts; rejected. (c) Polling only — no <2s cross-device sync (success criterion); rejected as primary.
**Rationale**: Matches the existing `subscribeSetlistRealtime` pattern (setlists.js line 812), RLS caps delivery per subscriber, and the filter + replica identity full is exactly the 0008 delta the row-level-security spec requires.
**Fallback** (risk register): if the local Realtime stack does not deliver on the non-PK filter despite `replica identity full`, the hook already refetches on `online` (listener) and gains a `focus` listener; a periodic refetch timer is **not** shipped by default — documented as a rollback lever, added only if apply-time verification shows realtime failure.

### Decision: Actor identity — `auth.uid()` at event time, baked display names, `payload.actor_id`

**Choice**: Actor = `(select auth.uid())` read inside the trigger transaction; `payload.actor_id` carries the raw UUID (may be NULL); the `title`/`body` embed the actor's display name resolved **at emit time** from `profiles` (`display_name` or `username`, fallback string `'Someone'` when the profile lookup or `auth.uid()` is NULL).
**Alternatives considered**: (a) Resolve actor names at read time (profiles round trip in the feed, `withAuthorNames` precedent) — extra per-fetch query and renames rewrite history; the 0001 payload comment already reserves `payload` for deep-link data, and baking names keeps the feed read path single-query. (b) Store only ids, no names — the feed would need N profile joins per fetch; rejected. (c) A new `actor_id` column — schema deviation beyond the frozen 48-table contract; rejected (frozen decision 4).
**Rationale**: Frozen decision 5; `payload.actor_id` keeps the schema contract untouched, historical accuracy is preserved even if a profile is renamed, and the feed page becomes a single RLS-scoped SELECT without joins.

### Decision: Self-notification suppression

**Choice**: Every trigger skips rows where `recipient = actor` (`user_id <> coalesce(auth.uid())`, enforced once inside `notify_user`); the mention trigger additionally skips `mention_recipient = comment author`.
**Alternatives considered**: Delivering self-rows and filtering client-side — the feed would show "You invited you to…"; rejected.
**Rationale**: Baked into the shared helper once, so no trigger can forget it. The emitting user still sees their action reflected in the source surface, so no information is lost.

### Decision: Read-state — reuse the 0002 grants verbatim; no new policies

**Choice**: `markRead` = `update({ read_at: now })` on the row; `markAllRead` = `update({ read_at: now }).is('read_at', null)` — both flow through `notifications_update_self` + the column grant `update (read_at)` (0002 lines 434–442, 469–470)). Client updates local state optimistically and lets the realtime echo converge any second tab.
**Alternatives considered**: A dedicated `mark_all_read` RPC — unnecessary surface; the existing grant already permits exactly the mutation the scenarios need (updating non-read_at columns is 42501 by the column grant).
**Rationale**: Zero schema/grant change; the 0002 comment's invariant ("PATCH read_at into 200 and PATCH title into 42501") is the read-state contract. `postgres_changes` *does* echo a user's own `read_at` UPDATE back (unlike broadcast), which is what keeps a second `useNotifications` instance (e.g., the badge in AppLayout) converged.

### Decision: Offline — emitter reuses the outbox; recipient caches badge + feed in IDB

**Choice**: Emitter: no new queue — drained outbox ops commit → triggers fire with the notification row in the same transaction; FIFO is the existing `drainPending` loop order (offlineSync.js 128–175); the emitter's own pending count is the existing `pendingSync` badge pattern. Reorder/transfer offline replays go through the 0008 RPCs (single-statement final pass / single transaction) — the trigger semantics hold at drain time exactly as online. Recipient: `useNotifications` caches the unread count (`notifications-unread:<userId>`) and the last feed (`notifications:<userId>`, read-through) in IDB via the existing `offlineCache.js` kv helpers `offlineGet`/`offlineSet` (offlineCache.js lines 53, 68 — **new keys only**: no store, schema, or `DB_VERSION` bump; the additive-upgrade contract in offlineCache.js lines 23–27 stays untouched); on `online` (and `cemurm:sync-done`) it refetches and reconciles the badge; the "You have 8 pending notifications" summary is synthesized locally from the fetch delta (`unread - lastSeenUnread`, grouped by category) — no server job.
**Alternatives considered**: (a) Server-side digest or notification-row synthesis for the summary — needs a scheduled job (no cron infra) or a trigger writing to the same table; rejected. (b) Badge derived only from the cached feed — stale after marking read on another device; rejected. (c) No IDB cache — offline reload shows badge 0 and the feed vanishes; rejected.
**Rationale**: Mirrors the existing offline plumbing exactly (`syncNotices` keyed per user, offlineCache keys per user, online/sync-done listeners in `useComments`); the delta synthesis satisfies Off2's wording and "delivered in order" holds because the DB rows' `created_at` order IS the delivery order on refetch.

### Decision: Two feed surfaces stay separate

**Choice**: The per-setlist Activity panel (broadcast, `setlists.js` 2.3) is untouched; the global Notifications feed is DB-backed. No behavioral coupling; the notification page never reads `setlist-activity` channels.
**Alternatives considered**: Promoting Activity broadcasts to `notifications` rows — a deliberate future change (proposal is explicit); would double-emit and confuse read-state.
**Rationale**: Frozen decision 2; unification is out of scope.

## Data Flow

### Emitter (producers) — trigger emission in the event transaction

    Owner removes collaborator / shares / flips permission / adds a song / posts a comment
      → PostgREST write (online)  OR  outbox drain commit (offline, FIFO)
      → 0008 AFTER triggers on bandmate_links | setlist_collaborators | setlist_items | shared_comments
      → shared notify_user(): compute recipients from post-commit rows, resolve actor
        (auth.uid() → profiles name join, NULL → 'Someone'), self-suppress
      → INSERT notifications row(s) — same transaction as the event

    Owner reorders a shared setlist / transfers ownership
      → supabase.rpc('move_setlist_items' | 'transfer_setlist_ownership')   (one transaction;
         definer re-asserts scope; reorder sets the cemurm.reorder_moved_song_id GUC)
      → two-phase bump final pass = ONE multi-row statement (reorder) / three ops in one transaction (transfer)
      → 0008 triggers fire: statement-level reorder trigger once on the final pass;
        deferred DELETE trigger sees the final owner state
      → INSERT notifications row(s) — same transaction as the event

    Any write → Realtime: postgres_changes event on notifications (replica identity full)
      → recipient client (user_id=eq.<me> filter) refetches (debounced) → badge/page update

### Recipient (consumer) — feed, read-state, offline

    useNotifications (per consumer: AppLayout badge, /notifications page)
      ├─ fetch: listNotifications/unreadCount (RLS-capped, read-through IDB cache)
      ├─ realtime: channel notifications:<userId>, filter user_id=eq.<me> → debounced refetch (150ms)
      ├─ online / cemurm:sync-done / focus → refetch + reconcile badge + delta summary
      └─ markRead / markAllRead → UPDATE read_at → optimistic local state → realtime echo converges

### Deep-link navigation

    notify row tapped → payload-driven target (rows marked read on tap):
      invite / bandmate-accepted / bandmate-declined ──→ /bandmates
      shared / permission ──→ /setlists/:setlist_id
      song-added / reorder ──→ /setlists/:setlist_id?song=<songId>  (scroll + highlight item row; reorder songId = moved song via GUC)
      comment / mention ──→ /songs/:song_id?anchor=<section>&cid=<commentId> (sectionAnchorId + comment panel)
      removed ──→ no navigation (informational; RLS denies the setlist to the removed user)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/0008_notifications.sql` | Create | Shared `notify_user` + `notifier_actor_name` definer helpers; **8 trigger functions** (bandmate_links INSERT + UPDATE, setlist_collaborators INSERT + UPDATE + deferred DELETE, setlist_items INSERT + statement-level reorder UPDATE, shared_comments INSERT + @mention — 2+3+2+1); **2 write RPCs** (`move_setlist_items(p_setlist_id, p_ordered_song_ids, p_moved_song_id)` with the transaction-local `cemurm.reorder_moved_song_id` GUC, `transfer_setlist_ownership(p_setlist_id, p_new_owner_id)` with server-side owner + guardTransfer re-asserts); `alter publication supabase_realtime add table notifications`; `alter table notifications replica identity full`. NO prefs policy. NO client INSERT/DELETE grants on `notifications` (0002 locks stay). |
| `src/lib/notifications.js` | Create | Feed/unread/markRead/markAllRead, realtime subscription, row normalizer, category grouping + filter + deep-link-target pure helpers. Lazy supabase import (bandmates.js precedent), `demo()` bare-node self-check. |
| `src/hooks/useNotifications.js` | Create | Rows + unreadCount state, debounced realtime refetch (150ms, useSharedSetlist precedent), online/sync-done/focus listeners (useComments precedent), IDB badge/feed cache, delta summary synthesis + consume. |
| `src/utils/relativeTime.js` | Create | Pure `relativeTime(iso)` ("just now", "5m ago", "2h ago", "3d ago", else date) with `demo()` (utils/ is the declared-but-empty pure-utility home). |
| `src/pages/Notifications.jsx` | Create | Feed page: category groups (Invitations / Setlist Changes / Events / System) + per-group unread counts, filter tabs (**All / Invitations / Setlist Changes / Events / System** — Events and System tabs render empty states until Hito 4 emitters exist; Feed5 contract), relative time, per-row read toggle + Mark-all, deep-link tap (marks read + navigates), View/Decline/Accept action buttons on invitation rows (Invitation-row action contract below), empty state, offline state, offline-summary banner. |
| `src/App.jsx` | Modify | Add `{ path: '/notifications', element: <Notifications /> }` under `RequireAuth` (lines 27–39 block), import the page. |
| `src/components/layout/AppLayout.jsx` | Modify | Add `Notifications` nav link with unread badge (`useNotifications` when authed; badge hidden at 0, cap "99+"). |
| `src/lib/setlists.js` | Modify | `moveSongInSetlist` (lines 481–496): replace the two per-song UPDATE loops with one `supabase.rpc('move_setlist_items', { p_setlist_id, p_ordered_song_ids: reordered, p_moved_song_id: moved })` call (offline path + WRITE_OPS entry unchanged — replay goes through the RPC). `transferOwnership` (lines 678–700): replace the DELETE/INSERT/flip request sequence with `supabase.rpc('transfer_setlist_ownership', …)`; keep the replay-safe early return and the `guardTransfer` pre-flight. **First task of PR#2** — until it lands, the old per-song loop runs against the 0008 trigger (interim window, see Rollout). |
| `src/pages/SetlistDetail.jsx` | Modify | Read `?song=<id>` search param → scroll to + highlight the item row (`data-song-id` selector) for song-added/reorder deep links. Activity panel untouched. |
| `src/pages/SongDetail.jsx` | Modify | Read `?anchor` + `?cid` search params → on mount call the existing `jumpToComment(anchor)` + comments-panel scroll (sectionAnchorId precedent, lines 316–331). |
| `src/lib/offlineCache.js` | No file change (reconciled) | The notification cache adds keys **`notifications-unread:<userId>`** and **`notifications:<userId>`** to the existing `kv` store through the exported `offlineGet`/`offlineSet` helpers (offlineCache.js lines 53, 68). No store, schema, or `DB_VERSION` change — the additive-upgrade contract (lines 23–27) stays untouched. |
| `src/lib/bandmates.js` | No file change (reconciled) | `acceptInvite` (line 158) / `declineInvite` (line 168) already exist and carry the response → inviter emission server-side (0008 bandmate_links UPDATE trigger). `Notifications.jsx` calls them as-is for I2/I3; no client changes. |
| `src/lib/comments.js` | No file change (reconciled) | `postComment` (line 192) stays the sole write path; @mention parsing and emission live entirely in the 0008 `shared_comments` trigger. |
| `src/lib/setlistCollab.js` | No file change (reconciled) | `guardTransfer` (line 39) / `shareTargets` (line 27) stay as client pre-flight guards; the transfer RPC re-asserts the same rules server-side with the same `USER_ERRORS` messages. |

No changes: `src/lib/offlineQueue.js`, `src/lib/offlineSync.js` (outbox drain needs no new op names — notifications are side effects of existing writes).

## Interfaces / Contracts

### Migration 0008 — SQL contract

All functions `security definer set search_path = ''`; trigger-only functions get `revoke all on function ... from public, anon, authenticated` (0006 lines 53–54, 292–293 precedent); the two RPCs get `revoke ... from public, anon` + `grant execute ... to authenticated` (0002 lines 33–39 precedent — reordered so the RPC is callable through PostgREST). Fully-qualified `public.` refs throughout. No grants or policies on `notifications` beyond the existing 0002 state (select + `update (read_at)`, 0002 lines 469–470); no `notification_preferences` policy.

```sql
-- Shared emission helper (one place for actor resolution, name baking, self-suppression).
create function public.notify_user(
  p_user_id     uuid,
  p_category    text,      -- 'invitation' | 'setlist' | 'event' | 'system' (frozen enum, 0001)
  p_title       text,
  p_body        text,
  p_payload     jsonb      -- must already carry deep-link keys; actor_id is injected below
) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if p_user_id is null or p_user_id = v_actor then
    return; -- nobody, or a self-notification: suppressed in all paths
  end if;
  insert into public.notifications (user_id, category, title, body, payload)
  values (p_user_id, p_category, p_title, p_body,
          jsonb_set(p_payload, '{actor_id}', to_jsonb(v_actor)));
end $$;

-- Actor display-name helper: profiles.display_name → username → 'Someone'.
create function public.notifier_actor_name() returns text
  language plpgsql security definer set search_path = '' as $$ ... $$;

-- Write RPC #1 — reorder, single transaction. Scope re-asserted (definer
-- bypasses RLS): caller must be the owner or an accepted can_edit
-- collaborator of p_setlist_id. The two-phase bump is REQUIRED by
-- UNIQUE (setlist_id, position) (0001 line 188).
create function public.move_setlist_items(
  p_setlist_id      uuid,
  p_ordered_song_ids uuid[],
  p_moved_song_id   uuid
) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null
     or not (private.session_owns_setlist(p_setlist_id)
             or exists (select 1 from public.setlist_collaborators c
                        where c.setlist_id = p_setlist_id and c.user_id = v_actor
                          and c.accepted_at is not null and c.can_edit)) then
    raise exception 'No access.';  -- not in USER_ERRORS → surfaces as the generic client message
  end if;
  -- Transaction-local GUC: names the moved song for the statement-level
  -- reorder trigger. After the bump, EVERY row changes in the final pass,
  -- so the trigger cannot infer the moved song from the transition tables.
  perform set_config('cemurm.reorder_moved_song_id', p_moved_song_id::text, true);
  -- Pass 1 (ONE statement): bump all to 10000+ordinality. Distinct in a
  -- range disjoint from the finals — no UNIQUE collision.
  update public.setlist_items i
  set position = 10000 + o.ord
  from unnest(p_ordered_song_ids) with ordinality as o(song_id, ord)
  where i.setlist_id = p_setlist_id and i.song_id = o.song_id;
  -- Pass 2 (ONE multi-row statement): finals 0..n-1. The statement-level
  -- reorder trigger fires only here (all new.position < 10000) → exactly
  -- one notification row per reorder.
  update public.setlist_items i
  set position = o.ord - 1
  from unnest(p_ordered_song_ids) with ordinality as o(song_id, ord)
  where i.setlist_id = p_setlist_id and i.song_id = o.song_id;
end $$;

revoke all on function public.move_setlist_items(uuid, uuid[], uuid) from public, anon;
grant execute on function public.move_setlist_items(uuid, uuid[], uuid) to authenticated;

-- Statement-level reorder trigger (the single emission point for reorders):
create function public.notify_setlist_reordered() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_song_id uuid := nullif(current_setting('cemurm.reorder_moved_song_id', true), '');
begin
  if exists (select 1 from new_rows n where n.position >= 10000) then
    return null;                                -- bump pass: no emission
  end if;
  if not exists (
    select 1 from new_rows n join old_rows o on o.id = n.id
    where n.position is distinct from o.position
  ) then
    return null;                                -- no positional change: no emission
  end if;
  -- exactly one row per reorder; moved song from the RPC GUC, falling back
  -- to min(new.position) when unset (exact for single-row statements).
  v_song_id := coalesce(v_song_id, (select n.song_id from new_rows n
                                    order by n.position limit 1));
  -- notify owner + accepted collaborators of (select distinct setlist_id from new_rows)
  -- minus actor (notify_user self-suppresses) with payload
  -- {action:'reorder', setlist_id, song_id: v_song_id}
  return null;
end $$;

create trigger setlist_items_reorder_notify
  after update on public.setlist_items
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_setlist_reordered();

-- Write RPC #2 — transfer, single transaction; only the CURRENT owner may
-- call. Re-asserts guardTransfer semantics with the existing USER_ERRORS
-- messages (setlists.js lines 21–22) so client error mapping passes through.
create function public.transfer_setlist_ownership(p_setlist_id uuid, p_new_owner_id uuid)
  returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.session_owns_setlist(p_setlist_id) then
    raise exception 'No access.';               -- only the current owner may transfer
  end if;
  if not exists (select 1 from public.setlist_collaborators c
                 where c.setlist_id = p_setlist_id and c.user_id = p_new_owner_id) then
    raise exception 'Only an accepted collaborator can take ownership.';
  end if;
  if not exists (select 1 from public.setlist_collaborators c
                 where c.setlist_id = p_setlist_id and c.user_id = p_new_owner_id
                   and c.accepted_at is not null) then
    raise exception 'The new owner must accept the invitation first.';
  end if;
  -- Three ops in ONE transaction, order matters (Decision 3/4):
  -- (1) drop the new owner's collaborator row. The deferred constraint
  --     trigger on DELETE evaluates at COMMIT — by then owner_id has flipped
  --     (op 3) → the deleted user IS the current owner → no "removed" row.
  delete from public.setlist_collaborators
  where setlist_id = p_setlist_id and user_id = p_new_owner_id;
  -- (2) re-insert the former owner as an accepted can_edit collaborator.
  --     The INSERT trigger's immediate check (statement time) still sees
  --     owner_id = former owner → skip (transfer re-insert, Decision 4).
  insert into public.setlist_collaborators (setlist_id, user_id, can_edit, accepted_at)
  values (p_setlist_id, v_actor, true, now());
  -- (3) flip ownership last.
  update public.setlists set owner_id = p_new_owner_id
  where id = p_setlist_id and owner_id = v_actor;
end $$;

revoke all on function public.transfer_setlist_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_setlist_ownership(uuid, uuid) to authenticated;

-- Deferred removal trigger (fires at COMMIT, not at the DELETE statement):
create function public.notify_removed_collaborator() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.setlists s where s.id = old.setlist_id)
     and old.user_id <> (select owner_id from public.setlists s where s.id = old.setlist_id) then
    -- Real removal: setlist still exists AND the deleted user is not the
    -- (commit-time) owner. Transfer → deleted user IS the new owner → skip;
    -- setlist cascade-delete → the setlist row is gone → skip.
    perform public.notify_user(old.user_id, 'setlist',
      notifier_actor_name() || ' removed you from ' ||
        (select name from public.setlists s where s.id = old.setlist_id),
      null, jsonb_build_object('action', 'removed', 'setlist_id', old.setlist_id));
  end if;
  return null;
end $$;

create constraint trigger setlist_collaborators_delete_notify
  after delete on public.setlist_collaborators
  deferrable initially deferred
  for each row execute function public.notify_removed_collaborator();
```

**Emission sites** (8 triggers on 4 tables — 2+3+2+1; recipients always from **post-commit row state**; every trigger skips `recipient = auth.uid()` via `notify_user`):

| # | Trigger (AFTER, row-level unless noted) | Event → recipients | Category | Title pattern | payload |
|---|------------------------------------------|--------------------|----------|---------------|---------|
| 1 | `bandmate_links_insert_notify` | INSERT → `new.bandmate_id` (invitee) | `'invitation'` | "{Actor} invited you to be a bandmate" | `{action:'invite', bandmate_id}` |
| 2 | `bandmate_links_update_notify` | UPDATE `old.status='pending'` → `new.status='active'` → `new.user_id` (inviter); same for `'declined'` | `'invitation'` | "{Actor} accepted your invitation" / "declined" | `{action:'bandmate-accepted'\|'bandmate-declined'}` |
| 3 | `setlist_collaborators_insert_notify` | INSERT → `new.user_id` (invitee); **skip when `new.user_id = current setlists.owner_id`** (transfer re-insert, immediate check at statement time) | `'setlist'` | "{Actor} invited you to edit {Setlist}" | `{action:'shared', setlist_id}` |
| 4 | `setlist_collaborators_update_notify` | UPDATE where `old.can_edit is distinct from new.can_edit` → `new.user_id` (affected member; the 0006 self-flip wrinkle is excluded by self-suppression) | `'setlist'` | "Your permissions on {Setlist} have changed to View Only" / "to Edit" | `{action:'permission', setlist_id}` |
| 5 | `setlist_collaborators_delete_notify` | DELETE → `old.user_id` (removed member); **DEFERRABLE INITIALLY DEFERRED**: at commit emit only if the setlist still exists AND the deleted user is not the current owner (transfer → no row; setlist cascade-delete → no row) | `'setlist'` | "You have been removed from {Setlist}" | `{action:'removed', setlist_id}` |
| 6 | `setlist_items_insert_notify` | INSERT → owner + accepted collaborators of `new.setlist_id` (deduped, minus actor) | `'setlist'` | "{Actor} added {Song} to {Setlist}" | `{action:'song-added', setlist_id, song_id}` |
| 7 | `setlist_items_reorder_notify` | UPDATE **statement-level, transition tables** → owner + accepted collaborators of the setlist (deduped, minus actor); fire only when any `new.position is distinct from old.position` AND all `new.position < 10000` (bump pass excluded); **exactly one row per reorder**; moved song from the transaction-local GUC `cemurm.reorder_moved_song_id`, fallback `min(new.position)` when unset (exact for single-row statements) | `'setlist'` | "{Actor} reordered songs in {Setlist}" | `{action:'reorder', setlist_id, song_id}` |
| 8 | `shared_comments_insert_notify` | INSERT → comment rows to participants (owner + accepted collaborators of **any** setlist containing `new.song_id`, deduped) minus author minus mention recipients; mention rows to each in-scope mentioned user | `'setlist'` | "{Actor} commented on {Song}" / "@{username} mentioned you in {Song}" | `{action:'comment'\|'mention', song_id, setlist_id, section, comment_id}` |

**Category contract** (drives Feed4 grouping and Feed5 filters — the grouped view and the tabs read `notifications.category` directly): rows 1–2 (bandmate invite/accept/decline) → `'invitation'` ("Invitations" group); rows 3–8 (collaborator invite, permission, removal, song-added, reorder, comment/@mention) → `'setlist'` ("Setlist Changes" group). **No `'event'` or `'system'` rows are emitted in this change** (no emitters exist — Hito 4); the feed page still renders those filter tabs (Events, System) per Feed5's "I can switch to 'Setlist Changes' or 'Events' or 'System'" with empty states.

**"'adds, or removes content' reading"** (notifications requirement 2): the adopted reading is **member-removal** (S4/S10 — the `setlist_collaborators` DELETE, trigger #5). **Song-removal** (`setlist_items` DELETE) has **no trigger in 0008** — it stays silent, matching the frozen emission list (setlist_items INSERT only + reorder UPDATE); if product wants song-removal notifications later, that is a new emission site needing its own trigger + scenario.

**@mention scope check — concrete 0006 EXISTS shape** (resolved against unique `profiles.username`; this is the 0006 policy shape — 0006 lines 211–258 — reused verbatim in trigger form, nested single-relation EXISTS, no joins):

```sql
-- For a comment row (new.song_id) and a named user (candidate), the mention is
-- emitted only when the candidate is an owner or ACCEPTED collaborator on some
-- setlist that contains the song — the same scope chain as the 0006 policies:
if exists (
  select 1 from public.setlist_items i
  where i.song_id = new.song_id
    and exists (
      select 1 from public.setlists s
      where s.id = i.setlist_id
        and (
          s.owner_id = v_candidate
          or exists (
            select 1 from public.setlist_collaborators c
            where c.setlist_id = s.id and c.user_id = v_candidate
              and c.accepted_at is not null
          )
        )
    )
) then
  perform public.notify_user(v_candidate, 'setlist', ... '@' || v_username || ' mentioned you in ' || v_song, ...,
    jsonb_build_object('action','mention','song_id', new.song_id, 'setlist_id', v_setlist_id,
                       'section', new.anchor, 'comment_id', new.id));
end if;
```

Mention recipients are excluded from trigger #8's comment-recipient set (the mention row supersedes); self-mentions (`v_candidate = new.author_id`) are skipped. Song-add body: append "Key: {base_key} · {base_tempo} BPM" when resolvable via `song_versions` — prefer the item's `version_id`, else the latest version by `created_at desc` (client default precedent, songs.js line 52); omit silently otherwise. Section anchor payload carries the comment's `{section, index}` (comments.js anchor convention).

**Publication + replica identity** (row-level-security delta):

```sql
alter publication supabase_realtime add table public.notifications;
alter table public.notifications replica identity full;
-- Assertion target: publication = {setlists, setlist_items, setlist_collaborators, notifications}, all RLS-enabled; notifications relreplident = 'f'.
```

### Invitation-row action contract (I1–I3)

| Row action | Mechanism |
|---|---|
| **View** | `markRead(row)` + navigate to `/bandmates` (no domain write) |
| **Decline** | `declineInvite(userId, bandmateId)` (bandmates.js line 168) → 0008 trigger #2 emits "declined" row to the inviter → on success `markRead(row)`. The invitation row is **not deleted**: `notifications` has no client DELETE grant (0002 line 107 deny-by-default; the only client grants are `select` + `update (read_at)`, 0002 lines 469–470), so I3's "the notification is dismissed" = moved to read (`read_at` set) |
| **Accept** | `acceptInvite(userId, bandmateId)` (bandmates.js line 158) → 0008 trigger #2 emits "accepted" row to the inviter → `markRead(row)` + navigate to `/bandmates` |

The action buttons render only on `payload.action ∈ {invite, bandmate-accepted, bandmate-declined}` rows. Decline/accept keep the existing offline path (`respondInvite` queues on connectivity failure, bandmates.js lines 162–176) — a queued response still emits the inviter-side row at drain time.

### `src/lib/notifications.js` — API

```js
// All reads RLS-capped to the caller (0002 select_self). Lazy supabase import
// for bare-node demo() (bandmates.js precedent).
listNotifications(userId)            // → normalized rows, read-through cached (`notifications:<userId>`)
unreadCount(userId)                  // → number of rows with read_at IS NULL (cached `notifications-unread:<userId>`)
markRead(userId, id)                 // update read_at = now (0002 update_self + column grant)
markAllRead(userId)                  // update read_at = now where read_at IS NULL
subscribeNotifications(userId, cb)   // channel `notifications:<userId>`, postgres_changes, filter user_id=eq.<me>; returns unsubscribe
// pure helpers (demo()-able):
normalizeNotification(row)           // row → {id, category, title, body, action, target, read, createdAt, actorId}
groupByCategory(rows)                // ordered groups with per-group unread counts
notificationTarget(payload)          // payload → {route, params|null} per the deep-link map (below); null for informational rows
```

### Deep-link map (pure contract)

| action | route | params |
|---|---|---|
| `invite`, `bandmate-accepted`, `bandmate-declined` | `/bandmates` | — |
| `shared`, `permission` | `/setlists/:setlist_id` | — |
| `song-added`, `reorder` | `/setlists/:setlist_id` | `song=<song_id>` |
| `comment`, `mention` | `/songs/:song_id` | `anchor=<section>&cid=<comment_id>` |
| `removed` | none (informational row) | — |

### `src/hooks/useNotifications.js` — return shape

```js
{
  rows, unreadCount, loading, online,             // online = navigator.onLine snapshot
  summary,                                        // {count, byCategory} | null — synthesized from fetch delta
  consumeSummary,                                 // clears + persists lastSeenUnread
  markRead(id), markAllRead(), refresh(),         // optimistic local + DB (realtime echo converges other tabs)
}
```

State per consumer instance (AppLayout badge + page each hold one); convergence is by realtime echo of the other instance's `read_at` UPDATEs. Refetches debounced 150ms (useSharedSetlist precedent) so `markAllRead` of N rows coalesces.

## Testing Strategy

No workspace test runner (strict_tdd false — no invented commands). Verification = the codebase's existing patterns: pure-function `demo()` self-checks, a psql dry-run for 0008, and the manual two-identity walk.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Pure (unit-style) | `relativeTime`, `groupByCategory`, `normalizeNotification`, `notificationTarget`, mention-regex semantics | `demo()` self-checks in each module (setlists.js/comments.js precedent), run via `node -e "import(...).then(m => m.demo())"` |
| Migration (dry-run psql) | **Exactly 8 trigger functions** via `pg_trigger` with the per-table breakdown (bandmate_links ×2, setlist_collaborators ×3, setlist_items ×2, shared_comments ×1 — 2+3+2+1) and **exactly 2 security-definer RPCs** via `pg_proc` (`move_setlist_items`, `transfer_setlist_ownership`) with `execute` granted to authenticated only; **exactly one notification row per `move_setlist_items` call**, and the reorder row's `payload->>'song_id'` equals the `p_moved_song_id` passed (GUC naming); **transfer produces zero 'removed' rows** (RPC transfer + assert no `action='removed'` row); deferred DELETE emits on plain `removeCollaborator` and skips on setlist cascade-delete; publication = exactly the 4 RLS-enabled tables; `notifications` relreplident = full; NULL-actor fallback → 'Someone' rows; RPC scope checks reject a non-owner transfer and a non-editor reorder (raw exception message asserted in psql; client sees the generic message for 'No access.'); no `notification_preferences` policy/grant; client INSERT/DELETE on `notifications` still 42501 (no new grants) | `supabase db reset` + seed, then psql assertions per `docs/local-dev.md`; script lives beside the migration with the 0006 self-check precedent |
| Integration (manual, 2 seeded identities) | Each of the 22 IN scenarios: invite/accept/decline (incl. notification-row Read/Decline/Accept actions + dismissal = read), collaborator add/permission/removal (incl. transfer + setlist-delete skip, "no further notifications"), song add (key/tempo), reorder (exactly one row, offline drain replay via RPC, deep link highlights the moved song), comment, @mention in/out of scope, feed tabs All/Invitations/Setlist Changes/Events/System (Events/System empty states — Feed5) | Two-identity walk per `docs/local-dev.md` seeds; `postgres_changes` <2s cross-device; offline outbox drain → rows land FIFO; offline badge cache + reconnect reconciliation + summary |
| Regression | `pnpm build` + `pnpm lint` zero warnings; per-setlist Activity panel behavior unchanged (no broadcast coupling); existing demo() suites still green | `pnpm lint`, `pnpm build`, demo() runs — the project's only gates |

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.` This change adds a client-side React Router route, DB triggers, and two PostgREST RPCs; it touches neither command execution, git/PR automation, nor executable-file handling. Applicability rows (documentation-like paths, git selection, commit state, push state, PR commands) are all explicit `N/A` with that reason; no RED tests are manufactured.

## Migration / Rollout

**Rollout**: 0008 lands first (PR#0) and is inert until events occur — triggers fire only on real collaboration writes, so PR#1 can ship the feed UI against an empty table before any producer is active. No feature flag; `notification_preferences` stays locked throughout.

**Interim window**: between PR#0 and PR#2 the client still runs the old per-song UPDATE loop for reorders — a shared-setlist reorder in that window emits N rows (the statement-level trigger fires once per single-row statement; each final-pass UPDATE satisfies the criterion with its one changed row `< 10000`). The window is bounded: the chained PRs merge in order and the two client RPC swaps (`setlists.js`, PR#2) are listed as the first tasks of PR#2; the manual reorder verification in PR#2 exercises the RPC path only.

**Rollback**: drop `0008_notifications.sql` and re-run `supabase db reset` — trigger functions and RPCs disappear (emission stops), `notifications` leaves the publication, replica identity reverts. Client slices revert individually PR#3 → PR#2 → PR#1 → PR#0; the IDB badge/feed cache keys are disposable. Behavioral fallback: the per-setlist Activity broadcasts (change-1 surface) are untouched and keep working with or without 0008; if the RPCs must be reverted without 0008, restore the `transferOwnership`/`moveSongInSetlist` request sequences (the RPC swap is contained in two functions in `setlists.js`).

**Retention**: no cleanup job in 0001; acceptable at band scale. A periodic purge RPC (delete rows `read_at IS NOT NULL` older than N months) is noted as a later change, not this one.

## Resolution Notes (specs/apply)

- **"adds, or removes content" ambiguity** (notifications requirement 2): the adopted reading is **member-removal** (S4/S10 — removal of the collaborator row, which emits via trigger #5). **Song-removal** (`setlist_items` DELETE) has **no trigger in 0008** — it stays silent, matching the frozen emission list (setlist_items INSERT only + reorder UPDATE); if product wants song-removal notifications later, that is a new emission site needing its own trigger + scenario (see the emission-sites note above).
- **Reorder naming**: reorder notifications derive the moved song from `move_setlist_items`' `p_moved_song_id` via the transaction-local GUC (not from transition-table diffs — after the two-phase bump every row changes, so a diff cannot identify the moved song; `min(new.position)` is only a fallback for single-row statements).
- **RPC error mapping**: `'Only an accepted collaborator can take ownership.'` and `'The new owner must accept the invitation first.'` are existing `USER_ERRORS` members (setlists.js 21–22) → transfer failures pass through `withErrorMapping` unchanged. `'No access.'` is **not** in `USER_ERRORS` → a scope rejection surfaces as the generic "Something went wrong." client message; acceptable because the client guards catch the common cases first and the psql dry-run asserts the raw message.

## Open Questions

- [ ] Exact username charset/validation at signup (`src/lib/auth.js`) — the trigger's mention regex must match it (design assumes `@[A-Za-z0-9._-]+`; align during apply, keep the same character class as `profiles.username` creation).
- [ ] Confirm the local Realtime stack delivers the non-PK `user_id` filter with `replica identity full` at apply time (0006 precedent says the stack supports full-identity change detection; if not, enable the documented focus-refetch fallback and note it).

## Delivery Plan (PR chain, 400-line review guard)

Forecast: **HIGH** → chained PRs (producers before UI). Feature-branch chain: PR#0 targets the feature branch; PR#1 → PR#0's branch; PR#2 → PR#1; PR#3 → PR#2 (Section E guard).

| Slice | Scope | Work boundary (start → finish) | Est. lines |
|---|---|---|---|
| **PR#0** | 0008 migration only | `notify_user` + `notifier_actor_name` helpers → 8 trigger functions (incl. deferred DELETE + statement-level reorder with the GUC) → 2 write RPCs (`move_setlist_items` w/ `p_moved_song_id`, `transfer_setlist_ownership` w/ server-side auth re-asserts) → publication + replica identity → psql dry-run script (trigger/RPC counts, row-count-per-reorder, GUC song naming, transfer-no-row asserts) | ~340–400 |
| **PR#1** | Data layer + UI shell (no producers yet) | `src/utils/relativeTime.js` → `src/lib/notifications.js` (+ demo) → `useNotifications.js` → `/notifications` route + `Notifications.jsx` (empty state, Events/System tabs) → AppLayout nav + badge | ~330–400 |
| **PR#2** | Event wiring + read-state + offline | **`setlists.js` RPC swaps (moveSongInSetlist w/ moved song, transferOwnership)** → live emissions verified against PR#0 triggers → invitation View/Decline/Accept actions + bandmate/setlist deep links → markRead/markAllRead wiring → IDB badge cache + reconnect reconciliation + delta summary → `SetlistDetail.jsx` `?song=` deep-link target | ~340–400 |
| **PR#3** | Comments + @mention | `shared_comments` mention/comment rows verified → `SongDetail.jsx` `?anchor=&cid=` deep-link target → comment/mention row rendering + mention-scope path checks | ~250–330 |