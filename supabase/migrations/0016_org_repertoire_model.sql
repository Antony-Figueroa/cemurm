-- CEMURM 0016 — Organizational Repertoire Model: RLS + helpers + RPCs
--
-- Slice: features/organizational-repertoire-model.feature (Backend#3) — same
-- slice as 0018 on the sibling branch, here WITHOUT its DDL slices (0001
-- already ships organizations/branches/org_memberships/events/event_participants/
-- event_setlists/user_roles; this migration ONLY adds the access layer).
--
-- Contract shape (0012 convention): SECURITY DEFINER cores in `private`
-- (search_path = '', fully-qualified refs, initPlan auth.uid() guard) + one
-- thin `public` wrapper per entry point; REVOKE from anon/public then GRANT to
-- authenticated (+ service_role for helpers) — 0002/0010/0012 pattern. The new
-- `private.session_has_system_role(text)` helper is SECURITY DEFINER stable,
-- locked to authenticated/service_role, PUBLIC default revoked.
--
-- Scenario map (organizational-repertoire-model.feature):
--  · system unified catalog open to all authenticated (org null) — RLS org-level
--    / branch-level scoping; outsiders see system songs only (scenario: system
--    repertoire as unified catalog; branch repertoire visibility).
--  · org adds a song to the system repertoire (promote_song_to_system) with
--    source_org_id provenance; source org keeps edit rights on its system song
--    (songs_update_source_org); system_admin can promote/demote.
--  · demote_song_to_org returns the song to its source org (system_admin +
--    org-role union).
--  · event repertoire picker: system + participating orgs' songs, organizer /
--    participating-member scoped; concluded events are read-only archives.
--  · cross-branch visibility stays per-orb; event_setlists gated by visibility
--    ('private'|'org'|'event'|'public').
--
-- ⚠ POLICY-RECURSION CONTRACT (0002 rule): every policy subquery points DOWN
-- only — helpers are SECURITY DEFINER (definer bypass) and each table's
-- policies reference strictly single-level data (auth.uid(), own rows) or
-- definer helpers, never a table whose own policy points back. Verified clean:
-- songs → org_memberships/orgs/branches (definer + one-way); event_setlists →
-- events (organizer subquery, no back-ref); event_* → events/participants
-- (events policies never re-enter event_*). No table forms a 2-relation cycle.

-- ══════════════════════ 1. HELPER — SYSTEM ROLE CHECK ══════════════════════
-- SECURITY DEFINER + search_path='' + fully-qualified user_roles ref (0002
-- convention lines 26-30 shape); binds v_role, not the caller, so no forgery.
-- user_roles survives 0002's revoke (0002 line 65) and gets NO table RLS here —
-- the definer helper is the only reader (community-moderation owns the role
-- appointments). Revoke from public/anon, grant only authenticated+service_role.
create or replace function private.session_has_system_role(v_role text)
returns boolean
language sql security definer stable set search_path = '' as $$
  select exists(
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = v_role) $$;

revoke execute on function private.session_has_system_role(text) from public, anon;
grant execute on function private.session_has_system_role(text) to authenticated, service_role;

-- locked default: no new private helper may leak to anon
alter default privileges in schema private revoke execute on functions from public, anon;

-- ══════════════════════ 2. RLS POLICIES ══════════════════════
-- Drop-if-exists + create (D6 order; before grants). All to authenticated.
-- Organizations hold ONLY discovery metadata (A1 exception): any authenticated
-- reads all org records — the unified-catalog picker needs the org list.

-- organizations: any authenticated reads metadata (system unified catalog org list)
drop policy if exists organizations_select_any_auth on public.organizations;
create policy organizations_select_any_auth on public.organizations
  for select to authenticated
  using ((select auth.uid()) is not null);

-- branches: member-scoped + system-scoped; non-members see 0 rows
drop policy if exists branches_select_member on public.branches;
create policy branches_select_member on public.branches
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and private.is_org_member((select auth.uid()), org_id) is not null
  );

drop policy if exists branches_select_system on public.branches;
create policy branches_select_system on public.branches
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and private.session_has_system_role('system_admin')
  );

