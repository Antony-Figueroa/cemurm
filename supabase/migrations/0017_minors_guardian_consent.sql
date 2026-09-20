-- CEMURM 0017 — Minor accounts + guardian consent: dob/is_minor flag, consent ledger, minor
-- visibility exclusion, publish guard, consent RPCs
--
-- Slice: feat/hito4-minors-consent — migration 0017 only (backend of the
-- Minor Accounts and Guardian Consent feature).
-- Business contract (features/minors-and-guardian-consent.feature):
--  · signup age gate (scenario 1): under-18 declarations start the guardian consent flow;
--    the app routes on user_metadata — the DB keeps date_of_birth server-side only.
--  · account activates via consent (scenario 2): a minor whose guardian has NOT consented
--    is locked behind the "Guardian consent required" screen — the consent RPCs below are
--    the only write path into guardian_consents (no client table grants).
--  · consent record (scenario 3): stores guardian identity, date, and the consent text they
--    saw; status 'active' by default.
--  · public-sharing gate (scenario 4): a minor's publish is blocked with
--    'Guardian approval required for public sharing' until the guardian approves;
--    revocation flips the same check back on immediately (scenario 7).
--  · public-surface exclusion (scenario 6): minors never appear in public profiles /
--    suggested lists — profiles_select_search excludes them; self-select still shows the
--    minor their own row; org-instructor views are covered by the existing owner-only RLS
--    on annotations/practice (instructor sees only org participation).
--  · lifecycle (scenarios 5/7/8): guardian can revoke via a login-less capability
--    (email + 128-bit revocation_token), org admins are notified on revocation, and
--    turning 18 ENDS minor status (is_minor computed from date_of_birth, flipped OFF on the
--    18th birthday) and archives any active consent.
--  · revoking never deletes data (scenario 9): consent rows transition to 'revoked';
--    nothing is removed.
--
-- Conventions (0002/0006/0012/0015 style): comment headers with scenario map; SECURITY
-- DEFINER cores in `private` with `set search_path = ''` + fully-qualified refs; thin
-- public wrappers (0012 lines 116-125); REVOKE from public/anon then GRANT to
-- authenticated (grants AFTER policies — D6 order); policy-recursion contract — no
-- policy on T may reference a table whose policies reference T back; SECURITY DEFINER
-- helpers (private.profile_is_minor) are the sanctioned way to resolve cross-table state
-- from a policy (0002 lines 136-141 precedent), so profiles_select_search stays acyclic.

-- ══════════════════════ 1. PROFILES: DOB + MINOR FLAG + TRIGGER ══════════════════════
-- date_of_birth is NEVER client-selectable (no select grant) — birth dates stay
-- server-side; the app learns minor status via user_metadata / guardian_consents.
-- is_minor is derived by the trigger (no client write path, no select grant) —
-- a person stops being a minor ON their 18th birthday (dob <= today - 18y ⇒ adult).
alter table public.profiles add column date_of_birth date;
alter table public.profiles add column is_minor boolean not null default false;

-- flag recompute + minor→adult archive: the ONLY writer of is_minor; when the row
-- transitions minor → adult, any ACTIVE consent is archived (scenario 8). SECURITY
-- DEFINER + locked search_path: the trigger must archive consents even though clients
-- cannot write guardian_consents (literal column list keeps updates honest).
create or replace function private.set_profile_minor_flag() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  new.is_minor := new.date_of_birth is not null and new.date_of_birth > (current_date - interval '18 years');
  -- minor → adult transition (old is NULL on INSERT → no-op): archive active consents
  if old.is_minor and not new.is_minor then
    update public.guardian_consents
    set status = 'archived', archived_at = now()
    where user_id = new.id and status = 'active';
  end if;
  return new;
end $$;

-- trigger-only entry point: lockable via RPC would be a definer footgun (0006 lines 53-54)
revoke all on function private.set_profile_minor_flag() from public, anon, authenticated;

create trigger profiles_minor_flag
  before insert or update of date_of_birth on public.profiles
  for each row execute function private.set_profile_minor_flag();

-- privacy posture: ONLY the dob column is writable by the client (0006 grants the other
-- update columns); neither new column is selectable by anyone (birth dates stay
-- server-side; the app learns minor status via user_metadata and guardian_consents).
grant update (date_of_birth) on table public.profiles to authenticated;

