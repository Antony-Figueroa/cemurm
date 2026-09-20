-- CEMURM 0015 — S4.3 community moderation: moderator role, report/case RLS, decision + appeal RPCs
--
-- Slice: odd/tasks/hito4-remaining.md — Community Moderation (backend batch).
-- Opens the moderation surface: reports (public write, self-scoped), queue +
-- decisions (system-appointed community moderators only), appeals (contributor
-- only, different-moderator review enforced server-side). All decisions and
-- case writes run through SECURITY DEFINER RPCs in `private` (0002/0012
-- pattern: search_path pinned, fully qualified refs, thin public wrapper).
--
-- Business contract (features/community-moderation.feature):
--  · appointment (scenario 1): role 'community_moderator' in user_roles is
--    the ONLY moderation authority; org admins never inherit it (scenario 2).
--  · intake (scenario 4): any authenticated user files a report with a reason;
--    the UNIQUE(public_song_id, reason, reporter_id) constraint blocks
--    duplicate filings; reporter identity is NEVER visible to the contributor
--    (moderator-only select policy on reports).
--  · consolidation (scenario 7): pending reports fold into ONE open case per
--    entry with reason_counts jsonb (+ grounds); already-decided grounds never
--    re-queue (scenario 8) — decided grounds are excluded by the RPC.
--  · decisions (scenario 9-11): keep closes + notifies reporters; remove
--    flips status → 'removed' (the 0010 catalog view filters live-only, so the
--    entry leaves the browse surface) and increments the contributor's
--    confirmed_violations; escalate notifies system admins.
--  · takedown (scenario 12): linked copies' link lives on the entry's
--    linked_copies array; removal clears it so subscribers stop tracking
--    upstream updates; standalone copies are independent songs and stay PUT.
--  · appeals (scenario 13-15): the entry's contributor files against a decided
--    case; the RPC rejects the ORIGINAL decider from reviewing it.
--  · online-only (scenario 17): decisions/appeals are RPC calls — no client
--    offline queue exists for moderation writes.
--
-- RLS surface: reports (self insert/select; moderator select/update),
-- moderation_cases (moderator select/update only — creation and decisions are
-- RPC-definer writes, no client insert), user_roles (self select so clients can
-- render moderator UI state). rating_restrictions stays deny-by-default for
-- clients — the decision RPC writes it as definer. notifications keeps its
-- 0002 grants verbatim; the RPCs emit through public.notify_user (0008, the
-- canonical actor/self-suppression path; trigger-only for clients, definer-ok).

-- ══════════════════════ 1. MODERATOR HELPER ══════════════════════
create or replace function private.is_community_moderator(v_user uuid)
returns boolean
language sql security definer stable set search_path = '' as $$
  select exists(
    select 1 from public.user_roles
    where user_id = v_user
      and user_id = (select auth.uid())          -- tenancy guard (0002 shape)
      and role = 'community_moderator'
  );
$$;

-- execute lock + open (0002 lines 33-42 convention)
revoke execute on function private.is_community_moderator(uuid) from public, anon;
grant execute on function private.is_community_moderator(uuid) to authenticated, service_role;

