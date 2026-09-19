# Collaborative Comments Specification

## Purpose

Shared song comments from `features/collaborative-comments.feature`: posting, `{section, index}` anchors (personal_annotations convention), version attachment, threaded replies, author-only edit, resolve, soft-delete, scope-based visibility, RLS no-access enforcement, offline queue. 11 scenarios IN. Notification triggers (notify bandmates, @mention) defer to change 2 — the mention UI event is OUT of scope; no notification row is speced as IN.

## Requirements

### Requirement: Post a shared comment

The system MUST attach a comment to a song with author name and posting time, visible to all band members with access.

#### Scenario: Comment on a song

- GIVEN I am a member of a band that shares "Song A"
- WHEN I post the comment "slow the intro in the chorus"
- THEN the comment attaches to "Song A", all band members with access see it, and it shows my name and the time it was posted

### Requirement: Section anchoring

A comment anchor MUST use the structural `{section, index}` convention of `personal_annotations.anchor`; opening the song MUST jump to the anchored section.

#### Scenario: Comment on a specific section of a chart

- GIVEN I am viewing the chart of "Song A"
- WHEN I anchor a comment on the second chorus
- THEN the comment pins to that section and opening "Song A" jumps to it

### Requirement: Version attachment

A comment MUST attach to a specific `song_versions` row via `version_id`; comments MUST NOT appear on other versions.

#### Scenario: Attach a comment to a particular version

- GIVEN "Song A" has versions v1 and v2 with different chord changes
- WHEN I comment only on the v2 chart
- THEN the comment appears on v2 only and viewing v1 does not show it

### Requirement: Threaded replies

A reply MUST group under its parent comment (`parent_id`), preserving thread order.

#### Scenario: Reply to a comment

- GIVEN "Marco" commented on "Song A" about the bridge
- WHEN I reply to his comment
- THEN my reply groups under Marco's comment and the thread shows both messages in order

### Requirement: Author-only comment edit

Only the author MUST edit a comment, and edits MUST record update history.

#### Scenario: Edit my own comment

- GIVEN I posted a comment with a typo on "Song A"
- WHEN I edit the comment
- THEN the comment text updates and the edit history records my correction

### Requirement: Resolve comments

A resolved comment MUST be marked "resolved" and MUST collapse by default in the thread.

#### Scenario: Resolve a comment after the change is applied

- GIVEN my leader posted "raise the key a step" on "Song A"
- WHEN the key is changed and I mark the comment resolved
- THEN the comment is marked "resolved" and collapsed by default in the comment thread

### Requirement: Soft-delete own comment

Deleting a comment MUST soft-delete (`deleted = true`) and MUST remove it from the thread.

#### Scenario: Delete my own comment

- GIVEN I posted a comment on "Song A"
- WHEN I delete the comment
- THEN the comment is removed from the thread

### Requirement: Comment visibility follows arrangement scope

A comment MUST be visible only to users whose setlist/collaborator scope reaches the song; a member from another org MUST NOT see it.

#### Scenario: Comment visibility follows the setlist/arrangement scope

- GIVEN a setlist shared with the full band
- WHEN a member comments on a song in that setlist
- THEN only band members with access to the arrangement see the comment, and a member from another org cannot see it

### Requirement: Personal annotations stay separate

Personal annotations MUST remain private while shared comments stay band-visible.

#### Scenario: Personal annotations stay separate from shared comments

- GIVEN I have a personal annotation on "Song A" and "Marco" posts a shared comment on it
- WHEN both are rendered
- THEN my annotation stays private to me and the shared comment is visible to the band

### Requirement: No-access enforcement

The system MUST deny comment insert to users without arrangement access, surfacing a "No access" notice (RLS 42501).

#### Scenario: Cannot comment on a song I do not have access to

- GIVEN the arrangement of "Song X" is not shared with me
- WHEN I try to comment on "Song X"
- THEN I see a "No access" notice and cannot post

### Requirement: Offline comment queue

Offline comments MUST save locally with a "pending sync" flag and MUST publish to the band on reconnect.

#### Scenario: Offline comment queues and syncs later

- GIVEN I am offline
- WHEN I post a comment on "Song A"
- THEN the comment saves locally with a "pending sync" flag and publishes to the band when I reconnect

## Deferred Scenarios

| Scenario | Feature ref | Disposition |
|---|---|---|
| Notify bandmates when a comment is posted | comments S11 | → change 2 (notification feed/triggers) |
| Comment mention notifies the named member | comments S12 | → change 2; the `@` mention UI event is OUT of scope — no notification row speced as IN |