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
