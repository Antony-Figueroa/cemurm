# Delta for Row-Level Security

## ADDED Requirements

### Requirement: Profiles table with RLS

Migration 0006 MUST add `profiles` (id → auth.users CASCADE, display_name, username UNIQUE nullable, instrument, avatar_url) — a **documented deviation** adding a 49th DDL table beyond the 48-table contract (`auth.users` is not client-queryable, so bandmate search needs a public identity surface; Supabase-standard pattern). RLS MUST grant the owner self CRUD and MUST grant authenticated users search-SELECT over limited columns only. A trigger MUST auto-create the profile row on signup.

#### Scenario: Self-only CRUD on profiles

- GIVEN a user with an auto-created profile row
- WHEN the user reads or updates their profile
- THEN only their own row is visible and editable

#### Scenario: Authenticated search is column-limited

- GIVEN several users with profiles
- WHEN an authenticated user searches `profiles`
- THEN only limited columns (username, display_name, avatar_url) are exposed

### Requirement: Bandmate links pair-scoped RLS

`bandmate_links` MUST be readable and writable only by the two users of the pair (`user_id`/`bandmate_id`), replacing the 0002 deny-by-default revoke (previously: zero policies, service-role only).

#### Scenario: Bandmate pair reads their link

- GIVEN a `bandmate_links` row pairing user A and user B
- WHEN A or B queries `bandmate_links`
- THEN only rows involving them are returned, and inserts/updates affecting their own pair succeed

#### Scenario: Non-pair sees zero rows

- GIVEN user C is in neither side of the pair
- WHEN C queries `bandmate_links`
- THEN zero rows are returned

### Requirement: Shared comments arrangement-scoped RLS

`shared_comments` MUST scope select and insert through a JOIN-free, nested EXISTS chain — song → `setlist_items` → `setlists` → `setlist_collaborators` — where the setlist hop matches `owner_id = auth.uid()` OR an accepted `setlist_collaborators` row (0004 nested single-relation shape; no joins per the acyclic policy-graph constraint). The RLS skeleton MUST ship in 0006 even though notification triggers defer to change 2.

#### Scenario: Band member with access reads and comments

- GIVEN a song inside a setlist the user owns or is an accepted collaborator on
- WHEN the user selects or inserts a `shared_comments` row for that song
- THEN the row is returned / inserted successfully

#### Scenario: No-access insert is denied

- GIVEN the arrangement of "Song X" is not shared with the user
- WHEN the user inserts a `shared_comments` row for "Song X"
- THEN the insert fails with RLS denial (42501) and zero rows are readable

### Requirement: Setlist collaborator self-accept

Migration 0006 MUST add a `setlist_collaborators` UPDATE policy allowing an invitee to set `accepted_at` on their own row — fixing the 0002 gap where only owner-management UPDATE exists (invitee acceptance loop is broken today). Owner-management policies MUST remain unchanged.

#### Scenario: Invitee accepts their invitation

- GIVEN a pending `setlist_collaborators` row for the current user
- WHEN the user updates `accepted_at` on their own row
- THEN the update succeeds and the user gains collaborator visibility on the setlist

#### Scenario: View-only collaborator still cannot write setlists

- GIVEN the invitee accepted with `can_edit = false`
- WHEN they attempt to update the `setlists` row
- THEN the write is denied (existing owner/can_edit 0002 shape preserved)

### Requirement: Realtime publication RLS-safe

Migration 0006 MUST add `setlists`, `setlist_items`, and `setlist_collaborators` to the `supabase_realtime` publication, and MUST publish only RLS-enabled tables so `postgres_changes` honors RLS for each subscriber.

#### Scenario: Subscribers receive only readable rows

- GIVEN two users, one with setlist access and one without
- WHEN a `setlists` row changes
- THEN the authorized user's `postgres_changes` subscription receives the change and the unauthorized user's does not

#### Scenario: Publication limited to RLS-enabled tables

- GIVEN the `supabase_realtime` publication after 0006
- WHEN listing published tables
- THEN `setlists`, `setlist_items`, and `setlist_collaborators` are published and no non-RLS table is