# Hito 4 — Organizational Repertoire Model

## Objective
Hierarchical repertoire: system-level unified catalog, org-level and branch-level collections, cross-branch event collaboration, role-gated promotion/demotion, read-only history after org change and event conclusion.

## BDD
`features/organizational-repertoire-model.feature` (21 scenarios): system catalog, org adds to system with provenance, ownership edits, branch isolation, system song across branches, branch-specific additions, promote/demote, multi-role dashboards, instructor branch-only insert, cross-branch event union, partial/full collaboration, event setlist independence, post-event archive, offline cross-org (future), former-member history, disbanded org record, system-admin removal from system.

## Backend (validated live against local Supabase)
**Migration `0016_org_repertoire_model.sql`** (branch `feat/hito4-org-repertoire`, based on main; no cross-branch deps):
- `private.session_has_system_role(text)` — SECURITY DEFINER helper for `user_roles` (`system_admin`), tenancy-guarded, granted authenticated + service_role
- RLS (drop-if-exists + create, grants after policies):
  - organizations: SELECT any authenticated (discovery metadata)
  - branches: SELECT org member OR system_admin
  - org_memberships: SELECT self (incl. `former` history) OR org_owner/org_admin roster OR system_admin
  - songs: SELECT owner + system (org_id NULL) + org member + branch member; INSERT scoped (creator may place at system / own org / own branch with branch↔org pairing, else RLS rejects); UPDATE source-org edit rights on promoted songs
  - events / event_participants: SELECT any authenticated (A1); writes organizer-only (events EXISTS)
  - event_rsvps: self select/insert/update
  - event_setlists: SELECT organizer OR own-org member OR `visibility='event'` participant; writes organizer-only; UPDATE/DELETE blocked once event `concluded` (read-only archive)
- RPCs (SECURITY DEFINER core + public wrapper, 0012 convention):
  - `promote_song_to_system` — instructor+ of source org OR system_admin; records `source_org_id` provenance
  - `demote_song_to_org` — system_admin OR instructor+ of source org; returns song to its source org
  - `leave_organization` — active member → `status='former'`, `left_at=now()`
  - `event_repertoire` — organizer-or-participant scoped union: system songs + all songs of participating orgs (org and branch level) for the event picker
- Grants: orgs/branches/org_memberships SELECT; events/participants/setlists full CRUD (organizer policies); rsvps select/insert/update; songs kept from 0002

## Frontend (validated — lint + build green)
- `src/lib/orgRepertoire.js`: `getMyOrganizations` (self memberships with nested org/branch + former history; explicit self-row filter because the roster policy also exposes full rosters to owners/admins), `promoteSong`, `demoteSong`, `leaveOrganization` — RPC wrappers with exact user-error mapping (songs.js convention)
- `src/pages/Organizations.jsx`: My organizations cards (org name/type/role/branch/status), Repertoire scopes grouped by level (System / Org-level / Branch-level) with promote/demote buttons gated by elevated-active memberships (mirrors RPC authority), Leave-organization flow with confirm; RLS is the source of truth; hole state hides repertoire/leave when no memberships
- `src/App.jsx` route `/organizations` (protected) + `src/components/layout/AppLayout.jsx` nav link
- `src/lib/songs.js`: `flattenSong` adds additive `orgId`/`branchId`/`sourceOrgId` only (no other behavior touched)
- Delegate spot-check: lint exit 0 (zero warnings), build 2.13s, consumers unaffected

## Verification (backend)
- [x] `supabase db reset` applies 0001→0013 + 0016 cleanly
- [x] demo sees 2 orgs + Sede Centro branch + own membership; isolation sees 0 Demo branches; outsider sees orgs only
- [x] Song scope: demo sees Way Maker/Oceans (branch b1) not Isolation Anthem; isolation only Isolation Anthem; outsider none
- [x] Scoped insert: insert into non-member org → RLS rejects; own org+branch and system-level inserts OK
- [x] Promote: demo promotes Oceans → org null + source_org_id=a1; isolation sees it; isolation re-promote → 'Song is already at system level.'; outsider promote → 'You can only promote songs from your own organization.'
- [x] Demote: demo returns Oceans to a1; isolation loses visibility
- [x] Leave: isolation leaves a2 → status former + left_at; own row still readable (history)
- [x] Event: participant isolation sees union (Way Maker/Oceans a1 + Isolation Anthem a2); outsider → 'Not a participant.'
- [x] Concluded guard: organizer creates event_setlist; after conclusion UPDATE → RLS rejects; SELECT persists

## Review status (RDD)
- Assess `medium` (executable_change), `slice_budget_reached` (1067 changed lines base main).
- Preflight STATUS returned `stop / managed_assets_outdated` → `gentle-ai sync` fails (exit 1): OpenCode plugin `opencode-review-transport.ts` at `~/.config/opencode/plugins/` has unverified ownership (custom bytes, differs from `.bak-plugin-v1`); sync preserves custom bytes by design, no `--force`. Environment/install state, not a product defect.
- User decision (2026-09-20): **skip native review for now** — deferred; can run later on the PR slice after the plugin asset state is resolved.
- Commits: `3ead458` (backend, 605 lines) `a04f33b` (frontend + flatten fields, 462 lines). Branch `feat/hito4-org-repertoire` from main; no push/PR yet (ordinary repo policy).

## Notes
- Offline cross-org scenarios (13-14) are future work tied to the outbox; this slice delivers the online RLs/RPC contract they will validate against.
- Multi-role dashboard (scenario 9) is client-side composition of org_memberships self-select rows; Organizations page covers it.
- Disbanded org: status enum + `organizations_select_any_auth` already keep archived records readable; transfer-of-repertoire is a system_admin operation for a later slice.