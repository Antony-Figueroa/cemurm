-- CEMURM 0009 — Notifications activity: reorder RPC + song-added/reorder/comment emissions + realtime
--
-- PR#1 of hito-3-notifications (change 2 of Hito 3; base = PR#0 branch
-- feat/hito-3-notifications-pr0-migration; only the tracker merges to main).
-- ACTIVITY half of the original single-file 0008 (501 lines): OWNER DECISION
-- 2026-09-18 split it into TWO migrations — 0008 core (0008_notifications_core.sql,
-- PR#0: shared helpers + bandmate_links/setlist_collaborators emissions +
-- transfer RPC) and 0009 activity (this file, PR#1) — so every PR fits the
-- 400-line budget (no size:exception). SQL bodies derived VERBATIM from the
-- original 0008_notifications.sql sections 4 (reorder RPC + statement-level
-- trigger), 5 (song-added), 7 (shared_comments ONE function) and 8
-- (publication + replica identity).
--
-- This file: move_setlist_items RPC + 3 definer AFTER triggers (setlist_items
-- ×2 incl. the statement-level reorder trigger, shared_comments ×1) plus
-- publication + replica identity full. CONSUMES the 0008 core helpers
-- public.notify_user / public.notifier_actor_name — dependency: 0009 applies
-- AFTER 0008 (filename order in supabase db reset); no forward references
-- (0008 core references none of the 0009 objects).
--
-- Contract (unchanged from the original): rows inserted in the SAME
-- transaction as their event (AFTER triggers see the committed row);
-- recipients from post-commit row state; actor name baked at emit time
-- (notifier_actor_name: profiles.display_name → username → 'Someone');
-- payload.actor_id raw UUID (absent when auth.uid() is NULL → service-role
-- writes read back 'Someone' + actor_id IS NULL); self-suppression in ONE
-- place (notify_user, 0008 core). notifications keeps the 0002 grants
-- verbatim (select + update(read_at) only, 0002 lines 469-470) — NO client
-- INSERT/DELETE (42501 stays); notification_preferences deny-by-default with
-- zero policies; categories stay the frozen 0001 enum ('setlist' only here —
-- no new categories).
--
-- Precedents: 0006 trigger contract (security definer set search_path = '',
-- fully-qualified public. refs, trigger-only revoke — 0006 lines 53-54,
-- 292-293); 0002 RPC grants — revoke public/anon + grant authenticated,
-- service_role (0002 lines 33-39); 0006 publication precedent (303-305) and
-- nested single-relation EXISTS scope chain (211-258). Read-only refs:
-- setlists/setlist_collaborators/setlist_items/song_versions/shared_comments/
-- profiles (0001 lines 100-117, 160-226, 406-435), private.session_owns_setlist
-- (0002 lines 142-149).
--
-- Sections: 1 reorder RPC + statement-level trigger · 2 song-added · 3
-- shared_comments comment + @mention, ONE function · 4 publication.

-- ══════════════════════ 1. REORDER — WRITE RPC + STATEMENT-LEVEL TRIGGER (task 1.1) ══════════════════════

-- RPC #1 (0009 activity): the ONLY mechanism that (1) keeps the reorder atomic with its
-- notification, (2) produces exactly ONE statement in the final pass, and
-- (3) preserves the constraint-safe two-phase protocol REQUIRED by
-- UNIQUE (setlist_id, position) (0001 line 188). The transaction-local GUC
-- names the moved song for the statement-level trigger (after the bump EVERY
-- row changes in the final pass, so the transition tables cannot identify it).
-- Scope re-asserted (definers bypass RLS): owner or accepted can_edit
-- collaborator, else the raw surface error 'No access.' (NOT in USER_ERRORS →
-- generic client message; the psql dry-run asserts the raw text).
create function public.move_setlist_items(
  p_setlist_id        uuid,
  p_ordered_song_ids  uuid[],
  p_moved_song_id     uuid
) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null
     or not (private.session_owns_setlist(p_setlist_id)
             or exists (select 1 from public.setlist_collaborators c
                        where c.setlist_id = p_setlist_id and c.user_id = v_actor
                          and c.accepted_at is not null and c.can_edit)) then
    raise exception 'No access.';
  end if;
  perform set_config('cemurm.reorder_moved_song_id', p_moved_song_id::text, true);
  -- Pass 1 (ONE statement): bump all to 10000+ordinality — disjoint from the
  -- finals, so no transient UNIQUE collision mid-rotation.
  update public.setlist_items i
  set position = 10000 + o.ord
  from unnest(p_ordered_song_ids) with ordinality as o(song_id, ord)
  where i.setlist_id = p_setlist_id and i.song_id = o.song_id;
  -- Pass 2 (ONE multi-row statement): finals 0..n-1. The statement-level
  -- reorder trigger fires ONLY here (all new.position < 10000) → exactly ONE
  -- notification row per reorder.
  update public.setlist_items i
  set position = o.ord - 1
  from unnest(p_ordered_song_ids) with ordinality as o(song_id, ord)
  where i.setlist_id = p_setlist_id and i.song_id = o.song_id;
end $$;

revoke all on function public.move_setlist_items(uuid, uuid[], uuid) from public, anon;
grant execute on function public.move_setlist_items(uuid, uuid[], uuid) to authenticated, service_role;

-- Statement-level reorder trigger — the single emission point for reorders.
-- ponytail: the bump offsets, the GUC name and the two-phase protocol are
-- coupled — if any of them change, move_setlist_items AND this trigger must
-- change together (design Decision 2).
create function public.notify_setlist_reordered() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_setlist_id uuid;
  v_song_id    uuid := nullif(current_setting('cemurm.reorder_moved_song_id', true), '');
begin
  -- Bump pass exclusion: the bump is the only statement whose rows land at
  -- position >= 10000 → skip. (Final pass: all < 10000.)
  if exists (select 1 from new_rows n where n.position >= 10000) then
    return null;
  end if;
  -- No positional change in this statement → skip.
  if not exists (
    select 1 from new_rows n join old_rows o on o.id = n.id
    where n.position is distinct from o.position
  ) then
    return null;
  end if;
  select distinct setlist_id into v_setlist_id from new_rows limit 1;
  -- Moved song: RPC GUC when set; fallback = lowest new position (exact for
  -- single-row statements, the only non-RPC writers).
  v_song_id := coalesce(v_song_id,
    (select n.song_id from new_rows n order by n.position limit 1));
  -- Recipients: owner + accepted collaborators, deduped; actor suppressed
  -- inside notify_user. Title/body NOT NULL-guarded with defensive coalesces
  -- so an impossible state can never fail the source write.
  perform public.notify_user(
    r.user_id, 'setlist',
    public.notifier_actor_name() || ' reordered songs in ' ||
      coalesce((select s.name from public.setlists s where s.id = v_setlist_id), ''),
    null,
    jsonb_build_object('action', 'reorder', 'setlist_id', v_setlist_id,
                       'song_id', v_song_id))
  from (
    select s.owner_id as user_id from public.setlists s where s.id = v_setlist_id
    union
    select c.user_id from public.setlist_collaborators c
    where c.setlist_id = v_setlist_id and c.accepted_at is not null
  ) r;
  return null;
end $$;

revoke all on function public.notify_setlist_reordered() from public, anon, authenticated;

create trigger setlist_items_reorder_notify
  after update on public.setlist_items
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_setlist_reordered();

-- ══════════════════════ 2. SONG-ADDED TRIGGER (task 1.2) ══════════════════════
-- AFTER INSERT → owner + accepted collaborators of new.setlist_id (deduped,
-- minus actor via notify_user). Body appends "Key: {base_key} · {base_tempo}
-- BPM" when resolvable via song_versions — prefer the item's version_id,
-- else the latest version by created_at desc (songs.js client default
-- precedent, read-only); silently omitted otherwise (body NULL).
create function public.notify_setlist_item_added() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_setlist_name text;
  v_song_title   text;
  v_key          text;
  v_tempo        integer;
  v_body         text;
begin
  v_setlist_name := (select s.name from public.setlists s where s.id = new.setlist_id);
  v_song_title   := (select g.title from public.songs g where g.id = new.song_id);
  select v.base_key, v.base_tempo into v_key, v_tempo
  from public.song_versions v
  where (new.version_id is not null and v.id = new.version_id)
     or (new.version_id is null and v.song_id = new.song_id)
  order by v.created_at desc
  limit 1;
  -- Format the body only when BOTH halves resolve (the literal format is
  -- "Key: {base_key} · {base_tempo} BPM"; a partial version row omits silently).
  if v_key is not null and v_tempo is not null then
    v_body := 'Key: ' || v_key || ' · ' || v_tempo || ' BPM';
  end if;
  perform public.notify_user(
    r.user_id, 'setlist',
    public.notifier_actor_name() || ' added ' || coalesce(v_song_title, 'a song') ||
      ' to ' || coalesce(v_setlist_name, 'a setlist'),
    v_body,
    jsonb_build_object('action', 'song-added', 'setlist_id', new.setlist_id,
                       'song_id', new.song_id))
  from (
    select s.owner_id as user_id from public.setlists s where s.id = new.setlist_id
    union
    select c.user_id from public.setlist_collaborators c
    where c.setlist_id = new.setlist_id and c.accepted_at is not null
  ) r;
  return null;
end $$;

revoke all on function public.notify_setlist_item_added() from public, anon, authenticated;

create trigger setlist_items_insert_notify
  after insert on public.setlist_items
  for each row execute function public.notify_setlist_item_added();

-- ══════════════════════ 3. SHARED_COMMENTS — COMMENT + @MENTION, ONE FUNCTION (task 1.3) ══════════════════════
-- ONE trigger function covering BOTH paths (Resolved Decision 2 — the design
-- line 115 wording "INSERT + @mention" is one function, not two; the
-- pg_trigger breakdown stays 2+3+2+1 = 8).
-- (b) @mention rows: parse @username with the @[A-Za-z0-9._-]+ regex (the
--     profiles.username charset — auth.js never writes usernames, open
--     question (a) resolved by evidence; partial unique index 0006 line 37),
--     resolve against unique profiles.username, emit ONLY when the named user
--     passes the 0006 EXISTS scope chain (setlist_items → setlists owner OR
--     accepted collaborator; nested single-relation EXISTS, no joins — design
--     lines 317-341). Out-of-scope mention → NO row (no un-openable row);
--     self-mention → skipped.
-- (a) comment rows: owner + accepted collaborators of ANY setlist containing
--     the song (deduped) minus author minus mention recipients (the mention
--     row supersedes). category 'setlist' (frozen enum).
create function public.notify_comment_activity() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_song_title          text := (select g.title from public.songs g where g.id = new.song_id);
  v_section             text := new.anchor->>'section';
  v_setlist_id          uuid;
  v_username            text;
  v_candidate           uuid;
  v_mention_recipients  uuid[] := '{}'::uuid[];
  v_mention             text[];
begin
  for v_mention in
    select distinct regexp_matches(new.body, '@([A-Za-z0-9._-]+)', 'g')
  loop
    v_username := v_mention[1];
    select p.id into v_candidate
    from public.profiles p
    where p.username = v_username
    limit 1;
    if v_candidate is null then
      continue; -- unknown username → no row
    end if;
    if v_candidate = new.author_id then
      continue; -- self-mention → skipped
    end if;
    -- 0006 scope chain (candidate must be owner or ACCEPTED collaborator on
    -- some setlist containing the song); also carries the payload setlist_id.
    select i.setlist_id into v_setlist_id
    from public.setlist_items i
    where i.song_id = new.song_id
      and exists (
        select 1 from public.setlists s
        where s.id = i.setlist_id
          and (s.owner_id = v_candidate
               or exists (
                 select 1 from public.setlist_collaborators c
                 where c.setlist_id = s.id and c.user_id = v_candidate
                   and c.accepted_at is not null)))
    limit 1;
    if v_setlist_id is null then
      continue; -- out-of-scope mention → NO row
    end if;
    perform public.notify_user(
      v_candidate, 'setlist',
      '@' || v_username || ' mentioned you in ' || coalesce(v_song_title, 'a song'),
      null,
      jsonb_build_object('action', 'mention', 'song_id', new.song_id,
                         'setlist_id', v_setlist_id, 'section', v_section,
                         'comment_id', new.id));
    v_mention_recipients := v_mention_recipients || v_candidate;
  end loop;

  perform public.notify_user(
    r.user_id, 'setlist',
    public.notifier_actor_name() || ' commented on ' || coalesce(v_song_title, 'a song'),
    null,
    jsonb_build_object('action', 'comment', 'song_id', new.song_id,
                       'setlist_id',
                       (select i.setlist_id from public.setlist_items i
                        where i.song_id = new.song_id limit 1),
                       'section', v_section, 'comment_id', new.id))
  from (
    select s.owner_id as user_id
    from public.setlist_items i
    join public.setlists s on s.id = i.setlist_id
    where i.song_id = new.song_id
    union
    select c.user_id
    from public.setlist_items i
    join public.setlist_collaborators c on c.setlist_id = i.setlist_id
    where i.song_id = new.song_id and c.accepted_at is not null
  ) r
  where r.user_id <> new.author_id
    and r.user_id <> all(v_mention_recipients);
  return null;
end $$;

revoke all on function public.notify_comment_activity() from public, anon, authenticated;

create trigger shared_comments_insert_notify
  after insert on public.shared_comments
  for each row execute function public.notify_comment_activity();

