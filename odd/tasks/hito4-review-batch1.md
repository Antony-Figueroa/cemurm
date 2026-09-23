# Hito 4 — Review batch 1 (critical + high fixes)

## Objective
Fix every finding tagged `[critical]`/`[high]` from the code review of the pushed Hito 4 batch (`9edf77b..HEAD`), tracked in GitHub issues #149–#154 on `davidjesus516/cemurm`. Mediums/lows stay open for pass 2.

## Source of truth
- Issues: #149 (migrations/RLS), #150 (minors), #151 (moderation), #152 (music theory), #153 (services/rehearsals UI — no batch-1 items), #154 (library/orgs UI — no batch-1 items)
- Full finding detail (severity, `file:line`, trigger, impact): issue bodies mirror `.issue-bodies/*.md` (deleted after issue creation)
- Specs: `features/community-moderation.feature`, `features/minors-and-guardian-consent.feature`, `features/music-theory.feature`, `features/organizational-repertoire-model.feature`

## SQL approach decision
Single new migration `supabase/migrations/0020_review_batch1.sql` carries every DB delta with idempotent statements (`drop policy if exists` / `create policy` / `create or replace function` / `revoke`/`grant`), so a fresh full-chain reset and an already-deployed database both converge. One exception: the 0019 duplicate-function chain-breaker must be fixed **in place** (a fresh chain aborts at `0019:184` before reaching 0020).

## Scope (batch 1 — 16 items)

### Issue #149 — migrations/RLS (SQL work unit)
- [ ] C1 `0016:122` — `songs_select_system USING (org_id is null)` exposes every personal song to every authenticated user (system rows must be distinguished by provenance; verify how `org_demote_song` populates `source_org_id` before choosing the predicate)
- [ ] C2 `0019:184` — duplicate `private.display_name_for(uuid)` → `create or replace` in place
- [ ] H `0016:221-230,479-506` — unconstrained `event_participants.org_id` → cross-tenant `event_repertoire` read; policy must restrict `org_id` to orgs the organizer actually belongs to
- [ ] H `0016:166-179` — `songs_update_source_org` missing `WITH CHECK` → foreign-tenant `org_id`/`branch_id` write
- [ ] H `0016:309-325` — `event_setlists_update_organizer` `WITH CHECK` doesn't re-verify organizer / target event scoping

### Issue #150 — minors/consent (SQL + frontend)
- [ ] C3 — nothing writes `profiles.date_of_birth`, so `session_is_minor()` is always false: derive `is_minor` server-side at signup from `auth.raw_user_meta_data->>'isMinor'` (insert-time only; `updateUser` metadata edits must NOT flip it) — requires reconciling with the `BEFORE INSERT OR UPDATE OF date_of_birth` trigger, which overwrites `is_minor` from dob (dob wins when present, else keep the supplied flag); verify `is_minor` has no client write path
- [ ] H8 `0017:71` — revoke client `update (date_of_birth)` grant (single-request bypass of minor status + consent archiving)
- [ ] H10 `0017:318-337` + `SongDetail.jsx:643` — approval is self-service by the minor; mirror the login-less revocation capability pattern: `sharing_approval_token` on `guardian_consents`, exposed to the minor's self-select, anon RPC `approve_guardian_sharing(user_id, guardian_email, token)` with bounded UPDATE; **drop** the self-approval RPCs (authenticated bypass path); frontend: minor sees a shareable guardian link + approval status instead of an approve button, plus a public `/guardian-approve` route that calls the anon RPC

### Issue #151 — moderation (SQL + frontend)
- [ ] H `ModerationQueue.jsx:42` — pass `isMod` (+ appeal props) so Keep/Remove/Escalate renders
- [ ] H appeal unreachable end to end — SQL: contributor SELECT on `moderation_cases` for entries they own (case rows only, never `reports` — reporter confidentiality); client: non-mod path to own decided case + appeal form wired (`onAppeal`, `fileAppeal`), queue shows appeal rows to moderators
- [ ] H `0015:187-206` — appeal decided `keep` must restore `public_songs.status = 'live'` + notify contributor
- [ ] H `0015:164,152` — escalated case must be decidable by a `system_admin` (and only then, while `decision = 'escalate'`); null-decision path keeps the moderator gate
- [ ] H `0015:249` — one appeal per original case (`appeal_of` existence check)

### Issue #152 — music theory (frontend)
- [ ] H `parser.js:9,69-87` — `key` in `KNOWN_META` makes the section-key branch unreachable; first `{key}` = song key (first-wins), later ones = section contexts; wire `sectionKeyContexts` into degree resolution per `music-theory.feature:110,134`
- [ ] H `degreeResolver.js:68-100` — triad indices off by one scale degree (`degree+1/+2` → `degree+2/+3` with wraparound) → quality always `'power'` → all numerals uppercase
- [ ] H `degreeResolver.js:138-150` — `parseKeyContext('Am')` returns `null`; accept the `m`/minor suffix and resolve it to the correct catalog scale (collateral fix in `scaleCatalog.findScaleByName` allowed only if required for correct resolution — the cardinality-ascending substring fallback must not pick *Pentatonic Minor*)

## Work units
1. **SQL** — all DB items above (one migration 0020 + in-place 0019 edit) → conventional commits per concern
2. **Frontend** — moderation UI, minors approval UI/route, music-theory fixes → conventional commits per concern

## Verification
- [ ] `pnpm lint` → exit 0, zero warnings
- [ ] Parser/resolver: targeted Node assertions (temp script, not committed): first-key-wins, section contexts populated, `parseKeyContext('Am')` non-null, C major degree 1/4/7 qualities major/minor/diminished, `Dm`→`ii`, `F#dim` in G→`vii°`
- [ ] SQL: fresh full-chain `supabase db reset` (if local stack/CLI available — see `docs/local-dev.md`); if unavailable, report **NOT RUN** honestly
- [ ] Targeted SQL probes when stack available: personal `org_id IS NULL` song invisible to other users; `session_is_minor()` true for metadata-minor signup; consent RPC succeeds for that minor; anon approve-with-token works, self-approval RPC gone; second appeal rejected; escalated case decidable by system_admin only

## Delivery
- [ ] Branch `fix/hito4-review-batch1` (from `main`), commits without attribution footers
- [ ] Push to `fork` remote (`Antony-Figueroa/cemurm`)
- [ ] Report + PR decision with user

## Status
- [x] Issues #149–#154 created
- [x] Fork `Antony-Figueroa/cemurm` created, `fork` remote added, branch created
- [ ] Work unit 1 (SQL)
- [ ] Work unit 2 (frontend)
- [ ] Final verification
- [ ] Push
