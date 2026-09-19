## Exploration: hito-3-notifications — Notifications feed + @mention

Change 2 of Hito 3, built on the archived `hito-3-band-collaboration` (change 1, `f8c1860`). Scope anchor: the change-1 verify report Finding 4 + the named deferral table (`setlists S15 → change 2`; `comments S11 + S12 → change 2`; plus the two notification clauses bandmates S5 and setlists S10 which sit outside that table per Finding 4). This exploration reads real code/migrations only; no assumptions.

### Current State

- **No notification system exists.** The per-setlist "Activity" feed is live-broadcast-only (`setlists.js` 2.3: `broadcastActivity` sends `{action, actor, ts}` over a one-shot Realtime channel; `subscribeActivity` receives; `SetlistDetail.jsx` renders `describeActivity` lines). No persistence, no read state, no cross-device sync, nothing survives a reload/reconnect. This was the disclosed D5/D6 ceiling of change 1 ("fallback `setlist_activity`").
- **Schema is ready for a DB-backed feed** (0001, verbatim to `docs/database-schema-v2.md` §2.7):
  - `notifications` (id, user_id, category `'invitation'|'setlist'|'event'|'system'`, title, body, payload jsonb, read_at, created_at) + index `(user_id, read_at NULLS FIRST, created_at DESC)` — the exact shape the feed scenarios need (badge = unread count, reverse-chron, deep-link payload).
  - 0002 grants: `grant select` + `grant update (read_at)` only — **no INSERT/DELETE**: the 0002 comment states "No INSERT/DELETE — system writes only" (line 432-433). The read/unread path for a client already works today via `notifications_select_self` / `notifications_update_self`.
  - `notification_preferences` (push_enabled, categories jsonb, quiet_start_at/end_at, weekly_digest) exists but is **deny-by-default** (0002 line 108 revoke; zero policies, zero grants) — prefs UI/push are not client-reachable without a migration.
  - `notifications` is NOT in the realtime publication (0006 publishes exactly `setlists`, `setlist_items`, `setlist_collaborators`). `replica identity` not set.
- **Emission sites already exist as events** (change 1, all archived): `bandmate_links` INSERT (invite) / UPDATE status (accept/decline), `setlist_collaborators` INSERT/UPDATE/DELETE (share/permission/removal/transfer), `setlist_items` INSERT (added song), `shared_comments` INSERT (comment). Today none of these create notification rows; "Lucia declined" is only a `declined` row in the inviter's list, "removed" only a local notice.
- **Offline plumbing exists**: IDB `outbox` (offlineQueue.js) + `drainPending` (offlineSync.js) with WRITE_OPS + `reconcileSetlistOp`; drained collab/comment ops replay idempotently. A drained write commits → any DB trigger fires at commit time → **notifications for offline-emitted events materialize automatically on drain**, with "in order" = outbox FIFO.
- **Identity for actors/mentions exists**: `profiles` (0006, 49th table, documented deviation) with `searchProfiles`/`resolveById` (id, username, display_name, avatar_url) — mention resolution (`@username` → id) and actor-name resolution reuse this.
- **UI surfaces to hang off**: `AppLayout.jsx` nav (Home/Repertoire/Setlists/Gigs/Bandmates/Settings/Storage — no Notifications), `App.jsx` routes (no `/notifications`), deep-link precedent `sectionAnchorId` (SongDetail comment jump). No Web Push infra anywhere (service worker is update-only, `updateManager.js`).

### Scenario Scoping (features/notifications.feature — 29 total + 5 named cross-feature deferrals)

**IN — 22 scenarios** (17 from notifications.feature + 5 named deferrals from change 1):

| # | Scenario | Source |
|---|---|---|
| 1 | Receive invitation notification as bandmate (View + Decline buttons) | notifications I1 |
| 2 | Accept a bandmate invitation via notification | notifications I2 |
| 3 | Decline a bandmate invitation via notification (dismiss; "Carlos receives a notification that I declined") | notifications I3 + bandmates S5 |
| 4 | Notification when bandmate reorders a setlist (+ offline badge increments) | notifications S1 |
| 5 | Notification when bandmate adds a song (key/tempo if available) | notifications S2 |
| 6 | Notification when permissions change (view-only) | notifications S3 |
| 7 | Notification when removed from setlist + no further notifications | notifications S4 + setlists S10 |
| 8 | Notification when pending bandmate accepts ("Marco accepted your invitation") | notifications Sys1 |
| 9 | Push-style setlist change notification ("Julian moved Song X to position 1") — **in-app** (Web Push infra absent → see Recommendation) | setlists S15 |
| 10 | Comment posted → participating bandmates notified, deep-link to section | comments S11 |
| 11 | `@mention` notifies the named member | comments S12 |
| 12-18 | In-app feed: reverse-chron + relative time; mark single read; mark all read; grouped by type; filter by category; deep-link navigation; tab badge | notifications Feed1-7 |
| 19 | Notifications queued while offline (emitter side) + badge pending count + in-order delivery on reconnect | notifications Off1 |
| 20 | Offline summary on reconnect ("You have 8 pending notifications", grouped) | notifications Off2 |

