-- ════════════════════════════════════════════════════════════════════════════
-- 0020 — Review batch 1: criticals + highs from issues #149 (migrations/RLS),
--        #150 (minors/consent) and #151 (community moderation)
-- ════════════════════════════════════════════════════════════════════════════
-- Single carry-all delta migration (task contract, hito4-review-batch1.md §SQL
-- approach): every statement is idempotent — `drop policy if exists` / `create
-- policy` / `create or replace function` / `add column if not exists` /
-- `revoke` / `grant` — so BOTH a fresh full-chain reset (0001 → 0020) and an
-- already-deployed database converge on the same end state. Original migration
-- files stay untouched except the one chain-breaker fixed in place (0019:184,
-- C2): a fresh chain aborts before ever reaching this file.
-- Every referenced object already exists by 0019. Style follows 0015–0019:
-- SECURITY DEFINER + `set search_path = ''` + fully-qualified refs on helpers,
-- policies before grants (D6 order), revoke from public/anon then targeted
-- grants. Nothing here touches src/ (frontend deltas land separately).

-- ══════════════════════ 1. SONGS — PROVENANCE READ, BOUNDED WRITES (#149) ══════════════════════
-- C1 (0016:122): `using (org_id is null)` treated EVERY org-null song as a
-- system-catalog row, but the client's addSong inserts only {created_by, title}
-- (src/lib/songs.js:179) → org_id NULL → metadata (title/artist/genre) of every
-- user's personal repertoire became readable by every authenticated user.
-- System rows are now distinguished by PROVENANCE: org_promote_song stamps
-- source_org_id (0016:379 `coalesce(source_org_id, v_org_id)` → NOT NULL) and
-- org_demote_song restores org_id (the row then leaves this policy's scope for
-- songs_select_org). Provenance-less org-null rows fail closed to owner-only
-- (songs_select_owner); the seeded public entries stay readable through
-- songs_select_public_library (0010:65 — they are live public_songs rows, an
-- OR-scope independent of provenance).
drop policy if exists songs_select_system on public.songs;
create policy songs_select_system on public.songs
  for select to authenticated
  using ((select auth.uid()) is not null and org_id is null and source_org_id is not null);

-- INSERT provenance bound (same family as C1): a system-level insert (org NULL)
-- may carry the caller's own source_org_id, but never ANOTHER org's — closes
-- insert-time provenance forgery. Personal inserts keep source NULL → the
-- `is null` branch leaves every existing client insert path unchanged.
drop policy if exists songs_insert_scoped on public.songs;
create policy songs_insert_scoped on public.songs
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and created_by = (select auth.uid())
    and (org_id is null or org_id = any(private.session_org_ids()))
    and (source_org_id is null or source_org_id = any(private.session_org_ids()))
    and (
      branch_id is null
      or (
        branch_id = any(private.user_branch_ids((select auth.uid())))
        and org_id = (select org_id from public.branches where id = branch_id)
      )
    )
  );

-- songs_update_source_org shipped WITHOUT a WITH CHECK (0016:166): only the
-- old-row USING applied, so an elevated member of the source org could move
-- org_id/branch_id to any foreign tenant (planted content readable there,
-- undeletable by them). The WITH CHECK below re-asserts the elevated-membership
-- invariant on source_org_id (must stay NOT NULL) AND re-satisfies the same
-- org/branch scoping as songs_insert_scoped on the NEW row. The USING stays as
-- shipped (0016:166) — it filters which rows are updatable.
drop policy if exists songs_update_source_org on public.songs;
create policy songs_update_source_org on public.songs
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and source_org_id is not null
    and exists (
      select 1 from public.org_memberships om
      where om.org_id = source_org_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
        and om.role in ('instructor','branch_admin','org_admin','org_owner')
    )
  )
  with check (
    (select auth.uid()) is not null
    and source_org_id is not null
    and exists (
      select 1 from public.org_memberships om
      where om.org_id = source_org_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
        and om.role in ('instructor','branch_admin','org_admin','org_owner')
    )
    and (org_id is null or org_id = any(private.session_org_ids()))
    and (
      branch_id is null
      or (
        branch_id = any(private.user_branch_ids((select auth.uid())))
        and org_id = (select org_id from public.branches where id = branch_id)
      )
    )
  );

