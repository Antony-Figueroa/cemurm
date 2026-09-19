-- CEMURM 0012 — S4.2 contribution RPCs: publish + withdraw
--
-- Slice: odd/tasks/hito4-s42-contributions-profiles.md — T1 (S4.2.1 backend).
-- Opens the WRITE path of the public library for contributors. Architecture
-- follows S4.1 exactly: SECURITY DEFINER core in `private` (search_path
-- pinned, fully qualified refs) + one thin public wrapper per entry point
-- (0010/0011 pattern) so PostgREST can reach them (config.toml
-- db.schemas = ["public", "graphql_public"]).
--
-- Business contract (features/public-library-community.feature):
--  · contribute (scenario 5): publish your OWN song with you as contributor;
--    the entry records license + attribution.
--  · license confirmation (scenario 6): `license_confirmed` must be true; the
--    RPC is the hard gate (defense in depth under the UI confirmation).
--  · lineage (scenario 7): optional `p_lineage_public_song_id` must reference
--    a LIVE source entry; recorded in public_songs.lineage (0001 line 444).
--  · edit (scenario 8): no new RPC needed — public_library_entries is a live
--    view over public_songs → songs; editing the underlying song updates the
--    entry and song_versions preserves change history.
--  · withdraw (scenario 9): owner flips status → 'withdrawn' (0001 line 446);
--    subscribers' copies are independent songs, so they stay theirs untouched.
--
-- Ownership contract: songs.owner = created_by (0002 lines 152-170,
-- songs_select_owner / songs_insert_owner / songs_update_owner /
-- songs_delete_owner all use created_by = auth.uid()). No new table grants;
-- writes are RPC-only (the 0001 "community WRITE" design).

-- ═══════════════ publish (core) ═══════════════
create or replace function private.publish_song_to_library(
  p_song_id uuid,
  p_license text,
  p_license_confirmed boolean,
  p_lineage_public_song_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner    uuid := (select auth.uid());
  v_entry_id uuid;
begin
  -- initPlan guard (0002 line 130 shape): no session → no publish
  if v_owner is null then
    raise exception 'Song not found.';
  end if;

  -- license gate: confirmation is non-negotiable (scenario 6)
  if p_license_confirmed is distinct from true then
    raise exception 'License confirmation required before publishing.';
  end if;

  -- filterable license vocabulary (0001 line 442)
  if p_license is null or p_license not in ('public-domain', 'CC-BY-4.0', 'proprietary') then
    raise exception 'Unsupported license.';
  end if;

  -- ownership: publish your OWN song only (created_by = auth.uid())
  if not exists (
    select 1 from public.songs
    where id = p_song_id
      and created_by = v_owner
      and is_deleted = false
  ) then
    raise exception 'Song not found.';
  end if;

  -- one live entry per song (no duplicate publishes)
  if exists (
    select 1 from public.public_songs
    where song_id = p_song_id and status = 'live'
  ) then
    raise exception 'Song already published.';
  end if;

  -- optional lineage must point at a live source entry (scenario 7)
  if p_lineage_public_song_id is not null
     and not exists (
       select 1 from public.public_songs
       where id = p_lineage_public_song_id and status = 'live'
     ) then
    raise exception 'Lineage source not found.';
  end if;

  insert into public.public_songs
    (song_id, contributor_id, license, license_confirmed, lineage, status)
  values
    (p_song_id, v_owner, p_license, true, p_lineage_public_song_id, 'live')
  returning id into v_entry_id;

  return v_entry_id;
end $$;

-- ═══════════════ withdraw (core) ═══════════════
create or replace function private.withdraw_public_song(p_public_song_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if v_owner is null then
    raise exception 'Entry not found.';
  end if;

  -- owner-only, live-only flip; copies remain theirs (independent songs)
  update public.public_songs
  set status = 'withdrawn', updated_at = now()
  where id = p_public_song_id
    and contributor_id = v_owner
    and status = 'live';

  if not found then
    raise exception 'Entry not found.';
  end if;
end $$;

-- ═══════════════ public wrappers ═══════════════
create or replace function public.publish_song_to_library(
  p_song_id uuid,
  p_license text,
  p_license_confirmed boolean,
  p_lineage_public_song_id uuid default null
)
returns uuid
language sql security definer set search_path = '' as $$
  select private.publish_song_to_library(p_song_id, p_license, p_license_confirmed, p_lineage_public_song_id);
$$;

create or replace function public.withdraw_public_song(p_public_song_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.withdraw_public_song(p_public_song_id);
$$;

-- private-schema default-revoke convention (0002 lines 33-42): lock the
-- entry points, then open them for authenticated only; anon stays locked.
revoke execute on function private.publish_song_to_library(uuid, text, boolean, uuid) from public, anon;
revoke execute on function private.withdraw_public_song(uuid) from public, anon;
grant execute on function private.publish_song_to_library(uuid, text, boolean, uuid) to authenticated;
grant execute on function private.withdraw_public_song(uuid) to authenticated;

revoke execute on function public.publish_song_to_library(uuid, text, boolean, uuid) from public, anon;
revoke execute on function public.withdraw_public_song(uuid) from public, anon;
grant execute on function public.publish_song_to_library(uuid, text, boolean, uuid) to authenticated;
grant execute on function public.withdraw_public_song(uuid) to authenticated;