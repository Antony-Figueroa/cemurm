# Notifications Specification

## Purpose

DB-backed in-app notification feed from `features/notifications.feature`, materialized by security-definer AFTER triggers (migrations 0008 core + 0009 activity) on the five collaboration emission sites, plus the change-1 named deferrals this change absorbs as in-app notification rows (bandmates S5 decline-clause, setlists S10 removal + S15 setlist-change, comments S11 comment + S12 @mention). Web Push is OUT (no SW push, VAPID, or OS bridge ships — in-app feed only; see Frozen Decisions). 22 scenarios IN.

## Frozen Decisions

1. **Web Push = OUT; in-app only.** Every "push notification" wording in `notifications.feature` is satisfied as in-app feed rows. No SW push, no VAPID, no OS channels. Push preferences ×4 (master switch, granular categories, quiet hours/DND, OS channels) stay OUT — `notification_preferences` remains deny-by-default.
2. **Two feed surfaces stay separate.** The per-setlist Activity panel (change-1 D6, client-derived live-broadcast) is untouched; the new global Notifications feed is DB-backed.
3. **`notification_preferences` stays locked.** Deny-by-default; zero policies, zero grants. No prefs UI or policy ships in migrations 0008/0009.
4. **`payload.actor_id` recommended.** Actor identity stores in `notifications.payload`; no schema deviation beyond the documented 0006 `profiles` deviation.
5. **Actor = `auth.uid()` at event time** via trigger; NULL in non-client contexts (seed, psql dry-runs) → fallback display "Someone".
6. **Removed-user notification is born from the DELETE itself.** "No further notifications" holds by row absence (the collaborator row ceases to exist), not by filter logic.
7. **`replica identity full` on `notifications`** — required because realtime filtering targets non-PK `user_id`.

## Requirements

### Requirement: Invitation notification as bandmate

The system MUST emit a `notifications` row to the invitee when a `bandmate_links` invitation is created, with the inviter as actor and a `View`/`Decline` action surface.

#### Scenario: Receive a bandmate invitation notification

- GIVEN "Julian" invited me to be his bandmate
- WHEN the invitation is created
- THEN I receive an invitation notification with the inviter's name and both a "View" and a "Decline" button

#### Scenario: Accept a bandmate invitation via notification

- GIVEN I have a pending invitation from "Julian"
- WHEN I tap "View" on the notification and accept
- THEN my `bandmate_links` status becomes "active" and shared setlists sync to my device

#### Scenario: Decline a bandmate invitation via notification