-- Literal-column privilege pin: the table-level UPDATE grant (0002:465) makes
-- EVERY update policy above a de-facto source_org_id write path — WITH CHECK
-- cannot reject a column change it never sees as forbidden. Re-open the exact
-- column list WITHOUT source_org_id: provenance stays definer-only
-- (org_promote_song / org_demote_song run as the table owner and are
-- unaffected; service_role keeps its full-table grant). No src/ client writes
-- source_org_id (verified — promote/demote go through the RPCs), so no
-- legitimate path breaks.
revoke update on table public.songs from authenticated;
grant update (id, org_id, branch_id, title, artist, genre, source, is_deleted,
  created_by, created_at, updated_at) on table public.songs to authenticated;

-- event_repertoire is SECURITY DEFINER (bypasses RLS), so C1's new invariant
-- would leak through it untouched: its system branch returned EVERY org-null
-- song — every user's personal repertoire — to any event participant. Narrow
-- the system branch to the same provenance rule, plus the caller's own songs
-- (self-promotion sanity: an organizer still sees what they brought) and live
-- public-library entries (the seeded catalog keeps working). The participating-
-- org branch is unchanged (0016:501-505 — it only ever matched org-scoped rows).
create or replace function private.event_repertoire(
  p_event_id uuid
)
returns table (
  id             uuid,
  title          text,
  artist         text,
  genre          text,
  source_org_id  uuid
)
language plpgsql security definer set search_path = '' as $$
begin
  if not (
    exists (
      select 1 from public.events e
      where e.id = p_event_id and e.organizer_id = (select auth.uid())
    )
    or exists (
      select 1 from public.event_participants ep
      join public.org_memberships om on om.org_id = ep.org_id
      where ep.event_id = p_event_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
    )
  ) then
    raise exception 'Not a participant.';
  end if;

  return query
    select s.id, s.title, s.artist, s.genre, s.source_org_id
    from public.songs s
    where s.is_deleted = false
      and (
        (
          s.org_id is null
          and (
            s.source_org_id is not null
            or s.created_by = (select auth.uid())
            or exists (
              select 1 from public.public_songs ps
              where ps.song_id = s.id and ps.status = 'live'
            )
          )
        )
        or exists (
          select 1 from public.event_participants ep
          where ep.event_id = p_event_id and ep.org_id = s.org_id
        )
      )
    order by s.title;
end $$;

-- re-issue the 0016:529/535/540/545 grants (0017 defensive pattern): create or
-- replace preserves ACLs, but re-stating them keeps this file the single place
-- to read the function's audience from.
revoke execute on function private.event_repertoire(uuid) from public, anon;
revoke execute on function public.event_repertoire(uuid) from public, anon;
grant execute on function private.event_repertoire(uuid) to authenticated;
grant execute on function public.event_repertoire(uuid) to authenticated;

-- ══════════════════════ 2. EVENTS — PARTICIPANT + SETLIST SCOPING (#149) ══════════════════════
-- event_participants.org_id is NOT NULL (0001:253) and the INSERT/UPDATE
-- policies only checked "I organize this event" (0016:221-230, 232-241): an
-- attacker creates their own event E, inserts (E, victim_org) — the org edge is
-- unconstrained — then calls event_repertoire(E) and gets the victim org's
-- entire private and branch repertoire (title/artist/genre), bypassing
-- songs_select_org / songs_select_branch. Bind org_id to the organizer's OWN
-- active memberships (0004:229) on both write paths.
drop policy if exists event_participants_insert_organizer on public.event_participants;
create policy event_participants_insert_organizer on public.event_participants
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
    and org_id = any(private.session_org_ids())
  );

-- UPDATE: USING stays organizer-of-the-current-row (0016:232) so the organizer
-- can still repair or delete a row planted before this fix; the explicit WITH
-- CHECK (an explicit WITH CHECK replaces the USING-on-new-row fallback)
-- re-states the organizer check for the NEW event_id and bounds the NEW org_id,
-- so neither the event edge nor the org edge can be re-pointed cross-tenant.
drop policy if exists event_participants_update_organizer on public.event_participants;
create policy event_participants_update_organizer on public.event_participants
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
    and org_id = any(private.session_org_ids())
  );

