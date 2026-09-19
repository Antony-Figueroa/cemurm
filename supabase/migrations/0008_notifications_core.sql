-- CEMURM 0008 — Notifications core: shared helpers, band/setlist-coworker emissions, transfer RPC
--
-- PR#0 of hito-3-notifications (change 2 of Hito 3; base = main f8c1860, after the
-- archived hito-3-band-collaboration change 1). CORE half of the DB-backed
-- notification feed (exploration A1 / proposal A1). OWNER DECISION (2026-09-18):
-- the original single-file 0008 split into TWO migrations — 0008 core (this
-- file, PR#0) + 0009 activity (0009_notifications_activity.sql, PR#1) — so every
-- PR fits the fixed 400-line budget (no size:exception). This file: 5 SECURITY
-- DEFINER AFTER triggers across 2 emission tables (bandmate_links ×2,
-- setlist_collaborators ×3 incl. a DEFERRABLE INITIALLY DEFERRED DELETE) plus 1
-- security-definer write RPC (transfer_setlist_ownership), and the two shared
-- helper functions that 0009 consumes. Dependency rule: 0009 applies AFTER 0008
-- (helpers defined first) — no forward cross-references; the 0.6 dry-run asserts
-- to_regprocedure(…) IS NULL for every 0009 object while only 0008 is applied.
--
-- Contract: every notification row is inserted in the SAME transaction as its
-- event (AFTER triggers see the committed row); recipients are computed from
-- post-commit row state; the actor's display name is baked at emit time
-- (notifier_actor_name: profiles.display_name → username → 'Someone');
-- payload.actor_id carries the raw UUID (absent when auth.uid() is NULL —
-- service-role writes read back as 'Someone' + actor_id IS NULL); self-
-- suppression lives in ONE place (notify_user). notifications keeps its 0002
-- grants verbatim (select + update(read_at) only, 0002 lines 469-470) — NO
-- client INSERT/DELETE (42501 stays); notification_preferences stays deny-by-
-- default with zero policies (0.6(i) asserts both).
--
-- Precedents: 0006 trigger contract — security definer set search_path = '',
-- fully-qualified public. refs, trigger-only revoke from public/anon/
-- authenticated (0006 lines 53-54, 292-293); 0002 RPC grants — revoke from
-- public/anon + grant execute to authenticated, service_role (0002 lines
-- 33-39). Read-only refs: setlists/setlist_collaborators/bandmate_links/
-- notifications (0001 lines 155-176, 406-414), private.session_owns_setlist
-- (0002 lines 142-149).
--
-- Sections: 1 shared helpers · 2 bandmate_links (invite/accept/decline) ·
-- 3 setlist_collaborators (invite/permission/deferred removal) · 4 transfer RPC.

-- ══════════════════════ 1. SHARED DEFINER HELPERS (task 0.1) ══════════════════════
-- One place for actor resolution, name baking, self-suppression and payload
-- shaping so all 8 trigger functions (0008 + 0009) stay small. Trigger-only
-- entry points (revoke from public/anon/authenticated — a lockable helper via
-- RPC would be a definer footgun, 0006 lines 53-54 precedent).
create function public.notify_user(
  p_user_id  uuid,
  p_category text,   -- 'invitation' | 'setlist' | 'event' | 'system' (frozen enum, 0001)
  p_title    text,
  p_body     text,
  p_payload  jsonb   -- deep-link keys; actor_id is injected below
) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_actor   uuid := (select auth.uid());
  v_payload jsonb := p_payload;
begin
  if p_user_id is null or p_user_id = v_actor then
    return; -- nobody, or a self-notification: suppressed in every path
  end if;
  -- actor_id injected ONLY when auth.uid() is non-NULL: a SQL-NULL jsonb_set
  -- new_value behaves version-dependently, so the key stays ABSENT for
  -- service-role writes → payload->>'actor_id' IS NULL (dry-run assertion (f)).
  if v_actor is not null then
    v_payload := jsonb_set(p_payload, '{actor_id}', to_jsonb(v_actor));
  end if;
  insert into public.notifications (user_id, category, title, body, payload)
  values (p_user_id, p_category, p_title, p_body, v_payload);
end $$;

revoke all on function public.notify_user(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- Actor display-name helper: profiles.display_name → username → 'Someone'
-- (NULL-tolerant; NULL auth.uid() → no profile row → 'Someone').
create function public.notifier_actor_name() returns text
  language sql security definer stable set search_path = '' as $$
  select coalesce(
    (select p.display_name from public.profiles p where p.id = (select auth.uid())),
    (select p.username    from public.profiles p where p.id = (select auth.uid())),
    'Someone') $$;

revoke all on function public.notifier_actor_name() from public, anon, authenticated;-- ══════════════════════ 2. BANDMATE LINKS — INVITE / ACCEPT / DECLINE (task 0.2) ══════════════════════
-- AFTER triggers: the INSERT carries the invitation (recipient = new.bandmate_id,
-- the invitee); the UPDATE carries the inviter-side accept/decline rows
-- (recipient = new.user_id, the inviter). Status transitions are pinned to
-- pending → active/declined; actor via notifier_actor_name; category
-- 'invitation' per the category contract (rows 1-2).
create function public.notify_bandmate_invited() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_user(
    new.bandmate_id, 'invitation',
    public.notifier_actor_name() || ' invited you to be a bandmate',
    null,
    jsonb_build_object('action', 'invite', 'bandmate_id', new.bandmate_id));
  return null;
end $$;

revoke all on function public.notify_bandmate_invited() from public, anon, authenticated;

create trigger bandmate_links_insert_notify
  after insert on public.bandmate_links
  for each row execute function public.notify_bandmate_invited();

create function public.notify_bandmate_responded() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'active' then
    perform public.notify_user(
      new.user_id, 'invitation',
      public.notifier_actor_name() || ' accepted your invitation',
      null,
      jsonb_build_object('action', 'bandmate-accepted'));
  elsif old.status = 'pending' and new.status = 'declined' then
    perform public.notify_user(
      new.user_id, 'invitation',
      public.notifier_actor_name() || ' declined your invitation',
      null,
      jsonb_build_object('action', 'bandmate-declined'));
  end if;
  return null;
end $$;

revoke all on function public.notify_bandmate_responded() from public, anon, authenticated;

create trigger bandmate_links_update_notify
  after update on public.bandmate_links
  for each row execute function public.notify_bandmate_responded();-- ══════════════════════ 3. SETLIST COLLABORATORS — INVITE / PERMISSION / REMOVAL (tasks 0.3-0.4) ══════════════════════
-- (a) INSERT → the invitee ("invited you to edit"), skipping when the invitee
-- is the CURRENT owner at statement time — the transfer RPC re-inserts the
-- former owner BEFORE the ownership flip, so the immediate check identifies
-- the transfer re-insert (Decision 4: immediate, NOT deferred).
create function public.notify_collaborator_added() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  select s.owner_id into v_owner from public.setlists s where s.id = new.setlist_id;
  if v_owner is not null and new.user_id = v_owner then
    return null; -- transfer re-insert: former owner re-added inside the RPC transaction
  end if;
  perform public.notify_user(
    new.user_id, 'setlist',
    public.notifier_actor_name() || ' invited you to edit ' ||
      coalesce((select s.name from public.setlists s where s.id = new.setlist_id), ''),
    null,
    jsonb_build_object('action', 'shared', 'setlist_id', new.setlist_id));
  return null;
end $$;

revoke all on function public.notify_collaborator_added() from public, anon, authenticated;

create trigger setlist_collaborators_insert_notify
  after insert on public.setlist_collaborators
  for each row execute function public.notify_collaborator_added();

-- (b) UPDATE where can_edit flips → the affected member ("permissions ...
-- changed to View Only / to Edit"). Self-flips are excluded by notify_user's
-- self-suppression (the 0006 self-accept wrinkle never reaches this trigger).
create function public.notify_collaborator_permission() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_name text := (select s.name from public.setlists s where s.id = new.setlist_id);
begin
  if old.can_edit is distinct from new.can_edit then
    perform public.notify_user(
      new.user_id, 'setlist',
      'Your permissions on ' || coalesce(v_name, '') || ' have changed to ' ||
        case when new.can_edit then 'Edit' else 'View Only' end,
      null,
      jsonb_build_object('action', 'permission', 'setlist_id', new.setlist_id));
  end if;
  return null;
end $$;

revoke all on function public.notify_collaborator_permission() from public, anon, authenticated;

create trigger setlist_collaborators_update_notify
  after update on public.setlist_collaborators
  for each row execute function public.notify_collaborator_permission();

-- (c) DEFERRED DELETE → the removed member, evaluated at COMMIT: emits only
-- when the setlist still exists (setlist cascade-delete removed the row with
-- its setlist → skip) AND the deleted user is not the commit-time owner
-- (ownership transfer → the deleted user IS the new owner → skip, Decision 3).
-- Title is the spec literal "You have been removed from {Setlist}" with NO
-- actor prefix (Resolved Decision 1, supersedes the design line 285 draft);
-- body NULL. "No further notifications" holds by row absence, not filter logic.
create function public.notify_removed_collaborator() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_setlist public.setlists%rowtype;
begin
  select * into v_setlist from public.setlists s where s.id = old.setlist_id;
  if v_setlist.id is not null and old.user_id <> v_setlist.owner_id then
    perform public.notify_user(
      old.user_id, 'setlist',
      'You have been removed from ' || coalesce(v_setlist.name, ''),
      null,
      jsonb_build_object('action', 'removed', 'setlist_id', old.setlist_id));
  end if;
  return null;
end $$;

revoke all on function public.notify_removed_collaborator() from public, anon, authenticated;

create constraint trigger setlist_collaborators_delete_notify
  after delete on public.setlist_collaborators
  deferrable initially deferred
  for each row execute function public.notify_removed_collaborator();