-- ══════════════════════ 2. GUARDIAN_CONSENTS — LEDGER + SELF-SELECT RLS ══════════════════════
-- The consent record (scenario 3): guardian identity, the exact consent text the guardian
-- saw (consent_text, immutable), version for future copy changes, and the capability
-- token (revocation_token, 128-bit random) that makes guardian revocation login-less.
-- status: 'active' | 'revoked' | 'archived' — revoked never deletes data (scenario 9);
-- archived is the minor→adult terminal state (scenario 8). Partial unique index enforces
-- ONE active consent per user in the DB itself (the RPC's existence check is the friendly
-- error; the index is the race-proof backstop).
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guardian_name text not null,
  guardian_email text not null,
  consent_text text not null,               -- exact text the guardian saw (scenario 3)
  consent_version text not null default 'v1',
  status text not null default 'active',    -- 'active' | 'revoked' | 'archived'
  public_sharing_approved boolean not null default false,
  public_sharing_approved_at timestamptz,
  revocation_token uuid not null default gen_random_uuid(),  -- capability for login-less guardian revocation
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_guardian_consents_user on public.guardian_consents (user_id);
create unique index guardian_consents_one_active on public.guardian_consents (user_id) where status = 'active';

alter table public.guardian_consents enable row level security;

-- deny-by-default: auto_expose_new_tables grants defaults on creation — the explicit
-- revoke re-ships 0002's lock (0002 lines 57-59) before the targeted grant (D6 order).
-- anon/authenticated only (repo convention, 0013 line 37): service_role keeps full
-- access for the backend.
revoke all on table public.guardian_consents from anon, authenticated;

-- self-select only: the minor (or ex-minor) reads their own consent row — includes the
-- revocation_token the client needs to surface later. NO client insert/update/delete —
-- every write goes through the consent RPCs (section 6). Policy references auth.uid()
-- only → no recursion.
drop policy if exists guardian_consents_select_self on public.guardian_consents;
create policy guardian_consents_select_self on public.guardian_consents
  for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

grant select on table public.guardian_consents to authenticated;

-- ══════════════════════ 3. HELPERS — MINOR/ADULT + CONSENT STATE ══════════════════════
-- SECURITY DEFINER + locked search_path + fully-qualified refs (0002 line 55). These are
-- safe to call from policies (policy-recursion contract): definer helpers are the
-- sanctioned cross-table resolution point (0002 lines 136-141 precedent), so
-- profiles_select_search stays acyclic.
create or replace function private.profile_is_minor(p_user_id uuid) returns boolean
  language sql security definer stable set search_path = '' as $$
  select coalesce((select p.is_minor from public.profiles p where p.id = p_user_id), false);
$$;

create or replace function private.session_is_minor() returns boolean
  language sql security definer stable set search_path = '' as $$
  select (select auth.uid()) is not null and private.profile_is_minor((select auth.uid()));
$$;

create or replace function private.guardian_consent_active(p_user_id uuid) returns boolean
  language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.guardian_consents gc
    where gc.user_id = p_user_id and gc.status = 'active'
  );
$$;

-- private-schema default-revoke convention (0002 lines 33-42): lock the entry points,
-- then open them for authenticated + service_role.
revoke execute on function private.profile_is_minor(uuid) from public, anon;
revoke execute on function private.session_is_minor() from public, anon;
revoke execute on function private.guardian_consent_active(uuid) from public, anon;
grant execute on function private.profile_is_minor(uuid) to authenticated, service_role;
grant execute on function private.session_is_minor() to authenticated, service_role;
grant execute on function private.guardian_consent_active(uuid) to authenticated, service_role;

-- ══════════════════════ 4. PUBLIC-SURFACE EXCLUSION (scenario 6) ══════════════════════
-- minors never appear in public profiles / suggested lists: the search policy (0006 line
-- 88, any authenticated row read, column visibility capped by the 0006 column-limited
-- select grant) now ALSO excludes minor rows. private.profile_is_minor is a definer
-- helper → no policy cycle (guards the profiles → profiles recursion). Self-select stays
-- untouched: the minor still sees their OWN row; instructor scoping to org participation
-- already holds via owner-only RLS on annotations/practice tables.
drop policy if exists profiles_select_search on public.profiles;
create policy profiles_select_search on public.profiles
  for select to authenticated
  using ((select auth.uid()) is not null and not private.profile_is_minor(id));

