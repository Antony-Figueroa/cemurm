# Proposal: Notifications feed + @mention

## Intent

CEMURM has no notification system. Change 1 (hito-3-band-collaboration, `f8c1860`) disclosed this ceiling explicitly (D5/D6): the per-setlist Activity panel is a live-broadcast-only channel (`broadcastActivity` in `src/lib/setlists.js`) with no persistence, no read state, and nothing that survives reload or reconnect. It also deferred five named scenarios to change 2: bandmates S5 (decline-notifies-inviter), setlists S10 (removal + no further notifications), setlists S15 (push-style setlist change → change 2), comments S11 (comment → participating bandmates), comments S12 (@mention).

The problem: when a bandmate accepts an invitation, reorders a setlist, adds a song, changes permissions, removes someone, or comments/mentions a name, nothing is persisted, recipients get no durable signal, and there is no way to mark things read or see a history after reconnect. The schema is already ready for this (`notifications` table in 0001; `grant select` + `grant update (read_at)` in 0002 under a "system writes only" invariant), so this change turns a schema-contract promise into the product surface the Gherkin already specifies, while keeping Web Push out entirely (zero infra exists: no SW push, no VAPID, no OS bridge).

## Scope

### In Scope — 22 scenarios (17 from `features/notifications.feature` + 5 named deferrals from change 1)

| # | Scenario | Source |
|---|----------|--------|
| 1 | Receive invitation notification as bandmate (View + Decline buttons) | notifications I1 |
| 2 | Accept a bandmate invitation via notification | notifications I2 |
| 3 | Decline a bandmate invitation via notification (dismiss; "Carlos receives a notification that I declined") | notifications I3 + bandmates S5 |
| 4 | Notification when bandmate reorders a setlist (+ offline badge increments) | notifications S1 |
| 5 | Notification when bandmate adds a song (key/tempo if available) | notifications S2 |
| 6 | Notification when permissions change (view-only) | notifications S3 |
| 7 | Notification when removed from setlist + no further notifications | notifications S4 + setlists S10 |
| 8 | Notification when pending bandmate accepts ("Marco accepted your invitation") | notifications Sys1 |
| 9 | Push-style setlist change notification ("Julian moved Song X to position 1") — **in-app row**, Web Push infra absent | setlists S15 |
| 10 | Comment posted → participating bandmates notified, deep-link to section | comments S11 |
| 11 | `@mention` notifies the named member | comments S12 |
| 12–18 | In-app feed: reverse-chron + relative time; mark single read; mark all read; grouped by type; filter by category; deep-link navigation; tab badge | notifications Feed1–7 |
| 19 | Notifications queued while offline (emitter side) + badge pending count + in-order delivery on reconnect | notifications Off1 |
| 20 | Offline summary on reconnect ("You have 8 pending notifications", grouped) | notifications Off2 |

Deliverables: migration 0008 (trigger-emitted writes, realtime publication, `replica identity full`); client data layer + hook; `/notifications` route/page with grouping, filters, relative time, deep links; nav badge; read-state wiring; offline badge cache + refetch.

### Out of Scope — 12 scenarios (deferred, with reason)

| Scenario | Reason |
|----------|--------|
| Org-membership invitation notification (notifications I4) | Org model is Hito 4 (`organizations`/`org_memberships` not built) |
| Event notifications ×4 (new event, reminder, 1h-before setlist, performance-order update) | `events`/`event_rsvps` not built; reminders need scheduled jobs |
| Proximity code expiry (notifications Sys2) | Proximity flows deferred from change 1 (bandmates S13); needs `invite_codes` expiry job |
| Password-reset request notification (notifications Sys3) | Auth-security surface; needs system/auth integration |
| Weekly digest (notifications Sys4) | Scheduled aggregation job; no cron infra |
| Push preferences ×4 (master switch, granular categories, quiet hours/DND, OS channels) | Web Push absent; `notification_preferences` stays deny-by-default |
| Feed unification (promoting per-setlist Activity broadcasts to DB rows) | Deliberate future change; two surfaces kept separate (see Decisions) |

## Decisions (frozen — confirmed by owner, do not reopen)

1. **Web Push = OUT; in-app only.** S15 and every "push notification" wording in `notifications.feature` are satisfied as in-app feed rows. No SW push, no VAPID, no OS channels.
2. **Two feed surfaces stay separate.** The per-setlist Activity panel (change-1 D6, broadcast) is untouched; the new global Notifications feed is DB-backed. Unification is a future change.
3. **`notification_preferences` stays locked.** Deny-by-default (0002 revoke; zero policies, zero grants). No prefs UI or policy in 0008.
4. **`payload.actor_id` recommended** — actor identity stored in `notifications.payload`, keeping the frozen 48-table contract (plus documented `profiles` deviation from 0006) untouched; no schema deviation.
5. **Actor = `auth.uid()`** at event time via `request.jwt.claims`; NULL in non-client contexts (seed, psql dry-runs) → fallback display "Someone".
6. **Removed-user notification is born from the DELETE itself.** "No further notifications" holds by row absence (the collaborator row ceases to exist), not by filter logic that can rot.
7. **`replica identity full` on `notifications`** — required because realtime filtering targets non-PK `user_id`.