**OUT — 12 scenarios (deferred, with reason):**

| Scenario | Reason |
|---|---|
| Org-membership invitation notification (notifications I4) | Org model is Hito 4 (`organizations`/`org_memberships` not built) |
| Event section ×4: new event, reminder before event, 1h-before setlist, performance-order update | `events`/`event_rsvps` not built; reminders need scheduled jobs (A5) |
| Proximity code expiry (notifications Sys2) | Proximity flows deferred from change 1 (bandmates S13); needs invite_codes expiry job |
| Password-reset request notification (notifications Sys3) | Auth-security surface; needs system/auth integration |
| Weekly digest (notifications Sys4) | Scheduled aggregation job; no cron infra |
| Push preferences ×4: master switch, granular categories, quiet hours/DND, OS channels | Web Push absent (no SW push, no VAPID, no OS bridge); `notification_preferences` deny-by-default. In-app-only scope keeps these out (proposal must confirm) |

### Approaches

1. **DB-backed, trigger-emitted notifications (recommended)**
   Migration 0008: security-definer trigger functions on the five event tables (bandmate_links, setlist_collaborators, setlist_items, shared_comments) inserting `notifications` rows inside the same transaction as the event; recipient scope computed from the post-commit row state; actor from `auth.uid()` at event time; `alter publication supabase_realtime add table notifications`; `replica identity full`; optional `notification_preferences` self-UPDATE policy if prefs enter scope (default: out). Client: `notifications.js` (fetch feed / unread count / markRead / markAllRead / `postgres_changes` subscribe filtered `user_id=eq.<me>`), `useNotifications` hook (RLS caps delivery to own rows), `/notifications` route + page (groups, filters, relative time, deep links), AppLayout badge. @mention: shared_comments INSERT trigger parses `@username`, resolves via unique `profiles.username`, scope-checks the named user (same song→setlist→collab EXISTS shape as 0006), inserts a `setlist`-category row with payload `{song_id, setlist_id, anchor, comment_id}`.
   - Pros: persistence = source of truth (feed survives reload/reconnect, cross-device), authoritative badge, read state via existing 0002 `update(read_at)` grant, deep links from `payload` jsonb, per-user realtime channel with built-in RLS cap, offline emission solved for free (drained outbox ops commit → triggers fire → notifications land, FIFO order), matches schema-v2 contract ("system writes; user marks read").
   - Cons: most complex; definer-trigger correctness burden (recipient scoping, NULL-actor fallback); largest migration slice; fan-out N rows per event (trivial at band scale); two feed surfaces must stay deliberately separate (broadcast per-setlist Activity panel vs the new DB feed).
   - Effort: High (~5-6 PR slices under the 400-line guard).

2. **Broadcast-only in-memory (status quo + client derivation)**
   Keep `broadcastActivity`; a notification layer derived client-side from Realtime events; read state/feed in IDB/localStorage.
   - Pros: zero migration, fastest.
   - Cons: fails the core purpose — no persistence across reconnect, no cross-device badge/read sync, offline recipients miss events, "8 pending notifications" summary and Feed scenarios impossible. It is indistinguishable from today's Activity panel (which change 1 already disclosed as a ceiling, D5/D6).
   - Effort: Low — but does not satisfy the IN set; reject as the primary approach.

3. **Hybrid: client-initiated RPC emission + existing outbox queue (no triggers)**
   A security-definer RPC (`notify(event, context)`) computes recipients and inserts rows; every emission site in the client libs calls it after the write; offline emissions reuse `enqueueOp`/WRITE_OPS.
   - Pros: explicit control; actor name passed by the client; no trigger machinery; plugs into the existing outbox pattern.
   - Cons: **not atomic** — a crash between the source write and the notify call loses the notification; recipient set computed from a stale/offline client view (removed recipient can still get a row); a user's event while another recipient is offline still needs the actor's client to emit on their behalf (same fragility as broadcast); per-recipient RPC fan-out. Every future event site must remember to call it — the trigger variant cannot be forgotten.
   - Effort: Medium — acceptable stopgap, weaker correctness than A.

### Recommendation

**Approach 1 (DB-backed, trigger-emitted), with these scope decisions for the proposer/designer:**

