-- CEMURM 0010 — S4.1 public library catalog: RLS exposure, catalog view, copy RPC
--
-- Slice: odd/tasks/hito4-s41-public-library.md — T1 (backend batch). Opens the
-- READ path of the public library for authenticated users and ships the
-- server-side copy operation. Contribution writes, linked copies, follows,
-- reporting and moderation stay out of scope (S4.2/S4.3).
--
-- Exposure surface (all read-only; anon gets nothing anywhere):
--  · public_songs   — SELECT where status = 'live'. FIRST grant ever on this
--    table: 0002 revoked it (line 111) and no later migration re-opened it.
--  · songs          — SELECT when referenced by a live public_songs row.
--    OR-scope on top of songs_select_owner (0002 lines 152-155): RLS policies
--    for the same command OR together, so a private song stays owner-only and
--    only catalog-referenced songs gain a metadata read. Chart content stays
--    put by construction — it lives in chart_files/song_versions, which remain
--    owner-scoped per 0003 (untouched here). Single-relation EXISTS, no joins
--    (acyclic-policy-graph constraint, 0006 lines 12-15); public_songs
--    policies never reference songs, so no recursion cycle is introduced.
--  · profiles       — display_name already exposed to authenticated by 0006:
--    profiles_select_search (any authenticated, 0006 lines 87-90) + the
--    column-limited select grant (id, username, display_name, avatar_url,
--    0006 line 174). NOTHING added here — verified, documented only.
--  · public_library_entries — security_invoker convenience VIEW for the
--    catalog query (live join of public_songs + songs + profiles). Chosen over
--    a direct PostgREST embed chain (public_songs → songs → profiles) because
--    it keeps the client query a single flat select (one round-trip; search
--    and license filtering stay client-side per T3) while exposing EXACTLY the
--    row surface the three SELECT policies already allow: the view is
--    security_invoker, so the invoker's own RLS + column privileges apply at
--    read time and no grant is widened. The embed chain remains the fallback
--    if the view ever becomes a problem — nothing here depends on it.
--  · copy_public_song_to_repertoire — SECURITY DEFINER RPC in the private
--    schema (0002 private-schema default-revoke convention, 0002 lines 33-42).
--    Reads the source trio as definer (chart content is NEVER exposed
--    client-side), inserts a standalone copy owned by auth.uid(), and returns
--    the new songs.id. Does NOT touch public_songs.linked_copies — standalone
--    copies; linkage is S4.2.
--
-- Policy ordering follows the repo contract (D6 order, 0002 lines 57-59 +
-- 129, 0006 lines 104-107 precedent): deny-by-default revoke re-declarations
-- before policies, targeted grants AFTER policies. Every statement is
-- idempotent (drop if exists / create or replace / re-grant) so the migration
-- is re-runnable on an already-migrated database.

-- ══════════════════════ 1. PUBLIC_SONGS — LIVE READ EXPOSURE ══════════════════════
-- 0002's DO-loop enabled RLS on all 48 tables; re-declared so 0010 stands
-- alone (0004/0006 precedent). Scope: read-only catalog rows — 'live' only;
-- 'removed'/'withdrawn' entries stay invisible to clients (S4.3 moderation
-- relies on this).
alter table public.public_songs enable row level security;

-- deny-by-default lock re-declared before the first targeted grant (D6)
revoke all on table public.public_songs from anon, authenticated;

drop policy if exists public_songs_select_live on public.public_songs;
create policy public_songs_select_live on public.public_songs
  for select to authenticated
  using ((select auth.uid()) is not null and status = 'live');

-- ══════════════════════ 2. SONGS — METADATA READ FOR LIVE PUBLIC REFS ══════════════════════
-- OR-scope on top of songs_select_owner (0002): a song referenced by a live
-- public_songs row becomes readable by any authenticated user; private songs
-- remain owner-only. Metadata only by construction — songs carries no chart
-- content columns; chart payloads live in chart_files/song_versions (0003).
drop policy if exists songs_select_public_library on public.songs;
create policy songs_select_public_library on public.songs
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.public_songs ps
      where ps.song_id = public.songs.id
        and ps.status = 'live'
    )
  );

-- ══════════════════════ 3. CATALOG VIEW — PUBLIC_LIBRARY_ENTRIES ══════════════════════
-- security_invoker (PG15+): the reader's own RLS policies + column grants are
-- evaluated on the underlying tables, so the view widens nothing beyond the
-- SELECT surface above. Column shape = the catalog contract from the slice
-- (title, artist, genre, contributor display_name, license).
drop view if exists public.public_library_entries;
create view public.public_library_entries
with (security_invoker = true) as
select
  ps.id as id,
  ps.song_id,
  ps.contributor_id,
  ps.license,
  ps.license_confirmed,
  ps.status,
  ps.updated_at,
  s.title,
  s.artist,
  s.genre,
  p.display_name as contributor_name