-- ══════════════════════ 5. PUBLISH GUARD — MINOR PUBLIC-SHARING GATE (scenario 4) ══════════════════════
-- Recreates the 0012 core (lines 29-90) verbatim — initPlan guard, license confirmation,
-- license vocabulary, ownership, one-live-entry, lineage — PLUS the minor gate right
-- before the insert. Revoking consent flips the gate back on immediately because the
-- check reads CURRENT guardian_consents state (scenario 7: "all public and out-of-org
-- activity stops immediately").
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

  -- minors: an ACTIVE guardian consent with public-sharing approval is required;
  -- revocation flips this check back off immediately (scenario: revoking restricts).
  if private.session_is_minor() and not exists (
    select 1 from public.guardian_consents gc
    where gc.user_id = v_owner and gc.status = 'active' and gc.public_sharing_approved
  ) then
    raise exception 'Guardian approval required for public sharing';
  end if;

  insert into public.public_songs
    (song_id, contributor_id, license, license_confirmed, lineage, status)
  values
    (p_song_id, v_owner, p_license, true, p_lineage_public_song_id, 'live')
  returning id into v_entry_id;

  return v_entry_id;
end $$;

-- Re-issue the 0012 private-core grants (0012 lines 135-138): recreating the function
-- may drop grants, so the lock is re-declared then re-opened for authenticated only
-- (the public wrapper — still the 0012 object, NOT recreated — keeps its own grants).
revoke execute on function private.publish_song_to_library(uuid, text, boolean, uuid) from public, anon;
grant execute on function private.publish_song_to_library(uuid, text, boolean, uuid) to authenticated;

-- ══════════════════════ 6. CONSENT RPCS — DEFINER CORE + PUBLIC WRAPPER (0012 convention) ══════════════════════
-- All consent writes are RPC-only (the table has no client insert/update/delete grants).
-- Each core: SECURITY DEFINER + search_path '' + fully-qualified refs; each public
-- wrapper is a one-line SQL definer passthrough (0012 lines 116-125 pattern).

-- ── 6.1 record_guardian_consent — signs the consent on the MINOR's own account (scenario 2/3)
-- Error vocabulary: the initPlan guard reuses the BDD lock-screen wording
-- 'Guardian consent required.' (features/minors-and-guardian-consent.feature scenario 2:
-- "the account stays inactive with 'Guardian consent required'") — the client maps that
-- string back to the same lock screen. All other messages are exact user-facing strings.
create or replace function private.record_guardian_consent(
  p_user_id uuid,
  p_guardian_name text,
  p_guardian_email text,
  p_consent_text text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_consent_id uuid;
begin
  -- initPlan guard (0002 line 130 shape): no session → nothing to consent to. Uses the
  -- BDD lock-screen wording (scenario 2) so the client shows the same "Guardian consent
  -- required" screen for a logged-out or locked account.
  if v_actor is null then
    raise exception 'Guardian consent required.';
  end if;

  -- self-only: consent is a personal record; you cannot consent for someone else
  if p_user_id is distinct from v_actor then
    raise exception 'You can only consent for your own account.';
  end if;

  -- adults need no consent (scenario 1: 18+ continues the normal signup)
  if not private.session_is_minor() then
    raise exception 'Consent is only required for minors.';
  end if;

  -- one ACTIVE consent per user; the partial unique index is the race-proof backstop
  if private.guardian_consent_active(p_user_id) then
    raise exception 'Consent already active for this account.';
  end if;

  insert into public.guardian_consents
    (user_id, guardian_name, guardian_email, consent_text)
  values
    (p_user_id, p_guardian_name, p_guardian_email, p_consent_text)
  returning id into v_consent_id;

  -- return the row id; the revocation_token is readable by the minor via the
  -- self-select RLS (select id, revocation_token from guardian_consents where …)
  return v_consent_id;
end $$;

create or replace function public.record_guardian_consent(
  p_user_id uuid,
  p_guardian_name text,
  p_guardian_email text,
  p_consent_text text
)
returns uuid
language sql security definer set search_path = '' as $$
  select private.record_guardian_consent(p_user_id, p_guardian_name, p_guardian_email, p_consent_text);
$$;

-- ── 6.2 approve_guardian_public_sharing — guardian approval recorded (scenario 4)
-- Recorded on the active consent row (public_sharing_approved + timestamp); the publish
-- guard (section 5) reads exactly this.
create or replace function private.approve_guardian_public_sharing(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Guardian consent required.';
  end if;

  if p_user_id is distinct from v_actor then
    raise exception 'You can only consent for your own account.';
  end if;

  if not private.session_is_minor() then
    raise exception 'Consent is only required for minors.';
  end if;

  update public.guardian_consents
  set public_sharing_approved = true,
      public_sharing_approved_at = now(),
      updated_at = now()
  where user_id = p_user_id and status = 'active';

  if not found then
    raise exception 'Consent not found or not active.';
  end if;
end $$;

create or replace function public.approve_guardian_public_sharing(p_user_id uuid)
returns void
language sql security definer set search_path = '' as $$
  select private.approve_guardian_public_sharing(p_user_id);
$$;

-- ── 6.3 revoke_guardian_consent — the guardian path, deliberately login-less (scenario 5/7)
-- The pairing (guardian_email + revocation_token, a 128-bit random UUID generated at
-- consent time) IS the capability: the token is the secret, the email is the witness.
-- The guardian revokes through a link/email flow without ever authenticating. What the
-- entry point can do is strictly bounded by the single UPDATE below (flip an ACTIVE
-- consent → 'revoked' + timestamp) and the org-admin notifications — no other state is
-- reachable: all other writes go through authenticated-only RPCs or the table's lack of
-- client grants. Revoking never deletes data (scenario 9) — the row stays.
create or replace function private.revoke_guardian_consent(
  p_user_id uuid,
  p_guardian_email text,
  p_revocation_token uuid
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org   record;
  v_admin uuid;
begin
  update public.guardian_consents
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where user_id = p_user_id
    and guardian_email = p_guardian_email
    and revocation_token = p_revocation_token
    and status = 'active';

  if not found then
    raise exception 'Consent not found or already finalized.';
  end if;

  -- participation scope changed (scenario 7: "the org is notified that the student's
  -- participation scope changed"): for each org the minor has an ACTIVE membership in,
  -- notify that org's admins (org_owner/org_admin/branch_admin, distinct, excluding the
  -- minor themself — notify_user would suppress self rows anyway). Zero admins = zero
  -- notifications, still no error.
  for v_org in
    select distinct om.org_id
    from public.org_memberships om
    where om.user_id = p_user_id and om.status = 'active'
  loop
    for v_admin in
      select distinct om2.user_id
      from public.org_memberships om2
      where om2.org_id = v_org.org_id
        and om2.role in ('org_owner', 'org_admin', 'branch_admin')
        and om2.status = 'active'
        and om2.user_id <> p_user_id
    loop
      perform public.notify_user(
        v_admin, 'system', 'Student consent revoked',
        'The student account can no longer participate publicly or outside the org.',
        jsonb_build_object('user_id', p_user_id, 'org_id', v_org.org_id));
    end loop;
  end loop;
end $$;

create or replace function public.revoke_guardian_consent(
  p_user_id uuid,
  p_guardian_email text,
  p_revocation_token uuid
)
returns void
language sql security definer set search_path = '' as $$
  select private.revoke_guardian_consent(p_user_id, p_guardian_email, p_revocation_token);
$$;

-- ── 6.4 EXECUTE GRANTS (0012 mirror) ══════════════════════
-- private-schema default-revoke convention (0002 lines 33-42): lock the entry points,
-- then open them. record/approve are MINOR-session flows → authenticated ONLY. The
-- revoke entry point is the ONLY anon-granted definer surface in the app — see 6.3 for
-- the capability-token rationale and its strictly bounded effect (consent status flip +
-- org-admin notification; nothing else). The self-select policy on guardian_consents
-- remains the only table read; no client writes anywhere.
revoke execute on function private.record_guardian_consent(uuid, text, text, text) from public, anon;
revoke execute on function public.record_guardian_consent(uuid, text, text, text) from public, anon;
grant execute on function private.record_guardian_consent(uuid, text, text, text) to authenticated;
grant execute on function public.record_guardian_consent(uuid, text, text, text) to authenticated;

revoke execute on function private.approve_guardian_public_sharing(uuid) from public, anon;
revoke execute on function public.approve_guardian_public_sharing(uuid) from public, anon;
grant execute on function private.approve_guardian_public_sharing(uuid) to authenticated;
grant execute on function public.approve_guardian_public_sharing(uuid) to authenticated;

revoke execute on function private.revoke_guardian_consent(uuid, text, uuid) from public, anon;
revoke execute on function public.revoke_guardian_consent(uuid, text, uuid) from public, anon;
grant execute on function private.revoke_guardian_consent(uuid, text, uuid) to authenticated;
grant execute on function public.revoke_guardian_consent(uuid, text, uuid) to anon, authenticated;