- GIVEN I have a pending invitation from "Julian"
- WHEN I tap "Decline" on the notification
- THEN the notification is dismissed, my status becomes "declined", and the inviter sees a notification that I declined (absorbs bandmate S5's "Carlos receives a notification that I declined")

### Requirement: Setlist change notifications

The system MUST emit a `notifications` row to the participating bandmates and owner when a bandmate reorders, adds, or removes content on a shared setlist, or changes collaboration permissions.

#### Scenario: Notification when a bandmate reorders a setlist

- GIVEN "Sunday Jam" is shared with "Julian"
- WHEN Julian reorders songs in the setlist
- THEN I receive a notification "Julian reordered songs in Sunday Jam"
- AND my offline badge unread count increments

#### Scenario: Notification when a bandmate adds a song

- GIVEN "Friday Gig" is shared with "Lucia"
- WHEN Lucia adds "Song X" to the setlist
- THEN I receive a notification "Lucia added Song X to Friday Gig"
- AND the notification shows the song's key and tempo when available

#### Scenario: Notification when permissions change

- GIVEN I am a bandmate on "Gala Set"
- WHEN the owner changes my role from "edit" to "view only"
- THEN I receive a notification "Your permissions on Gala Set have changed to View Only"
- AND my edit controls are disabled after the permission change lands

#### Scenario: Notification when removed from a setlist, then no further notifications

- GIVEN I am a bandmate on "Rehearsal Setlist"
- WHEN the owner removes me from the setlist
- THEN I receive a notification "You have been removed from Rehearsal Setlist" (born from the DELETE itself)
- AND I receive no further notifications for that setlist (the `setlist_collaborators` row ceases to exist)

### Requirement: Bandmate acceptance notification

The system MUST emit a `notifications` row to the inviter when a pending bandmate accepts the invitation.

#### Scenario: Pending bandmate accepts

- GIVEN I invited "Marco" with status "pending"
- WHEN Marco accepts the invitation
- THEN I receive a notification "Marco accepted your invitation"

### Requirement: Setlist change push-style notification (in-app)

Setlist change notifications ("Julian moved Song X to position 1") MUST be delivered as in-app notification rows; Web Push clauses are satisfied as in-app feed rows per Frozen Decision 1.

#### Scenario: Push-style setlist change notification appears in-app

- GIVEN a shared setlist "Friday Gig"
- WHEN Julian moves "Song X" to position 1
- THEN I receive an in-app notification "Julian moved Song X to position 1 in Friday Gig"

### Requirement: Comment and @mention notifications

The system MUST emit a `notifications` row to participating bandmates when a shared comment is posted, and MUST emit one to the named member when a comment contains an `@username` mention of a collaborator.

#### Scenario: Comment posted notifies participating bandmates

- GIVEN I post a comment on "Song A"
- WHEN the comment is committed
- THEN participating bandmates receive a notification with a deep link to the song's section

#### Scenario: @mention notifies the named member

- GIVEN I mention "@julian.guitar" in a comment on "Song A", and Julian is an accepted collaborator/owner on a setlist containing the song
- WHEN the comment is committed
- THEN Julian receives a notification; a mention of a non-collaborator creates no notification row (they could not open it under RLS)

### Requirement: In-app notification feed

The notifications feed MUST display rows in reverse-chronological order with relative time, MUST group rows by type, MUST allow filtering by category, and MUST deep-link to the target surface.

#### Scenario: Feed shows reverse-chronological relative time

- GIVEN I have several notifications
- WHEN I open the notification feed
- THEN notifications show most-recent-first with relative timestamps ("2m ago", "1h ago")

#### Scenario: Mark a single notification as read

- GIVEN I have 3 unread notifications
- WHEN I mark one as read
- THEN that notification's unread badge is removed and the other 2 stay unread

#### Scenario: Mark all notifications as read

- GIVEN I have 5 unread notifications
- WHEN I tap "Mark all as read"
- THEN all 5 are marked read and the unread badge resets to 0

#### Scenario: Notification feed grouped by type

- GIVEN I have setlist and invitation notifications
- WHEN I open the feed
- THEN rows group under "Setlist Changes" and "Invitations" with per-group unread counts

#### Scenario: Filter feed by category

- GIVEN I open the feed with mixed notification types
- WHEN I tap the "Invitations" filter
- THEN only invitation notifications are shown, and I can switch to "Setlist Changes" or "Events" or "System"

#### Scenario: Deep-link from a notification

- GIVEN I receive "Julian added Song X to Friday Gig"
- WHEN I tap the notification
- THEN the app opens "Friday Gig" and highlights/scrolls to the new song's position

#### Scenario: Unread badge on tab icon

- GIVEN I have 3 unread notifications
- WHEN I open the main tab bar
- THEN the Notifications tab shows a badge with "3"; marking all read removes the badge

### Requirement: Offline notification handling

Offline-emitted notifications MUST queue in FIFO order and MUST deliver in order on reconnect; the recipient's unread badge MUST reflect the pending count offline and MUST reconcile on reconnect with an offline summary.

#### Scenario: Notifications queued while offline, delivered on reconnect

- GIVEN I am offline and a bandmate emits setlist notifications
- WHEN I reconnect
- THEN the notifications are delivered in order and the badge count updates to reflect the actual unread state

#### Scenario: Offline summary on reconnect

- GIVEN I was offline and missed 8 notifications
- WHEN I reconnect
- THEN the feed shows an offline summary "You have 8 pending notifications" and the activity feed shows them grouped by type

## Deferred Scenarios

All OUT scenarios from `features/notifications.feature` and the change-1 deferral table are listed by source and reason:

| Scenario | Source | Reason |
|---|---|---|
| New org event notification ("Festival Primavera") | notifications I4 | `organizations`/`org_memberships` are Hito 4; not built |
| Event new/reminder/1h-before setlist/performance-order change | notifications Sys2–Sys4 (event section) | `events`/`event_rsvps` not built; reminders need scheduled jobs |
| Proximity code expiry | notifications Sys1 (proximity) | Proximity codes deferred from change 1 (bandmates S6–S9); needs `invite_codes` expiry job |
| Password-reset request notification | notifications Sys5 | Auth-security surface; needs system/auth integration |
| Weekly digest | notifications Sys6 | Scheduled aggregation job; no cron infra |
| Push preferences ×4 (master, granular, quiet hours, OS channels) | notifications prefs ×4 | Web Push absent per Frozen Decision 1; `notification_preferences` stays locked |
| Org-membership invitation / event reminders / proximity flows | org/events deferred | Future changes (Hito 4 / scheduled jobs) |

## Realtime Delivery

Migration 0009 MUST add `notifications` to the `supabase_realtime` publication and MUST set `replica identity full` so `postgres_changes` subscriptions filtered on non-PK `user_id` honor RLS per subscriber (see the row-level-security delta for the publication contract).

#### Scenario: Subscriber receives only their own notification rows

- GIVEN two users, one the notification recipient and one not
- WHEN a `notifications` row changes for the recipient
- THEN the recipient's `postgres_changes` subscription receives the change and the other user's does not