-- org_memberships: self (own row incl. 'former' history read-only) +
-- org-roster admin + system admin
drop policy if exists org_memberships_select_self on public.org_memberships;
create policy org_memberships_select_self on public.org_memberships
  for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists org_memberships_select_org_admin on public.org_memberships;
create policy org_memberships_select_org_admin on public.org_memberships
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and private.session_role_in((select auth.uid()), org_id, array['org_owner','org_admin'])
  );

drop policy if exists org_memberships_select_system on public.org_memberships;
create policy org_memberships_select_system on public.org_memberships
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and private.session_has_system_role('system_admin')
  );

-- ══════════════════════ 2.2 SONGS — LEVEL-SCOPED READ + SCOPED INSERT ══════════════════════
-- System-level songs (org NULL) read by EVERY authenticated (unified catalog);
-- org-level songs (org NOT NULL, branch NULL) read by org members + system admins;
-- branch-level songs (branch NOT NULL) read by members of that branch.
-- INSERT: scoped — creator may put a song at system level (org NULL), at an org
-- level they belong to, or at a branch they belong to (branch must belong to
-- the same org; org must be one the user is an active member of). This lets a
-- demo/existing org member seed the system catalog (scenario: "Org promotes a
-- song to the system repertoire") while an outsider can never plant a song into
-- an org they don't belong to.
drop policy if exists songs_select_owner on public.songs;
create policy songs_select_owner on public.songs
  for select to authenticated
  using ((select auth.uid()) is not null and created_by = (select auth.uid()));

drop policy if exists songs_select_system on public.songs;
create policy songs_select_system on public.songs
  for select to authenticated
  using ((select auth.uid()) is not null and org_id is null);

drop policy if exists songs_select_org on public.songs;
create policy songs_select_org on public.songs
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and org_id is not null and branch_id is null
    and private.is_org_member((select auth.uid()), org_id) is not null
  );

drop policy if exists songs_select_branch on public.songs;
create policy songs_select_branch on public.songs
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and branch_id is not null
    and branch_id = any(private.user_branch_ids((select auth.uid())))
  );

-- REPLACE: drop the old owner-only insert, scope it (instructor can add at own
-- branch; a member can add at their org; system-level = org NULL allowed).
drop policy if exists songs_insert_owner on public.songs;
drop policy if exists songs_insert_scoped on public.songs;
create policy songs_insert_scoped on public.songs
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and created_by = (select auth.uid())
    and (org_id is null or org_id = any(private.session_org_ids()))
    and (
      branch_id is null
      or (
        branch_id = any(private.user_branch_ids((select auth.uid())))
        and org_id = (select org_id from public.branches where id = branch_id)
      )
    )
  );

-- source org keeps edit rights on its system-level song (promote/demote
-- provenance; scenario "only Org A can edit its promoted version").
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
  );

-- ══════════════════════ 2.3 EVENTS + PARTICIPATION ══════════════════════
-- events: metadata + picker readable by any authenticated (A1 discovery);
-- writes organizer-only (insert/update/delete = organizer_id = auth.uid()).
drop policy if exists events_select_any_auth on public.events;
create policy events_select_any_auth on public.events
  for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists events_insert_organizer on public.events;
create policy events_insert_organizer on public.events
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and organizer_id = (select auth.uid())
  );

drop policy if exists events_update_organizer on public.events;
create policy events_update_organizer on public.events
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and organizer_id = (select auth.uid())
  );

drop policy if exists events_delete_organizer on public.events;
create policy events_delete_organizer on public.events
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and organizer_id = (select auth.uid())
  );

-- event_participants: any authenticated SEES participant lists (A1);
-- INSERT/UPDATE/DELETE organizer-only (via events EXISTS subquery; events
-- policies never re-enter event_* → acyclic).
drop policy if exists event_participants_select_any_auth on public.event_participants;
create policy event_participants_select_any_auth on public.event_participants
  for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists event_participants_insert_organizer on public.event_participants;
create policy event_participants_insert_organizer on public.event_participants
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

drop policy if exists event_participants_update_organizer on public.event_participants;
create policy event_participants_update_organizer on public.event_participants
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

drop policy if exists event_participants_delete_organizer on public.event_participants;
create policy event_participants_delete_organizer on public.event_participants
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