- **Push is out; in-app only.** Web Push (SW push subscription, VAPID, OS channels) has zero existing infra. S15 and the "push notification" wordings in notifications.feature are satisfied as in-app feed rows this change; push/quiet-hours/digest/prefs = a later change (their `notification_preferences` scaffolding stays deny-by-default; do NOT open it in 0008 unless the design explicitly needs quiet-hours for the offline summary — recommend OUT).
- **Emission model:** AFTER triggers on `bandmate_links` (insert→invitee, update active→inviter "accepted", update declined→inviter "declined"), `setlist_collaborators` (insert→invitee, update permission→affected user, **BEFORE or AFTER DELETE→removed user**, satisfying "no further notifications" because the row ceases to exist), `setlist_items` (insert→other accepted collaborators + owner), `shared_comments` (insert→participating bandmates + @mention). Actor = `auth.uid()` at event time (available in the trigger transaction for client-originated writes — the only path that exists); resolve display names at read time via `profiles` (comments.js `withAuthorNames` precedent) or store `actor_id` in `payload` (recommended: `payload.actor_id`, keeps the frozen 48-table contract untouched; no schema deviation needed).
- **@mention:** trigger-side parsing on `shared_comments` INSERT (author offline-safe: the notification is born with the committed comment), resolving `@username` against unique `profiles.username` and **requiring the named user to be an accepted collaborator/owner on some setlist containing the song** (0006 EXISTS shape) — a mention of an out-of-scope user must not create a row they cannot open (tap → 42501). Category `'setlist'` (song-scoped) since the enum is frozen.
- **Offline:**

  - *Emitter side:* no new queue — existing outbox ops drain → commit → triggers fire ("queued locally" = the existing pendingSync/outbox; "delivered in order" = FIFO drain; "badge with pending count" = existing pendingSync badge pattern).
  - *Recipient side:* unread count cached in IDB (`offlineCache`, one key — mirrors syncNotices); on `online` → refetch feed + reconcile badge; the "You have 8 pending notifications" summary is a locally synthesized row from the fetch delta (no server job).
- **Two feed surfaces kept separate:** per-setlist Activity panel stays broadcast (change-1 D6); the new global Notifications feed is DB-backed. Unification (e.g., promoting activity to `setlist_activity` rows) is a future change, not this one.
- **Deep links:** `payload` already carries `{setlist_id, song_id, section}` per 0001; add `comment_id` for comment/mention targets; reuse the `sectionAnchorId` scroll/highlight precedent.

PR slicing (400-line review guard): the 22 IN scenarios forecast **HIGH** budget risk → chain: PR#0 `0008` migration (triggers + publication + replica identity, dry-run verifiable) → PR#1 notifications data layer + hook + route/page/badge → PR#2 event wiring (bandmate/setlist emissions + read-state + offline refetch) → PR#3 comments (+mention). sdd-tasks will forecast formally.

### Risks

- **Definer-trigger scope leak** — every trigger must compute recipients from the post-commit row state (accepted_at filters); the removed-user case must use the collaborator DELETE itself so "no further notifications" holds by row absence (not by filtering logic that can rot).
- **Actor resolution** — `auth.uid()` (via `request.jwt.claims`) is absent in non-client contexts (seed, psql dry-runs): triggers must tolerate NULL → fallback "Someone", and the 0008 dry-run must not claim row-level actor assertions it cannot make.
- **Realtime delivery correctness** — `postgres_changes` filtering on the non-PK `user_id` column requires **`replica identity full`** on `notifications` (not set in 0001); 0008 must set it, and publication membership must stay RLS-only tables (dry-run asserts exactly this, 0006 precedent).
- **Mention scope** — resolving `@username` to a row for a non-collaborator creates a notification the user cannot act on (42501 on tap); the scope EXISTS check is mandatory.
- **Two-feed confusion** — broadcast Activity panel vs DB Notifications feed duplicate conceptually; deliberate separation + docs, or reviewers/users will report "missing activity".
- **Feed growth** — no retention policy in 0001; acceptable at band scale, note optional cleanup RPC later.
- **400-line PR budget** — HIGH forecast; chained PRs required (see Recommendation).
- **`notification_preferences` stays locked** — if the design quietly "helps" with a prefs policy, it expands scope into push semantics; keep OUT unless the proposal explicitly claims it.

### Ready for Proposal

Yes. Hand the proposer: the 22-IN/12-OUT scoping table, the trigger-emitted DB approach (A1), the confirmed "in-app only, no push" boundary, the `payload.actor_id` no-schema-deviation stance, and the two-surface decision. Two product confirmations for the user before proposal: (1) push = out (in-app feed only), (2) keep the per-setlist broadcast Activity panel alongside the new global feed.