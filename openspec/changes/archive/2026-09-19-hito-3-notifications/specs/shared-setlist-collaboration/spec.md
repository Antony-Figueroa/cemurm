# Delta for Shared Setlist Collaboration

## ADDED Requirements

### Requirement: Setlist change notifications as in-app rows

A collaborator's song add, reorder, permission change, or removal on a shared setlist MUST emit a `notifications` row (in-app) to the affected members, in the same transaction as the change (setlists S10/S15 clauses — now IN as in-app rows; the previous "view-only notification" wording in 0002 has no reachable pre-accept view state; see the change-1 archive reconciliation (verify Finding 3) on the 0006 Realtime publication RLS-safe requirement).

#### Scenario: Bandmate reorders a setlist

- GIVEN "Julian" reorders "Sunday Jam" online
- WHEN the reorder commits
- THEN I receive a notification "Julian reordered songs in Sunday Jam" (relative-time timestamp) and my offline badge unread count increments

#### Scenario: Bandmate adds a song

- GIVEN "Julian" adds "Song X" to "Friday Gig"
- WHEN the add commits
- THEN I receive a notification "Julian added Song X to Friday Gig" with the song's key and tempo when available

## MODIFIED Requirements

### Requirement: Bandmate removal from a setlist

Removal MUST immediately revoke the removed member's view and edit access and MUST surface the change to remaining collaborators via the local "N collaborator(s) remaining" notice, and MUST emit a `notifications` row to the removed member in the same transaction (setlists S10 "Julian sees a notification that she was removed" — now IN). The removed member MUST NOT receive further notifications for the setlist (row absence — the `setlist_collaborators` DELETE removes the row, see Realtime publication RLS-safe).

#### Scenario: Remove a bandmate from a shared setlist

- GIVEN "Sunday Jam" shared with Julian and Lucia
- WHEN I remove "Lucia" from the setlist
- THEN Lucia can no longer edit or view it, the setlist shows "2 collaborators remaining", Lucia receives a notification "You have been removed from Sunday Jam", and she receives no further notifications for it

### Requirement: Ownership transfer

The owner MUST transfer ownership to a collaborator; the new owner MUST gain ownership controls and the former owner MUST retain edit access.

#### Scenario: Transfer ownership of a shared setlist

- GIVEN I created and own "Sunday Jam"
- WHEN I transfer ownership to Julian
- THEN Julian becomes the new owner, I retain edit access but lose ownership controls, and the activity log records "Ownership transferred to Julian"