-- event_rsvps: self-only CRUD-ish (select/insert/update); member_id = auth.uid()
drop policy if exists event_rsvps_select_self on public.event_rsvps;
create policy event_rsvps_select_self on public.event_rsvps
  for select to authenticated
  using ((select auth.uid()) is not null and member_id = (select auth.uid()));

drop policy if exists event_rsvps_insert_self on public.event_rsvps;
create policy event_rsvps_insert_self on public.event_rsvps
  for insert to authenticated
  with check ((select auth.uid()) is not null and member_id = (select auth.uid()));

drop policy if exists event_rsvps_update_self on public.event_rsvps;
create policy event_rsvps_update_self on public.event_rsvps
  for update to authenticated
  using ((select auth.uid()) is not null and member_id = (select auth.uid()));

-- event_setlists: SELECT for organizer OR own-org member OR event-visibility
-- participant (EXISTS subqueries downward — events/org_memberships policies
-- never reference event_setlists, no cycle); INSERT/UPDATE organizer-only;
-- UPDATE/DELETE blocked once the event is concluded (read-only archive).
drop policy if exists event_setlists_select_participant on public.event_setlists;
create policy event_setlists_select_participant on public.event_setlists
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      exists (
        select 1 from public.events e
        where e.id = event_id and e.organizer_id = (select auth.uid())
      )
      or (org_id is not null and private.is_org_member((select auth.uid()), org_id) is not null)
      or (
        visibility = 'event'
        and exists (
          select 1 from public.event_participants ep
          join public.org_memberships om on om.org_id = ep.org_id
          where ep.event_id = event_id
            and om.user_id = (select auth.uid())
            and om.status = 'active'
        )
      )
    )
  );

drop policy if exists event_setlists_insert_organizer on public.event_setlists;
create policy event_setlists_insert_organizer on public.event_setlists
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

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
    and not exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'concluded'
    )
  );

drop policy if exists event_setlists_delete_organizer on public.event_setlists;
create policy event_setlists_delete_organizer on public.event_setlists
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
    and not exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'concluded'
    )
  );

-- ══════════════════════ 3. RPCs — PROMOTE / DEMOTE / LEAVE / EVENT REPERTOIRE ══════════════════════
-- SECURITY DEFINER cores in private + thin public wrappers (0012 convention).
-- Business-rule failures raise EXACT user-facing strings (client maps them).