from public.public_songs ps
join public.songs s on s.id = ps.song_id
join public.profiles p on p.id = ps.contributor_id
where ps.status = 'live';

-- ══════════════════════ 4. TARGETED GRANTS (AFTER POLICIES, D6) ══════════════════════
-- public_songs: FIRST grant — SELECT only (writes are S4.2).
grant select on table public.public_songs to authenticated;

-- songs already carries full CRUD grants (0002 lines 465-467) — no change.
-- profiles already carries the column-limited select grant (0006 line 174) —
-- no change.

-- the catalog view: deny-by-default re-declared (new relations inherit
-- auto_expose defaults) then the single convenience grant; anon stays locked.
revoke all on table public.public_library_entries from anon, authenticated;
grant select on table public.public_library_entries to authenticated;

-- ══════════════════════ 5. COPY RPC — PRIVATE SCHEMA, SECURITY DEFINER ══════════════════════
-- Server-side copy of a live public entry into the caller's repertoire. The
-- client NEVER reads chart content: the source trio (songs + chart_files +
-- song_versions) is read as definer and only the new songs.id is returned.
-- Mirrors addSong (src/lib/songs.js lines 158-214): songs + chart_files
-- (format 'chordpro', random object_key, size_bytes) + song_versions
-- (name 'Original', number 1, base_key/base_tempo/duration_seconds copied,
-- is_ready recomputed). Readiness contract: ready iff a base key AND a
-- non-empty chart body are present (the task list's exact wording); the full
-- chord-line/lyric-text detection in src/lib/readiness.js stays client-side —
-- a live, license-confirmed catalog entry always satisfies both rules, so the
-- SQL approximation never diverges in practice. Standalone copy: the original
-- and public_songs.linked_copies are NOT touched (S4.2 owns linkage).
create or replace function private.copy_public_song_to_repertoire(p_public_song_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner        uuid := (select auth.uid());
  v_public_song  public.public_songs%rowtype;
  v_song         public.songs%rowtype;
  v_chart        public.chart_files%rowtype;
  v_version      public.song_versions%rowtype;
  v_new_song_id  uuid;
  v_new_chart_id uuid;
  v_key          text;
  v_body         text;
begin
  -- initPlan guard (0002 line 130 shape): no session → no copy
  if v_owner is null then
    raise exception 'Song not found.';
  end if;

  -- single live public entry only
  select * into v_public_song
  from public.public_songs
  where id = p_public_song_id
    and status = 'live';
  if not found then
    raise exception 'Song not found.';
  end if;

  select * into v_song
  from public.songs
  where id = v_public_song.song_id;
  if not found then
    raise exception 'Song not found.';
  end if;

  -- newest non-deleted chart + newest version (flattenSong selection order,
  -- src/lib/songs.js lines 55-67)
  select * into v_chart
  from public.chart_files
  where song_id = v_song.id
    and soft_deleted = false
  order by created_at desc
  limit 1;
  if not found then
    raise exception 'Song not found.';
  end if;

  select * into v_version
  from public.song_versions
  where song_id = v_song.id
  order by created_at desc
  limit 1;
  if not found then
    raise exception 'Song not found.';
  end if;

  v_key  := coalesce(v_version.base_key, '');
  v_body := coalesce(v_chart.content, '');

  -- 1. songs row, owned by the caller
  insert into public.songs (org_id, branch_id, title, artist, genre, created_by)
  values (v_song.org_id, v_song.branch_id, v_song.title, v_song.artist, v_song.genre, v_owner)
  returning id into v_new_song_id;

  -- 2. chart_files row (inline ChordPro text carried over as-is)
  insert into public.chart_files (song_id, format, object_key, content, size_bytes)
  values (v_new_song_id, 'chordpro', gen_random_uuid()::text, v_body, length(v_body))
  returning id into v_new_chart_id;

  -- 3. song_versions row — version 1 'Original', readiness recomputed
  insert into public.song_versions
    (song_id, name, number, chart_file_id, base_key, base_tempo,
     duration_seconds, is_ready, owner_id, created_by)
  values
    (v_new_song_id, 'Original', 1, v_new_chart_id, v_version.base_key,
     v_version.base_tempo, v_version.duration_seconds,
     (btrim(v_key) <> '' and btrim(v_body) <> ''), v_owner, v_owner);

  return v_new_song_id;
end $$;

-- private-schema default-revoke convention (0002 lines 33-42): lock the
-- entry point, then open it for authenticated only; anon stays locked.
revoke execute on function private.copy_public_song_to_repertoire(uuid) from public, anon;
grant execute on function private.copy_public_song_to_repertoire(uuid) to authenticated;