## Capabilities

> CONTRACT between proposal and specs phases. Research performed: `openspec/specs/*` read; capability names below match existing spec folders.

### New Capabilities

- `notifications`: DB-backed in-app notification feed — security-definer trigger emission on the five event sites, read/mark-read via existing 0002 grants, realtime delivery, feed page (reverse-chron, grouping, category filter, relative time), nav badge, deep links via `payload`, offline badge cache + refetch, @mention resolution against unique `profiles.username` with collaboration-scope gating.

### Modified Capabilities

- `collaboration-bandmates`: bandmate invitation accept/decline now emit notification rows to the inviter (absorbs deferred bandmates S5); notification UI offers View/Decline actions on invitation rows.
- `shared-setlist-collaboration`: collaborator invite, permission change, removal, song add, and reorder now emit notification rows (absorbs deferred setlists S10 + S15 as in-app rows: S10's "no further notifications" via DELETE-emission).
- `collaborative-comments`: comment INSERT now notifies participating bandmates (S11) and, when the body contains `@username`, the named user (S12) — requires the named user to already be an accepted collaborator/owner on a setlist containing the song (0006 EXISTS shape); category `'setlist'` (frozen enum).
- `row-level-security`: the `supabase_realtime` publication requirement ("MUST add `setlists`, `setlist_items`, and `setlist_collaborators`… publish only RLS-enabled tables", currently exactly those three) extends to include `notifications`; `replica identity full` set on `notifications`; the 0002 "system writes only" invariant gains its defined writers (0008 security-definer trigger functions).

## Approach

**A1 — DB-backed, trigger-emitted notifications** (recommended by exploration; sole approach that satisfies the IN set).

- **Migration 0008** (`supabase/migrations/0008_notifications.sql`): SECURITY DEFINER AFTER triggers on the five emission sites, inserting `notifications` rows in the same transaction as the event:
  - `bandmate_links` INSERT → invitee; UPDATE status→active ("accepted") → inviter; UPDATE status→declined → inviter.
  - `setlist_collaborators` INSERT → invitee; UPDATE (permission) → affected user; DELETE → removed user.
  - `setlist_items` INSERT → other accepted collaborators + owner.
  - `shared_comments` INSERT → participating bandmates; parse `@username`, resolve against unique `profiles.username`, require the named user to pass the same 0006-style collaboration EXISTS scope as the commenter, insert `category='setlist'` row with `payload {song_id, setlist_id, section, comment_id}`.
  - Recipient sets are computed from post-commit row state (e.g., `accepted_at` filters). Actor = `auth.uid()`; NULL-tolerant ("Someone"). `payload.actor_id` carries the raw actor UUID.
  - `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;` + `REPLICA IDENTITY FULL` on `notifications`. Publication stays RLS-only (dry-run asserts).
- **Client data layer** (`src/lib/notifications.js`): fetch feed (RLS-capped), unread count, markRead, markAllRead, `postgres_changes` subscription filtered `user_id=eq.<me>`; **`useNotifications` hook**; **`/notifications` route + page** (groups by type, category filter, relative time, deep-link navigation reusing `sectionAnchorId` precedent); **AppLayout badge** (live realtime + cached fallback).
- **Offline**: emitter side needs no new queue — drained outbox ops commit → triggers fire (FIFO order, badge pending count = existing `pendingSync` pattern). Recipient side: unread count cached in `offlineCache` (one key, mirrors `syncNotices`); on `online` → refetch feed + reconcile badge; "You have 8 pending notifications" = locally synthesized summary row from the fetch delta (no server job).
- **Read state**: reuse existing 0002 `notifications_select_self` / `notifications_update_self` (client already permitted read + `update(read_at)`).

### Delivery plan (400-line review guard)

Budget forecast: **HIGH** → chained PRs required (sdd-tasks will forecast formally):

- **PR#0** — 0008 migration: triggers + publication + replica identity. Dry-run verifiable (asserts publication = RLS-only tables, trigger fires on the 5 sites, NULL-actor fallback works).
- **PR#1** — data layer (`notifications.js`) + `useNotifications` + route/page + AppLayout badge (no emissions yet; feed renders empty-state).
- **PR#2** — event wiring: bandmate/setlist emissions + read-state + offline refetch.
- **PR#3** — comments + @mention.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0008_notifications.sql` | New | Trigger functions (5 sites), `supabase_realtime` publication + `replica identity full`, no prefs policy |
| `src/lib/notifications.js` | New | Feed fetch/unread/markRead/markAllRead/realtime subscription |
| `src/hooks/useNotifications.js` | New | Hook state + postgres_changes + online-refetch reconciliation |
| `src/pages/Notifications.jsx` | New | Feed page: grouping, filters, relative time, deep links, offline summary row |
| `src/App.jsx` | Modified | `/notifications` route |
| `src/components/layout/AppLayout.jsx` | Modified | Nav item + unread badge |
| `src/lib/offlineCache.js` | Modified | Unread-count cache key + delta summary |
| `src/lib/setlists.js`, `src/lib/setlistCollab.js`, `src/lib/bandmates.js`, `src/lib/comments.js` | Modified | Client-side action wiring (accept/decline/View buttons, deep-link targets); emissions stay server-side |
| `src/pages/SetlistDetail.jsx` | Modified | Activity panel kept untouched (two-surface decision); deep-link highlight |
| `src/pages/SongDetail.jsx` | Modified | Comment/mention deep-link target (`sectionAnchorId` precedent) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Definer-trigger scope leak (wrong recipients) | Med | Recipients computed from post-commit row state only; removed-user case uses the DELETE itself (row absence = no further notifications); dry-run assertions |
| Actor resolution NULL (seed/psql contexts) | Med | `auth.uid()` with "Someone" fallback; 0008 dry-run does not claim row-level actor assertions it cannot make |
| Realtime delivery wrong for non-PK filter | Med | `replica identity full` set on `notifications` in 0008; publication membership stays RLS-only (0006 precedent, dry-run asserts exactly this) |
| Mention creates un-openable rows (non-collaborator @mention) | Med | Mandatory 0006-EXISTS scope check when resolving `@username`; no row for out-of-scope names |
| Two-feed confusion (Activity vs Notifications) | Med | Deliberate separation + doc note in specs; no behavioral coupling |
| Feed growth with no retention policy | Low | Acceptable at band scale; optional cleanup RPC noted for later |
| 400-line PR budget | High | Chained PRs PR#0→PR#3; each slice has standalone scope + verification |
| `notification_preferences` accidentally opened | Low | Frozen decision #3; 0008 explicitly contains no prefs policy |

## Rollback Plan

- **Migration**: drop `0008_notifications.sql` and re-run `supabase db reset` — trigger functions removed, `notifications` leaves the publication, `replica identity` reverts to default. Schema returns to the 0007 state; no data migration beyond 0008 (notification rows exist only while 0008 is applied).
- **Client slices**: revert merged PRs individually (PR#3 → PR#2 → PR#1 → PR#0). Removing the route/page/badge/`useNotifications` restores pre-change UI; no persisted client state is on the critical path (badge cache key is disposable).
- **Behavioral fallback**: without 0008, emission sites simply stop writing rows; per-setlist Activity broadcasts (change-1 surface) are untouched and keep working throughout.

## Dependencies

- Local Supabase stack (`supabase start`; realtime already enabled; local realtime must support `replica identity full` change detection — verified in 0006 precedent).
- `@supabase/supabase-js` 2.116 (realtime built-in). No new npm dependencies.
- 0008 builds on 0001 (`notifications` table + index), 0002 (grants/policies/`notification_preferences` deny-by-default), 0006 (`profiles.username` unique, collaboration EXISTS scope), 0007 (comment author writes).
- Two seeded identities for the RLS/realtime walk (existing `docs/local-dev.md` seeds).

## Success Criteria

- [ ] All 22 IN scenarios verified: each emission site (invite/accept/decline, collaborator add/permission/removal, song add, reorder, comment, @mention) produces the expected notification row; removed user receives zero further notifications.
- [ ] 0008 dry-run passes: publication contains exactly the RLS-only tables (now + `notifications`), `replica identity full` on `notifications`, triggers fire with NULL-actor fallback, no prefs policy created.
- [ ] Badge: unread count correct live and after reconnect; mark-single and mark-all update both UI and DB (`read_at`).
- [ ] Offline walk: emitter drains outbox FIFO → rows land in order; recipient offline badge increments, `online` refetch reconciles, "8 pending notifications" summary renders.
- [ ] Two-identity demo: cross-device feed sync via Realtime <2s; deep-link navigation from notification → song section/comment anchor works.
- [ ] `pnpm build` + `pnpm lint` pass (zero warnings); zero Hito 1/2 regression; per-setlist Activity panel behavior unchanged.
- [ ] Delivery stays within the 400-line review guard via the PR#0→PR#3 chain.