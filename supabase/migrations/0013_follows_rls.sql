-- CEMURM 0013 — S4.2 follows: participant RLS read + follow/unfollow/count RPCs
--
-- Slice: odd/tasks/hito4-s42-contributions-profiles.md — T4 (S4.2.4 follows).
-- Activates the standalone `follows` table (0001 lines 451-456) reserved for
-- community relationships:
--   · SELECT policy: authenticated users read ONLY rows where they are a
--     participant (follower or followed). This powers the own-graph read and
--     the T5 discovery feed query (public_songs where contributor_id in my
--     follows). No public follower lists exist — intended (see risk note).
--   · No direct INSERT/UPDATE/DELETE grants — writes are RPC-only (the 0001
--     "community WRITE" design); the 0002 revoke (line 112) is re-declared
--     and stays for anon.
--   · Entry points follow the S4.1/S4.2 pattern exactly (0010/0012):
--     SECURITY DEFINER core in `private` (search_path '', fully qualified
--     refs, initPlan auth.uid() guard) + one thin `public` wrapper per entry
--     point, authenticated-only execute grants.
--
-- Business contract (features/public-library-community.feature):
--  · follow (scenario 11): follow another musician so their new public
--    contributions appear in my discovery feed (the T5 query).
--  · follow/unfollow reversible (scenario 12): unfollow removes my visible
--    action (row DELETE); the PK (follower_id, followed_id) makes re-follow
--    a fresh insert. Both mutations are idempotent.
--
-- Security posture:
--  · follow_user rejects anonymous sessions and self-follow.
--  · get_profile_follow_counts returns AGGREGATES only (followers/following
--    BIGINTs), never the follow rows for arbitrary users — no identity or
--    edge-list exposure. The raw row read is participant-only via RLS.

-- ══════════════════════ 1. RLS — PARTICIPANT-ONLY SELECT ══════════════════════
-- 0002's DO-loop enabled RLS on all 48 tables; re-declared so 0013 stands
-- alone (0004/0006/0010 precedent). Deny-by-default revoke re-declared
-- before the first targeted grant (D6 order), policy before grant.
alter table public.follows enable row level security;

revoke all on table public.follows from anon, authenticated;

drop policy if exists follows_select_participant on public.follows;
create policy follows_select_participant on public.follows
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      follower_id = (select auth.uid())
      or followed_id = (select auth.uid())
    )
  );

-- FIRST grant ever on follows: SELECT only, participant-scoped by the
-- policy. INSERT/UPDATE/DELETE stay locked for clients (RPC-only writes).
grant select on table public.follows to authenticated;

-- ══════════════════════ 2. FOLLOW (core) ══════════════════════
create or replace function private.follow_user(p_followed_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
begin
  -- initPlan guard (0002 line 130 shape): no session → no follow
  if v_owner is null then
    raise exception 'Authentication required.';
  end if;

  -- self-follow is not a relationship; refuse it outright
  if p_followed_id = v_owner then
    raise exception 'Cannot follow yourself.';
  end if;

  -- idempotent (scenario 12): re-following after an unfollow is a fresh
  -- insert (the row was deleted); consecutive follows are no-ops.
  insert into public.follows (follower_id, followed_id)
  values (v_owner, p_followed_id)
  on conflict (follower_id, followed_id) do nothing;
end $$;

-- ══════════════════════ 3. UNFOLLOW (core) ══════════════════════
create or replace function private.unfollow_user(p_followed_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if v_owner is null then
    raise exception 'Authentication required.';
  end if;

  -- idempotent by construction: unfollowing someone I don't follow deletes
  -- nothing (scenario 12 reversible — repeated unfollow is a no-op).
  delete from public.follows
  where follower_id = v_owner
    and followed_id = p_followed_id;
end $$;

-- ══════════════════════ 4. PROFILE FOLLOW COUNTS (core) ══════════════════════
-- Aggregates only — never exposes WHO follows/whom; the participant-only
-- RLS select is the only raw-row surface. Counts read as definer (owner
-- bypasses RLS) so they cover the whole graph, not just the caller's rows.
create or replace function private.get_profile_follow_counts(p_user_id uuid)
returns table (followers bigint, following bigint)
language sql security definer set search_path = '' as $$
  select
    (select count(*) from public.follows where followed_id = p_user_id) as followers,
    (select count(*) from public.follows where follower_id = p_user_id) as following;
$$;

-- ══════════════════════ 5. PUBLIC WRAPPERS ══════════════════════
create or replace function public.follow_user(p_followed_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.follow_user(p_followed_id);
$$;

create or replace function public.unfollow_user(p_followed_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.unfollow_user(p_followed_id);
$$;

create or replace function public.get_profile_follow_counts(p_user_id uuid)
returns table (followers bigint, following bigint)
language sql security definer set search_path = '' as $$
  select private.get_profile_follow_counts(p_user_id);
$$;

-- ══════════════════════ 6. EXECUTE GRANTS (0012 mirror) ══════════════════════
-- private-schema default-revoke convention (0002 lines 33-42): lock the
-- entry points, then open them for authenticated only; anon stays locked.
revoke execute on function private.follow_user(uuid) from public, anon;
revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function private.follow_user(uuid) to authenticated;
grant execute on function public.follow_user(uuid) to authenticated;

revoke execute on function private.unfollow_user(uuid) from public, anon;
revoke execute on function public.unfollow_user(uuid) from public, anon;
grant execute on function private.unfollow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;

revoke execute on function private.get_profile_follow_counts(uuid) from public, anon;
revoke execute on function public.get_profile_follow_counts(uuid) from public, anon;
grant execute on function private.get_profile_follow_counts(uuid) to authenticated;
grant execute on function public.get_profile_follow_counts(uuid) to authenticated;