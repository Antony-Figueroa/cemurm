# Shared Setlist Collaboration Specification

## Purpose

Band collaboration on setlists from `features/shared-setlist-collaboration.feature`: visibility, roles, realtime updates, client advisory lock, transfer/removal, offline merge, activity feed. 12 scenarios IN. The activity feed is client-derived from Realtime change events (D6 — no `setlist_activity` table; that named table is the fallback only if client-derivation is rejected). Merge-conflict screen and revert defer to change 3; change-notifications push defers to change 2 (deferral table below).

## Requirements

### Requirement: Shared setlist creation and invitation

Visibility MUST be one of `'private' | 'shared' | 'public'` (`org`/`branch` reserved for Hito 4). Sharing MUST create `setlist_collaborators` rows; invitees MUST NOT see or edit the setlist until they accept — acceptance unlocks visibility, so no pre-accept view state exists. (Archive reconciliation, verify Finding 3: 0002 `setlists_select_member` requires `accepted_at IS NOT NULL`, so the earlier "view but not edit" wording is not reachable under the shipped RLS; accept is a view-unlock, not an edit-unlock.)

#### Scenario: Create a shared setlist and invite bandmates

- GIVEN I am the band leader with active bandmates "Julian" and "Lucia"
- WHEN I create "Sunday Jam" and set visibility to "shared with band"
- THEN Julian and Lucia can see the setlist only after accepting — pre-accept they do not see it (acceptance unlocks visibility)

### Requirement: Realtime live updates

Realtime MUST deliver a collaborator's edit to all members with access within 2 seconds.

#### Scenario: Bandmate edits a shared setlist online

- GIVEN shared setlist "Sunday Jam" with Julian and Lucia
- WHEN Julian adds "Song X" at position 3
- THEN Julian sees it at position 3, I see it appear in real time, and Lucia sees the change within 2 seconds

### Requirement: Client advisory lock and conflict toast

A concurrent edit MUST trigger a conflict toast offering "Keep my changes" or "Accept server version". An in-progress edit MUST show a lock notice and MUST disable conflicting actions for other members until save/cancel. Advisory state is client-layer (schema-v2 §3 precedent) — no DB row.

#### Scenario: Bandmate removes a song while someone is editing it

- GIVEN Julian has "Song X" selected in the editor
- WHEN Lucia removes "Song X" from the setlist
- THEN Julian's editor shows a conflict toast with "Keep my changes" or "Accept server version"

#### Scenario: Lock a song during edit

- GIVEN Julian opens "Song B" for editing
- WHEN Lucia tries to move "Song B"
- THEN Lucia sees "Song B is being edited by Julian" and the move button stays disabled until Julian saves or cancels

### Requirement: Collaborative reorder

The system MUST apply a bandmate's reorder to all members and MUST indicate which member reordered.

#### Scenario: Reorder setlist collaboratively

- GIVEN a shared setlist with songs [A, B, C] and three bandmates
- WHEN Julian moves "Song C" to position 1
- THEN the order becomes [C, A, B] for all three and each bandmate sees a "Julian reordered" activity indicator

### Requirement: Offline edit with pending sync

Offline edits MUST save locally with a "pending sync" flag (data layer: `buildOptimisticCollab`, cache-persisted). The "offline indicator to bandmates" clause is DEFERRED/partial — no UI badge renders it on setlist surfaces and no server/feed signal exists for a local pending edit (archive annotation, verify Finding 1).

#### Scenario: Edit a shared setlist while offline

- GIVEN I am offline editing the shared setlist "Friday Gig"
- WHEN I add "Song Y" and remove "Song Z"
- THEN the setlist saves locally with a "pending sync" flag (the bandmate-facing offline indicator clause is deferred — no indicator surface shipped)

### Requirement: Non-conflicting offline merge

On reconnect the system MUST merge non-conflicting offline edits with concurrent online changes (`reconcileSetlistOp`: replay vs drop+notice vs silent no-op). The "record both in the activity feed" clause is DEFERRED/partial — drained ops never broadcast activity events; the feed records only live share/reorder/transfer broadcasts and local emits (archive annotation, verify Finding 2, under the disclosed D5/D6 live-broadcast ceiling).

#### Scenario: Merge offline edits when reconnecting

- GIVEN I removed "Song Z" offline and Julian added "Song W" online meanwhile
- WHEN I reconnect
- THEN the setlist contains "Song W" and lacks "Song Z" (the "both changes appear in the activity feed" clause is deferred — drained merges do not enter the feed)

### Requirement: Offline add vs online delete

A song added offline and deleted online before sync MUST stay absent, with a notice to the offline user.

#### Scenario: Offline bandmate adds a song, another deletes it online

- GIVEN "Marco" adds "Song M" offline and "Julian" deletes it online
- WHEN Marco reconnects
- THEN "Song M" is still absent and Marco sees "Song M was removed by Julian before your sync"

### Requirement: Collaborator permissions and view-only badge

The owner MUST set per-collaborator `can_edit`; view-only collaborators MUST see a "View only" badge and MUST NOT reorder or otherwise modify.

#### Scenario: Setlist owner controls permissions

- GIVEN I set "Julian can edit, Lucia view only" on "Acoustic Night"
- WHEN Julian tries to reorder songs
- THEN Julian reorders successfully, while Lucia sees a "View only" badge and cannot drag songs

### Requirement: Ownership transfer

The owner MUST transfer ownership to a collaborator; the new owner MUST gain ownership controls and the former owner MUST retain edit access.

#### Scenario: Transfer ownership of a shared setlist

- GIVEN I created and own "Sunday Jam"
- WHEN I transfer ownership to Julian
- THEN Julian becomes the new owner, I retain edit access but lose ownership controls, and the activity log records "Ownership transferred to Julian"

### Requirement: Bandmate removal from a setlist

Removal MUST immediately revoke the removed member's view and edit access and MUST surface the change to remaining collaborators via the local "N collaborator(s) remaining" notice. The notification clause ("Julian sees a notification that she was removed") defers to change 2 — see Deferred Scenarios (verify Finding 4).

#### Scenario: Remove a bandmate from a shared setlist

- GIVEN "Sunday Jam" shared with Julian and Lucia
- WHEN I remove "Lucia" from the setlist
- THEN Lucia can no longer edit or view it and the setlist shows "2 collaborators remaining" ("Julian sees a notification that she was removed" defers to change 2 — no notification system ships in this change)

### Requirement: Activity feed

The system MUST show a chronological activity feed of setlist actions with actor and timestamp. The feed MUST be client-derived from Realtime change events (D6 — no `setlist_activity` table in PR#2).

#### Scenario: View setlist activity feed

- GIVEN a shared setlist with several collaborators
- WHEN I open the setlist activity panel
- THEN I see a chronological list of actions, each showing who performed it and when

## Deferred Scenarios

| Scenario | Feature ref | Disposition |
|---|---|---|
| Resolve merge conflict when both edit the same song offline | setlists S8 | → change 3 (conflict policy) |
| Revert setlist to a previous version | setlists S14 | → change 3 (needs version history; activity is client-derived in PR#2) |
| Setlist change notifications (push) | setlists S15 | → change 2 (notifications feed/triggers) |
| Removal notification to remaining collaborators | setlists S10 (clause "Julian sees a notification that she was removed") | → change 2 (notifications feed/triggers); PR#2a surface is the local "N collaborator(s) remaining" notice (verify Finding 4) |