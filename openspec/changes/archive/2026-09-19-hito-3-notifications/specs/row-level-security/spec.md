# Delta for Row-Level Security

## ADDED Requirements

### Requirement: Notifications replica identity full

Migration 0009 MUST set `replica identity full` on `notifications` — required because realtime filtering targets the non-PK `user_id` column and the old value (no full identity) cannot honor RLS per subscriber for Postgres changes on a non-PK field (Realtime publication)

#### Scenario: Notifications replica identity full honors RLS per subscriber

- GIVEN `notifications` replica identity after 0009
- WHEN a `notifications` row changes for a recipient
- THEN the recipient's `postgres_changes` subscription receives it and a non-recipient's does not

## MODIFIED Requirements

### Requirement: Realtime publication RLS-safe

Migration 0006 MUST add `setlists`, `setlist_items`, and `setlist_collaborators` to the `supabase_realtime` publication, and MUST publish only RLS-enabled tables so `postgres_changes` honors RLS for each subscriber. Migration 0009 MUST also add `notifications` to the publication — realtime notification filtering targets the non-PK `user_id` column and relies on `replica identity full` (set by 0009) so `postgres_changes` honors RLS per subscriber.

#### Scenario: Subscribers receive only readable rows

- GIVEN two users, one with setlist access and one without
- WHEN a `setlists` row changes
- THEN the authorized user's `postgres_changes` subscription receives the change and the unauthorized user's does not

#### Scenario: Publication limited to RLS-enabled tables after 0009

- GIVEN the `supabase_realtime` publication after 0009
- WHEN listing published tables
- THEN `setlists`, `setlist_items`, `setlist_collaborators`, and `notifications` are published and no non-RLS table is

#### Scenario: Notification rows filter by non-PK user_id honoring RLS

- GIVEN the `notifications` table with `replica identity full` after 0009
- WHEN a `notifications` row changes
- THEN the recipient's `postgres_changes` subscription receives the change and another user's subscription does not (non-PK `user_id` filter honors RLS via replica identity full)