-- event_setlists_update_organizer: the shipped WITH CHECK (0016:319-325) only
-- re-checked "new event not concluded" — an organizer could PATCH their row
-- onto a DIFFERENT organizer's non-concluded event (slot hijack), or set a
-- foreign org_id (0001:272 allows NULL or any org). The new WITH CHECK
-- re-verifies organizer-of-the-NEW-event + not-concluded (both fall back from
-- USING today, so they must be restated), scopes org_id to the caller's active
-- memberships, pins visibility to the four documented values (0001:276 — the
-- column has NO check constraint), and keeps the row pointing at a base setlist
-- the caller owns (0002:142 session_owns_setlist, owner-only). USING stays as
-- shipped: organizer-of-the-current-event.
drop policy if exists event_setlists_update_organizer on public.event_setlists;
create policy event_setlists_update_organizer on public.event_setlists
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
    and not exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'concluded'
    )
    and (org_id is null or org_id = any(private.session_org_ids()))
    and visibility in ('private', 'org', 'event', 'public')
    and private.session_owns_setlist(setlist_id)
  );

-- ══════════════════════ 3. MINORS — SIGNUP DERIVATION + PROFILE LOCK (#150) ══════════════════════
-- C3 (0017:51+131 vs src/lib/auth.js): nothing in the repo ever wrote
-- profiles.date_of_birth (handle_new_user inserted `(id)` only), so is_minor
-- stayed at `default false` forever → session_is_minor() was ALWAYS false:
-- (1) a minor's consent RPC raised 'Consent is only required for minors.' —
-- the account could never unlock; (2) the server-side publish guard
-- (0017:227) never armed — only the client-side UI gate stood in the way.
-- Derive is_minor at SIGNUP from auth.raw_user_meta_data->>'isMinor' —
-- INSERT-TIME only, so a later updateUser metadata edit cannot flip an
-- existing account. The CASE cast is deliberately total: absent or
-- unrecognised values resolve to false (malformed metadata must never abort
-- signup), which also keeps metadata-less adult signups false. Clients still
-- have no is_minor column grant in any position (see section 3.3), so this
-- trigger function is its only writer besides the dob recompute below.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, is_minor)
  values (
    new.id,
    case lower(coalesce(new.raw_user_meta_data->>'isMinor', 'false'))
      when 'true' then true
      when 't'    then true
      when 'yes'  then true
      when '1'    then true
      else false
    end
  );
  return new;
end $$;

-- trigger-only entry point stays locked after the replace (0006:54 re-issued).
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- C3 reconciliation with the `before insert or update of date_of_birth`
-- trigger: the OF-clause fires on THIS profile INSERT too, and the shipped
-- body (`dob is not null and …`, 0017:51) clobbered the derived flag back to
-- false (dob is never set at signup). New precedence: dob wins WHEN PRESENT —
-- preserving the minor→adult consent archive (scenario 8) — otherwise keep the
-- supplied flag so the signup derivation passes through. old is NULL on
-- INSERT, so the archive branch stays a no-op there; on a dob UPDATE the
-- transition logic is unchanged.
create or replace function private.set_profile_minor_flag() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.date_of_birth is not null then
    new.is_minor := new.date_of_birth > (current_date - interval '18 years');
  else
    new.is_minor := coalesce(new.is_minor, false);
  end if;
  -- minor → adult transition (old is NULL on INSERT → no-op): archive active consents
  if old.is_minor and not new.is_minor then
    update public.guardian_consents
    set status = 'archived', archived_at = now()
    where user_id = new.id and status = 'active';
  end if;
  return new;
end $$;

-- trigger-only entry point stays locked after the replace (0017:62 re-issued).
revoke all on function private.set_profile_minor_flag() from public, anon, authenticated;

