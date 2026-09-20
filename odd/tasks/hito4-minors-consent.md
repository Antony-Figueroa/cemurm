# Hito 4 — Minors and Guardian Consent

## Objective
Minor accounts require guardian consent before features unlock; visibility-restricted (never on public surfaces); consent lifecycle (record, revoke, archive at 18); revocation never deletes data.

## BDD
`features/minors-and-guardian-consent.feature` (11 scenarios): signup age gate + under-18 routing, account inactive until consent, consent record stores guardian identity/date/consent text, minor blocked from public sharing unless guardian approves, instructor sees only org participation (never personal/practice/community), minors absent from public profiles/suggested lists, guardian review + revoke, revocation restricts immediately + org notified, turning 18 ends minor status + archives consent, revocation never deletes data.

## Backend (validated — migration 0017, branch feat/hito4-minors-consent)
**`supabase/migrations/0017_minors_guardian_consent.sql`** (no deps on 0014/0015/0016):
- `profiles.date_of_birth date` + `is_minor boolean default false` — flag maintained ONLY by `private.set_profile_minor_flag()` trigger (BEFORE INSERT OR UPDATE OF date_of_birth); computes `dob > current_date - interval '18 years'` (adult at 18th birthday); minor→adult transition archives any ACTIVE consent. No select grants on either column (birth dates stay server-side); `grant update (date_of_birth)` column-scoped for the signup flow.
- `guardian_consents` table: user_id, guardian_name/email, consent_text (exact text seen), consent_version, status ('active'|'revoked'|'archived'), public_sharing_approved (+approved_at), revocation_token (uuid, capability), consented_at/revoked_at/archived_at. Partial unique index: one ACTIVE consent per user. RLS self-select only; all writes via RPCs.
- Helpers: `private.profile_is_minor(uuid)`, `private.session_is_minor()`, `private.guardian_consent_active(uuid)` (definer, stable).
- `profiles_select_search` recreated with `and not private.profile_is_minor(id)` — minors never appear in public profiles/suggested lists.
- `private.publish_song_to_library` recreated verbatim + minor guard: minor without ACTIVE consent + public_sharing_approved → raise `'Guardian approval required for public sharing'`. Grants re-issued (0012 lines 135-138).
- RPCs (definer core + public wrapper):
  - `record_guardian_consent(user_id, guardian_name, guardian_email, consent_text)` — self + minor only; guards: 'You can only consent for your own account.', 'Consent is only required for minors.', 'Consent already active for this account.'
  - `approve_guardian_public_sharing(user_id)` — self + minor + active consent; 'Consent not found or not active.'
  - `revoke_guardian_consent(user_id, guardian_email, revocation_token)` — login-less capability (ONLY anon-granted definer entry; documented); 'Consent not found or already finalized.'; after revoke, notifies org admins (org_owner/org_admin/branch_admin of the minor's active orgs) via `public.notify_user` category 'system'.
- Auth initPlan guard message: 'Guardian consent required.'

## Frontend (pending)
- `src/lib/minors.js`: `getConsentStatus()` (guardian_consents self select), `recordConsent`, `approvePublicSharing` (authenticated RPCs) — error mapping convention
- `src/pages/Auth.jsx` + `src/lib/auth.js`: age gate at signup (`isMinor` in user_metadata; date_of_birth self-update for minors), under-18 routes to consent flow
- Guard wrapper in `src/App.jsx`: if `user_metadata.isMinor` && no ACTIVE consent → "Guardian consent required" screen (BDD scenario 2: no feature usable) instead of the app
- Consent screen: shows the consent text, guardian name/email inputs, submit → `record_guardian_consent` → unlock; once active, optional "Public sharing approval" action (needed before publishing to the library)
- PublicLibrary publish gate: if minor without approval → surface 'Guardian approval required for public sharing' (server already blocks; UI should pre-check consent status)
- (revoke UI = emailed link hitting the revoke RPC; out of scope for the PWA slice — RPC + tests cover it)

## Verification (backend)
- [x] `supabase db reset` applies 0001→0013 + 0017 cleanly (spot re-check EXIT=0)
- [x] Fixture: dob 2012 → is_minor t; profile_is_minor t/f; session_is_minor no-uid → f
- [x] record consent as minor → uuid; repeat → 'Consent already active for this account.'; adult → 'Consent is only required for minors.'; other → 'You can only consent for your own account.'
- [x] Minor reads own consent row (token visible); outsider 0 rows; client write to guardian_consents denied; client read of date_of_birth denied
- [x] Publish without approval → 'Guardian approval required for public sharing'; after approve → publishes (uuid); after revoke → blocked again
- [x] Revoke: wrong token → 'Consent not found or already finalized.'; right token+email (anon) → revoked + revoked_at; notification row for org admin (payload user_id + org_id); zero-admin org handled (no crash)
- [x] Search: minor absent from other users' profiles select; minor self-visible; dob removed → visible again
- [x] Turn 18: re-minor → fresh active consent → dob 2005 → is_minor f + consent archived; earlier revoked row untouched
- [x] Anon hardening: record/approve → permission denied for function; revoke callable anon, capability-gated

## Notes
- Revocation "never deletes data" is structural: revoke only flips status; explicit deletion remains future account-settings work.
- The anon-granted revoke RPC is a deliberate capability-token design (guardian is likely not a CEMURM user); token + email required; documented in the migration.
- Instructor-scoped visibility needs no extra work: practice_sessions/personal_annotations/annotations are already owner-only RLS; profiles search now excludes minors.