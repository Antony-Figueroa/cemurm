# Delta for Collaborative Comments

## ADDED Requirements

### Requirement: Comment notification to participating bandmates

Posting a comment MUST emit a `notifications` row to band members participating in the setlist containing the commented song, with a deep link to the anchored section (comments S11 — now IN).

#### Scenario: Bandmate receives a comment notification with a deep link

- GIVEN "Julian" posted a comment on "Song A" in a setlist I collaborate on
- WHEN the comment commits
- THEN I receive a notification "Julian commented on Song A" that deep-links to the anchored section

### Requirement: @mention notifies the named member

A comment that contains `@username` MUST emit a `notifications` row to the named member, but only when that member is a collaborator/owner with arrangement scope (comments S12 — now IN). Mention resolution MUST reuse `profiles.username` unique lookup with the shared-setlist/arrangement scope check; a mention of an out-of-scope user MUST NOT create a notification (cannot open it under RLS).

#### Scenario: @mention notifies the named bandmate

- GIVEN I post "Julian @julian.guitar, fix the bridge on Song A"
- WHEN the comment commits
- THEN Julian receives a notification "@julian.guitar mentioned you in Song A" that deep-links to the section

#### Scenario: Mention of a non-participating user creates no notification

- GIVEN "@marco.tempo" is not a collaborator/owner with access on the song's setlist
- WHEN I post "Song A is great @marco.tempo"
- THEN no notification is created for Marco (RLS scope check — no un-openable row)