-- H8 (0017:71): `grant update (date_of_birth)` + the recompute trigger let the
-- minor's own session rewrite dob in a single PATCH profiles → is_minor flips
-- to false → active consent archived → publish guard and revocation scenario
-- both bypassed. Re-lock and re-open only the 0006 column sets WITHOUT dob:
--   - column grants live per-attribute (attacl), `revoke all on table` clears
--     the table-level ACL only → the dob grant needs its own explicit revoke;
--   - DELETE is dropped entirely: no src/ flow deletes profiles (verified),
--     and profiles_delete_self + profile_is_minor coalescing a missing row to
--     false would make self-delete a publish-guard bypass;
--   - is_minor / date_of_birth are in no select/insert/update grant, so they
--     stay server-side only (0017:68 posture preserved);
--   - service_role keeps its full-table grant (0006:178, backend access).
revoke all on table public.profiles from anon, authenticated;
revoke update (date_of_birth) on table public.profiles from authenticated;
revoke delete on table public.profiles from authenticated;
grant select (id, username, display_name, avatar_url) on table public.profiles to authenticated;
grant insert (id, display_name, username, instrument, avatar_url) on table public.profiles to authenticated;
grant update (display_name, username, instrument, avatar_url) on table public.profiles to authenticated;

-- ══════════════════════ 5. GUARDIAN SHARING APPROVAL — CAPABILITY TOKEN (#150) ══════════════════════
-- H10 (0017:318-337 + SongDetail.jsx:643): 'Approve public sharing' was
-- rendered in the MINOR's own song page while the RPC demanded
-- p_user_id = auth.uid() AND session_is_minor() — the only possible actor was
-- the minor themself, i.e. self-approval of their own public sharing (the
-- feature requires "when the guardian approves"). Mirror the login-less
-- REVOCATION capability pattern (0017:353+: guardian_email + revocation_token,
-- anon-granted RPC, single bounded UPDATE): each consent row gets its own
-- sharing_approval_token, the guardian approves through a link carrying
-- (user_id, guardian_email, token) without authenticating, and the UPDATE
-- below is the entry point's entire reach — one flag flip on one active row.
alter table public.guardian_consents
  add column if not exists sharing_approval_token uuid not null default gen_random_uuid();

-- Capability check: (user_id + guardian_email + sharing_approval_token) is the
-- witness. Any mismatch (wrong token, wrong guardian, unknown user) and any
-- non-active row (already approved, revoked, archived) collapse into one
-- error — no oracle, no state reachable beyond public_sharing_approved.
create or replace function private.approve_guardian_sharing(
  p_user_id uuid,
  p_guardian_email text,
  p_sharing_approval_token uuid
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.guardian_consents
  set public_sharing_approved = true,
      public_sharing_approved_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and guardian_email = p_guardian_email
    and sharing_approval_token = p_sharing_approval_token
    and status = 'active';

  if not found then
    raise exception 'Consent not found or already finalized.';
  end if;
end $$;

create or replace function public.approve_guardian_sharing(
  p_user_id uuid,
  p_guardian_email text,
  p_sharing_approval_token uuid
)
returns void
language sql security definer set search_path = '' as $$
  select private.approve_guardian_sharing(p_user_id, p_guardian_email, p_sharing_approval_token);
$$;

-- 0017:436-439 grant mirror: private layer authenticated-only; the public
-- wrapper is the SECOND and last anon-granted surface in the app (first:
-- revoke_guardian_consent) — anon access is exactly what makes the guardian's
-- login-less link work, and the capability tuple above bounds its effect.
revoke execute on function private.approve_guardian_sharing(uuid, text, uuid) from public, anon;
revoke execute on function public.approve_guardian_sharing(uuid, text, uuid) from public, anon;
grant execute on function private.approve_guardian_sharing(uuid, text, uuid) to authenticated;
grant execute on function public.approve_guardian_sharing(uuid, text, uuid) to anon, authenticated;

-- Drop the self-approval path entirely (authenticated bypass): both layers go,
-- nothing else references them (verified over 0001..0019 and src/), and a drop
-- takes its grants with it. The publish guard (0017:227) reads
-- public_sharing_approved — both flows set that same flag; only WHO may set it
-- changed, from the minor to whoever holds the token.
drop function if exists public.approve_guardian_public_sharing(uuid);
drop function if exists private.approve_guardian_public_sharing(uuid);
