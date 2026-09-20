# Hito 4 — Remaining Features

## Objective
Complete the 6 remaining Hito 4 (Basic Community) features to unlock Hito 5 (Integrations).

## Scope
6 BDD features, ~90 scenarios total. All features have existing specs in `features/`.

## Delivery Strategy
auto-chain — each feature = one PR slice, stacked to main.

---

## Feature 1: Music Theory
**Status:** ✅ COMPLETE (PR pending)
**BDD:** `features/music-theory.feature` (240 lines, ~18 scenarios)
**Actual lines:** 688 (7 files)

### Completed
- [x] T1: Scale catalog seed — 27 scales (Major, Natural/Harmonic/Melodic Minor, Greek modes, pentatonic, chromatic)
- [x] T2: Key context model — parseKeyContext() parses "E Phrygian dominant" → {tonic, scaleName}
- [x] T3: Degree view — resolveDegree() computes roman numerals, ChordProRenderer renders them
- [x] T4: Enharmonic spelling — leverage existing FLAT_KEYS in transpose.js
- [x] T5: Sectional key context — parser.js supports {key: E} within sections
- [x] T6: Progression catalog — 18 common progressions searchable by name/pattern/family
- [x] T7: Vocal range key suggestion — deferred (needs melody data, not MVP)

### Verification
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds
- [x] Degree view toggles without corrupting stored ChordPro

---

## Feature 2: Community Moderation
**Status:** not started
**BDD:** `features/community-moderation.feature` (166 lines, ~14 scenarios)
**Estimated lines:** ~300-400

### Tasks
- [ ] T1: Moderation data layer — `moderation_reports` + `moderation_decisions` tables, RLS, RPCs
- [ ] T2: Report intake — report dialog on public library entries, reason categories, duplicate prevention
- [ ] T3: Moderation queue UI — grouped reports by entry, reason counts, moderator view
- [ ] T4: Decision flow — keep/remove/escalate actions, notification to reporter + contributor
- [ ] T5: Takedown propagation — unlink linked copies, preserve standalone copies
- [ ] T6: Appeal flow — file appeal, different moderator review, reinstate/uphold

### Verification
- [ ] `pnpm lint` passes
- [ ] RLS policies enforce moderator-only access
- [ ] Takedown correctly unlinks copies without touching standalone imports

---

## Feature 3: Organizational Repertoire Model
**Status:** not started
**BDD:** `features/organizational-repertoire-model.feature` (172 lines, ~16 scenarios)
**Estimated lines:** ~500-600

### Tasks
- [ ] T1: Org hierarchy data model — organizations, branches, system_repertoire tables + RLS
- [ ] T2: Song ownership at system vs org level — ownership scoping, promote/demote flows
- [ ] T3: User roles across levels — multi-role dashboard, branch-scoped permissions
- [ ] T4: Cross-branch event collaboration — event-scoped setlist library, source attribution
- [ ] T5: Offline cross-org scenarios — branch offline during event, org member offline mid-event
- [ ] T6: Access control after org change — member leaves, org disbanded, system admin removes song

### Verification
- [ ] `pnpm lint` passes
- [ ] RLS enforces branch-scoped visibility
- [ ] Promote/demote preserves cached copies for other orgs

---

## Feature 4: Minors & Guardian Consent
**Status:** not started
**BDD:** `features/minors-and-guardian-consent.feature` (69 lines, ~7 scenarios)
**Estimated lines:** ~200-250

### Tasks
- [ ] T1: Minor account model — age gate at signup, guardian consent record, inactive state
- [ ] T2: Consent lifecycle — guardian review, revoke, turning-18 auto-upgrade
- [ ] T3: Visibility boundaries — block public contributions without guardian approval, hide minors from public surfaces

### Verification
- [ ] `pnpm lint` passes
- [ ] Inactive minor account cannot access features
- [ ] Revoking consent immediately restricts activity

---

## Feature 5: Service Planning
**Status:** not started
**BDD:** `features/service-planning.feature` (132 lines, ~14 scenarios)
**Estimated lines:** ~400-500

### Tasks
- [ ] T1: Service + block data model — services, blocks, block_setlists, block_assignments tables + RLS
- [ ] T2: Service builder UI — create service, add/reorder blocks, assign setlists to blocks
- [ ] T3: Musician assignment — assign members to blocks, overlap detection, uncovered block warnings
- [ ] T4: Call sheet — per-member view with assigned songs, agreed keys, block times
- [ ] T5: Day-of coordination — member check-in, last-minute swap notifications, plan read-only for members
- [ ] T6: Service completion — read-only historical mode after service concludes

### Verification
- [ ] `pnpm lint` passes
- [ ] Block reordering preserves independent setlists
- [ ] Overlapping assignment conflict is detected and rejected

---

## Feature 6: Rehearsal Workflow
**Status:** not started
**BDD:** `features/rehearsal-workflow.feature` (122 lines, ~13 scenarios)
**Estimated lines:** ~350-400

### Tasks
- [ ] T1: Rehearsal data model — rehearsals, rehearsal_agendas, rehearsal_outcomes tables + RLS
- [ ] T2: Agenda builder — create from setlist, chart readiness flags, member assignment display
- [ ] T3: Duration & timebox — estimate from song lengths, overrun warning, trim/extend options
- [ ] T4: Running the rehearsal — mark outcomes per song, notes attach to song history
- [ ] T5: Absence & coverage — flagged uncovered parts, link to substitution flow
- [ ] T6: Offline & sync — rehearsal notes survive offline, sync on reconnect

### Verification
- [ ] `pnpm lint` passes
- [ ] Agenda correctly flags draft charts
- [ ] Offline notes sync correctly on reconnect

---

## Progress
| Feature | Status | PR | Commit |
|---------|--------|----|--------|
| Music Theory | not started | — | — |
| Community Moderation | not started | — | — |
| Org Repertoire Model | not started | — | — |
| Minors & Consent | not started | — | — |
| Service Planning | not started | — | — |
| Rehearsal Workflow | not started | — | — |