-- ───────────── 3.1 PROMOTE (org/branch → system) ─────────────
create or replace function private.org_promote_song(p_song_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_caller  uuid := (select auth.uid());
  v_org_id  uuid;
  v_song_id uuid;
begin
  if v_caller is null then
    raise exception 'Song not found.';
  end if;

  select org_id into v_org_id from public.songs where id = p_song_id;
  if not found then
    raise exception 'Song not found.';
  end if;

  if v_org_id is null then
    raise exception 'Song is already at system level.';
  end if;

  -- caller must be system_admin OR an active elevated member of the song's org
  if not (
    private.session_has_system_role('system_admin')
    or private.session_role_in(
         v_caller, v_org_id, array['instructor','branch_admin','org_admin','org_owner'])
  ) then
    raise exception 'You can only promote songs from your own organization.';
  end if;

  update public.songs
  set org_id = null, branch_id = null,
      source_org_id = coalesce(source_org_id, v_org_id),
      updated_at = now()
  where id = p_song_id;
end $$;

create or replace function public.promote_song_to_system(p_song_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.org_promote_song(p_song_id);
$$;

-- ───────────── 3.2 DEMOTE (system → source org) ─────────────
create or replace function private.org_demote_song(p_song_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_caller         uuid := (select auth.uid());
  v_org_id         uuid;
  v_source_org_id  uuid;
begin
  if v_caller is null then
    raise exception 'Song not found.';
  end if;

  select org_id, source_org_id into v_org_id, v_source_org_id
  from public.songs where id = p_song_id;
  if not found then
    raise exception 'Song not found.';
  end if;

  if v_org_id is not null then
    raise exception 'Song is not at system level.';
  end if;

  if v_source_org_id is null then
    raise exception 'Song has no source organization.';
  end if;

  if not (
    private.session_has_system_role('system_admin')
    or private.session_role_in(
         v_caller, v_source_org_id, array['instructor','branch_admin','org_admin','org_owner'])
  ) then
    raise exception 'You can only demote songs owned by your organization.';
  end if;

  update public.songs
  set org_id = v_source_org_id, branch_id = null, updated_at = now()
  where id = p_song_id;
end $$;

create or replace function public.demote_song_to_org(p_song_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.org_demote_song(p_song_id);
$$;

-- ───────────── 3.3 LEAVE ORGANIZATION ─────────────
create or replace function private.org_leave(p_org_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.org_memberships
    where user_id = (select auth.uid())
      and org_id = p_org_id and status = 'active'
  ) then
    raise exception 'Not a member.';
  end if;

  update public.org_memberships
  set status = 'former', left_at = now()
  where user_id = (select auth.uid())
    and org_id = p_org_id and status = 'active';
end $$;

create or replace function public.leave_organization(p_org_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.org_leave(p_org_id);
$$;

-- ───────────── 3.4 EVENT REPERTOIRE (event picker union) ─────────────
-- Eligible songs for the event picker = system-level songs (org NULL) + all
-- songs (any level: org or branch) of EVERY participating org. The picker must
-- offer a participating org's branch songs too (cross-branch scenarios expose
-- "songs from the other invited branches only for this event"); caller must be
-- the organizer or an active member of a participating org, else 'Not a
-- participant.'
create or replace function private.event_repertoire(
  p_event_id uuid
) returns table (
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
        s.org_id is null
        or exists (
          select 1 from public.event_participants ep
          where ep.event_id = p_event_id and ep.org_id = s.org_id
        )
      )
    order by s.title;
end $$;

create or replace function public.event_repertoire(p_event_id uuid)
returns table (
  id             uuid,
  title          text,
  artist         text,
  genre          text,
  source_org_id  uuid
)
language sql security definer set search_path = '' as $$
  select * from private.event_repertoire(p_event_id);
$$;

-- ══════════════════════ 4. EXECUTE GRANTS (AFTER POLICIES, D6 ORDER) ══════════════════════
-- Helpers (private) + thin public RPC wrappers follow the 0012 revoke/grant
-- convention: revoke from public/anon, grant ONLY to authenticated (+service_role
-- for the definer helpers so service jobs reuse them). anon stays locked.
revoke execute on function private.session_has_system_role(text) from public, anon;
revoke execute on function private.org_promote_song(uuid) from public, anon;
revoke execute on function private.org_demote_song(uuid) from public, anon;
revoke execute on function private.org_leave(uuid) from public, anon;
revoke execute on function private.event_repertoire(uuid) from public, anon;

grant execute on function private.session_has_system_role(text) to authenticated, service_role;
grant execute on function private.org_promote_song(uuid) to authenticated;
grant execute on function private.org_demote_song(uuid) to authenticated;
grant execute on function private.org_leave(uuid) to authenticated;
grant execute on function private.event_repertoire(uuid) to authenticated;

revoke execute on function public.promote_song_to_system(uuid) from public, anon;
revoke execute on function public.demote_song_to_org(uuid) from public, anon;
revoke execute on function public.leave_organization(uuid) from public, anon;
revoke execute on function public.event_repertoire(uuid) from public, anon;

grant execute on function public.promote_song_to_system(uuid) to authenticated;
grant execute on function public.demote_song_to_org(uuid) to authenticated;
grant execute on function public.leave_organization(uuid) to authenticated;
grant execute on function public.event_repertoire(uuid) to authenticated;

-- ══════════════════════ 5. TABLE GRANTS (AFTER POLICIES, D6 ORDER) ══════════════════════
-- Songs already carry full CRUD grants (0002 lines 465-467) — NOT touched here.
-- New scope tables: orgs/branches read-mostly (any-auth discovery + member
-- scoping); events/participants/setlists full CRUD; rsvps self-scoped.
revoke all on table public.organizations, public.branches, public.org_memberships from public, anon;
grant select on table public.organizations, public.branches, public.org_memberships to authenticated;

revoke all on table public.events, public.event_participants, public.event_rsvps,
  public.event_setlists from public, anon;
grant select, insert, update, delete on table public.events, public.event_participants,
  public.event_setlists to authenticated;
grant select, insert, update on table public.event_rsvps to authenticated;
