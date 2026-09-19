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

revoke all on function public.notifier_actor_name() from public, anon, authenticated;