-- ══════════════════════ 2. REPORT INTAKE + CONSOLIDATION RPC ══════════════════════
create or replace function private.consolidate_report(p_public_song_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner         uuid := (select auth.uid());
  v_case_id       uuid;
  v_reason_counts jsonb := '{}'::jsonb;
  v_grounds       text[] := '{}';
begin
  if v_owner is null then
    raise exception 'Entry not found.';
  end if;

  -- the caller must have just filed a pending report on this entry
  if not exists (
    select 1 from public.reports
    where public_song_id = p_public_song_id
      and reporter_id = v_owner
      and status = 'pending'
  ) then
    raise exception 'Report not found.';
  end if;

  -- one open case per entry (decision IS NULL, not an appeal)
  select id into v_case_id
  from public.moderation_cases
  where public_song_id = p_public_song_id
    and decision is null
    and appeal_of is null
  limit 1;

  -- fold pending reports into counts/grounds, EXCLUDING already-decided
  -- grounds (scenario 8: decided grounds never re-queue)
  with decided_grounds as (
    select unnest(grounds) as ground
    from public.moderation_cases
    where public_song_id = p_public_song_id and decision is not null
  )
  select
    coalesce(jsonb_object_agg(r.reason::text, r.cnt), '{}'::jsonb),
    coalesce(array_agg(r.reason::text), '{}'::text[])
  into v_reason_counts, v_grounds
  from (
    select reason, count(*) as cnt
    from public.reports
    where public_song_id = p_public_song_id and status = 'pending'
      and not exists (select 1 from decided_grounds d where d.ground = reason::text)
    group by reason
  ) r;

  if v_case_id is null then
    insert into public.moderation_cases (public_song_id, reason_counts, grounds)
    values (p_public_song_id, v_reason_counts, v_grounds)
    returning id into v_case_id;
  else
    update public.moderation_cases
    set reason_counts = v_reason_counts, grounds = v_grounds
    where id = v_case_id;
  end if;

  -- freshly folded reports consolidate; reports on already-decided grounds
  -- close (they never re-queue, scenario 8)
  update public.reports r
  set status = case
    when exists (
      select 1 from public.moderation_cases mc
      where mc.public_song_id = p_public_song_id
        and mc.decision is not null
        and r.reason::text = any(mc.grounds)
    ) then 'closed'
    else 'consolidated'
  end
  where r.public_song_id = p_public_song_id and r.status = 'pending';
end $$;

-- ══════════════════════ 3. DECISION RPC ══════════════════════
create or replace function private.decide_moderation_case(
  p_case_id uuid,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_mod              uuid := (select auth.uid());
  v_case             public.moderation_cases%rowtype;
  v_original_decider uuid;
  v_entry            public.public_songs%rowtype;
  v_reporter         uuid;
begin
  if v_mod is null then
    raise exception 'Case not found.';
  end if;

  -- system-level moderator gate only (scenarios 1-2)
  if not private.is_community_moderator(v_mod) then
    raise exception 'Not a moderator.';
  end if;

  if p_decision not in ('keep', 'remove', 'escalate') then
    raise exception 'Invalid decision.';
  end if;

  select * into v_case from public.moderation_cases where id = p_case_id;
  if not found then
    raise exception 'Case not found.';
  end if;
  if v_case.decision is not null then
    raise exception 'Already decided.';
  end if;

  -- appeal gate (scenario 13): the ORIGINAL decider never reviews the appeal
  if v_case.appeal_of is not null then
    select decider_id into v_original_decider
    from public.moderation_cases where id = v_case.appeal_of;
    if v_original_decider = v_mod then
      raise exception 'Cannot review your own decision.';
    end if;
  end if;

  update public.moderation_cases
  set decision = p_decision, decider_id = v_mod, decided_at = now(), notes = p_notes
  where id = p_case_id;

  -- close the entry's open reports
  update public.reports
  set status = 'closed'
  where public_song_id = v_case.public_song_id and status in ('pending', 'consolidated');

  -- takedown propagation (scenario 12)
  if p_decision = 'remove' then
    select * into v_entry from public.public_songs where id = v_case.public_song_id;
    if found then
      update public.public_songs
      set status = 'removed', updated_at = now(), linked_copies = '{}'
      where id = v_case.public_song_id;

      -- confirmed-violation counter (0001 rating_restrictions)
      insert into public.rating_restrictions (contributor_id, confirmed_violations)
      values (v_entry.contributor_id, 1)
      on conflict (contributor_id)
      do update set confirmed_violations = public.rating_restrictions.confirmed_violations + 1;

      perform public.notify_user(
        v_entry.contributor_id, 'system',
        'Entry removed from public library',
        coalesce('Your public entry has been removed. Reason: ' || nullif(p_notes, ''), 'Your public entry has been removed from the public library.'),
        jsonb_build_object('action', 'moderation-removed', 'public_song_id', v_case.public_song_id));
    end if;
  end if;

  -- reporters learn the outcome (scenario 9-10); self-suppression in notify_user
  for v_reporter in
    select distinct reporter_id from public.reports
    where public_song_id = v_case.public_song_id
  loop
    perform public.notify_user(
      v_reporter, 'system',
      'Report reviewed',
      'Your report on a public entry has been reviewed. Outcome: ' || p_decision || '.',
      jsonb_build_object('action', 'moderation-decision',
        'public_song_id', v_case.public_song_id, 'outcome', p_decision));
  end loop;

  -- escalation reaches system admins (scenario 11)
  if p_decision = 'escalate' then
    for v_reporter in
      select user_id from public.user_roles where role = 'system_admin'
    loop
      perform public.notify_user(
        v_reporter, 'system',
        'Case escalated for review',
        coalesce('A moderation case has been escalated. Notes: ' || nullif(p_notes, ''), 'A moderation case has been escalated for your review.'),
        jsonb_build_object('action', 'moderation-escalated',
          'case_id', p_case_id, 'public_song_id', v_case.public_song_id));
    end loop;
  end if;
end $$;

-- ══════════════════════ 4. APPEAL RPC ══════════════════════
create or replace function private.file_appeal(p_case_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
  v_case  public.moderation_cases%rowtype;
  v_entry_owner uuid;
begin
  if v_owner is null then
    raise exception 'Case not found.';
  end if;

  select * into v_case from public.moderation_cases where id = p_case_id;
  if not found then
    raise exception 'Case not found.';
  end if;
  if v_case.decision is null then
    raise exception 'Case is still open.';
  end if;
  if v_case.appeal_of is not null then
    raise exception 'Appeal already reviewed.';
  end if;

  -- only the entry's contributor can appeal (scenario 13)
  select contributor_id into v_entry_owner
  from public.public_songs where id = v_case.public_song_id;
  if v_entry_owner is distinct from v_owner then
    raise exception 'Only the contributor can appeal.';
  end if;

  insert into public.moderation_cases (public_song_id, reason_counts, grounds, appeal_of, notes)
  values (v_case.public_song_id, '{}'::jsonb, '{}'::text[], p_case_id, p_reason);
end $$;

-- ══════════════════════ 5. PUBLIC WRAPPERS (POSTGREST-REACHABLE) ══════════════════════
create or replace function public.consolidate_report(p_public_song_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.consolidate_report(p_public_song_id);
$$;

create or replace function public.decide_moderation_case(
  p_case_id uuid,
  p_decision text,
  p_notes text default null
)
returns void
language sql security definer set search_path = '' as $$
  select private.decide_moderation_case(p_case_id, p_decision, p_notes);
$$;

create or replace function public.file_appeal(p_case_id uuid, p_reason text)
returns void
language sql security definer set search_path = '' as $$
  select private.file_appeal(p_case_id, p_reason);
$$;

revoke execute on function private.consolidate_report(uuid) from public, anon;
revoke execute on function private.decide_moderation_case(uuid, text, text) from public, anon;
revoke execute on function private.file_appeal(uuid, text) from public, anon;
grant execute on function private.consolidate_report(uuid) to authenticated, service_role;
grant execute on function private.decide_moderation_case(uuid, text, text) to authenticated, service_role;
grant execute on function private.file_appeal(uuid, text) to authenticated, service_role;

revoke execute on function public.consolidate_report(uuid) from public, anon;
revoke execute on function public.decide_moderation_case(uuid, text, text) from public, anon;
revoke execute on function public.file_appeal(uuid, text) from public, anon;
grant execute on function public.consolidate_report(uuid) to authenticated, service_role;
grant execute on function public.decide_moderation_case(uuid, text, text) to authenticated, service_role;
grant execute on function public.file_appeal(uuid, text) to authenticated, service_role;

-- ══════════════════════ 6. RLS POLICIES ══════════════════════
-- queue ordering needs a temporal column the 0001 DDL never shipped
-- (client selects/orders by created_at): add it idempotently here.
alter table public.moderation_cases add column if not exists created_at timestamptz not null default now();

-- ── reports: any authenticated files against themselves; moderators see all ──
alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
  for insert to authenticated
  with check ((select auth.uid()) is not null and reporter_id = (select auth.uid()));

drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports
  for select to authenticated
  using ((select auth.uid()) is not null and reporter_id = (select auth.uid()));

drop policy if exists reports_select_moderator on public.reports;
create policy reports_select_moderator on public.reports
  for select to authenticated
  using (private.is_community_moderator((select auth.uid())));

drop policy if exists reports_update_self_pending on public.reports;
create policy reports_update_self_pending on public.reports
  for update to authenticated
  using ((select auth.uid()) is not null and reporter_id = (select auth.uid()))
  with check (status = 'consolidated');

drop policy if exists reports_update_moderator on public.reports;
create policy reports_update_moderator on public.reports
  for update to authenticated
  using (private.is_community_moderator((select auth.uid())));

-- ── moderation_cases: queue read + decision writes are moderator-only; the
--    RPCs create/update cases as definer (no client insert policy at all) ──
alter table public.moderation_cases enable row level security;
revoke all on table public.moderation_cases from anon, authenticated;

drop policy if exists moderation_cases_select_moderator on public.moderation_cases;
create policy moderation_cases_select_moderator on public.moderation_cases
  for select to authenticated
  using (private.is_community_moderator((select auth.uid())));

drop policy if exists moderation_cases_update_moderator on public.moderation_cases;
create policy moderation_cases_update_moderator on public.moderation_cases
  for update to authenticated
  using (private.is_community_moderator((select auth.uid())));

-- ── rating_restrictions: stays deny-by-default for clients; RPC writes only ──
alter table public.rating_restrictions enable row level security;
revoke all on table public.rating_restrictions from anon, authenticated;

-- ── user_roles: self-read so clients render moderator UI state ──
alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;

drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self on public.user_roles
  for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- ══════════════════════ 7. TARGETED GRANTS (AFTER POLICIES, 0002 D6 ORDER) ══════════════════════
grant select on table public.reports to authenticated;
grant insert on table public.reports to authenticated;

grant select on table public.moderation_cases to authenticated;

grant select on table public.user_roles to authenticated;