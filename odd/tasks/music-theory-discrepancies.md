# music-theory-discrepancies — fix the confirmed spec/code gaps

> Feature: the 10 specification discrepancies found by the characterization suite
> (`odd/tasks/cemurm-brand-landing.md` §14). Vehicle per §14.4: "a change proposal per
> finding is the right next vehicle — not a bugfix smuggled into a refactor."
> Authorized: 2026-09-27 by user ("arranca con los cambios"). Branch: to be cut from
> `feat/cemurm-brand-landing-pr1b-boundary-refactors` after PR #168 merges.

## Objective

Turn the four reproduced findings (A–E) and the six pending ones (F–J) into explicit
OpenSpec change proposals, resolve the design decisions each one hides, and only then
change code — so no fix is smuggled into a refactor and no test is weakened to make a
gate pass.

## Problem / Why

The characterization suite added in PR 1b-0 (`e267b97`) was written against the code as
it is, not as the Gherkin says it is. Where they disagree, the tests recorded the code.
Ten discrepancies were reported; four were independently reproduced and confirmed.

Three of the four confirmed findings share one failure mode: **code that looks
implemented and is not.** A branch exists, a comment documents the intended behaviour,
the schema supports it, a feature file specifies it, and an outreach proposal sells it.
The implementation is absent or wrong.

Consequence beyond the bugs: `docs/propuestas/cemurm-propuesta-para-orquesta-nacional.md`
lines 73, 74 and 75 — every music-theory claim in that document — are now known false.
The music-theory layer is what separates CEMURM from a setlist app, so the layer that
differentiates the product is also the least trustworthy part of it.

## The confirmed findings

| # | Finding | Gherkin it violates | Status |
|---|---|---|---|
| A | `src/domain/chart/parser.js:9` puts `'key'` in `KNOWN_META`, so the check at `:69` matches every `{key: …}` and `continue`s. The `directive.name === 'key'` branch at `:73` is unreachable; `sectionKeyContexts` is always `[]`. The module's own self-check fails and was never run. | `music-theory.feature:106`, `:138` | Reproduced |
| B | Enharmonic spelling is dead for every flat. `transposeKey('C', -2)` → `'A#'` instead of `'Bb'`. Arithmetic is correct; the table is sharp-only. | `music-theory.feature:149` | Reproduced |
| C | The OnSong export cannot reach `agreed_key`; `flattenSetlist()` never copies it. Data exists one layer below (`supabase/seed.sql:104`). | `external-integrations.feature` | Reproduced |
| D | No tie-break in offline conflict resolution. `features/offline-edit-conflict-policy.feature:47-51` requires the applied rule stored with the resolution. Code is strict `>`; nothing is stored. | `offline-edit-conflict-policy.feature:47-51` | Reproduced |
| E | `qualityForDegree` returns `'power'` for 28 of 28 degrees (C major, A natural minor, E Phrygian, E harmonic minor). Four quality branches are dead code; `resolveDegree` renders `II` where the spec requires `ii°`. | `music-theory.feature:72` | Reproduced |

Pending triage (reported by the suite, not yet reproduced): F OnSong duplicates every
directive; G `computeReadiness` only ever returns `ready`/`draft`; H readiness is not
per-version and there is no scenario for setlist add/remove reconcile; I `spotifyKeyToLabel`
is sharp-only; J the mode check is an exact string.

Sharp edges locked in by the suite, unspecified anywhere: a fractional semitone count
yields the literal chord `"undefined"`; lowercase chord tokens pass through untransposed;
`transposeKey('B♭', 2) === 'C#♭'`; `buildSubstitutionMap` creates a key for an `undefined`
value, defeating `applySubstitution`'s own `Object.keys().length` guard; a flat-spelled
anchor can never match under a sharp key; `reconcileSetlistOp(null, …)` throws;
`computeReadiness` throws on a truthy non-string key.

## Open design decisions — these block implementation, not the proposal

Each is a product decision, not an implementation detail. Do not guess them.

1. **B — when does a flat win?** Enharmonic spelling needs a rule, not a table swap.
   Options: prefer the key's own spelling (a `Db` major chart stays `Db` major throughout);
   or circle-of-fifths canonical form; or explicit per-key preference passed by the caller.
   This changes what `transposeKey` means for every call site.
2. **D — what is the tie-break rule, and where is it stored?** The Gherkin requires the
   applied rule be stored with the resolution "so every device reaches the same result".
   That implies a schema change (a column or a payload field) and a defined rule
   (server-wins? first-writer-wins? client-authoritative?). Both halves are unspecified.
3. **E — what is the correct degree-quality algorithm?** `qualityForDegree` reads
   consecutive scale steps as if they were a triad's root/third/fifth. Stacking real
   thirds over a scale degree is a different computation. Needs the intended semantics
   confirmed, plus a decision on whether a wrong-quality result is signalled or
   best-effort rendered.

## Scope

- OpenSpec change proposal per finding, each with a delta spec against the Gherkin it
  violates.
- The three design decisions above, resolved with the maintainer, recorded in the
  proposals as Frozen Decisions.
- Implementation only after each proposal's decisions are settled — one PR per finding.
- Repair `openspec/config.yaml`, which is stale: it declares "NO test framework, NO
  typecheck, NO CI" and points at the pre-relocation `src/` layout
  (`components/, pages/, hooks/, lib/, store/, utils/`).

### Out of scope

- The outreach proposal's copy. Findings feed it; rewriting it is a separate task.
- The 4 unmerged branches of Hito 5 and `fix/hito4-review-batch1` (9 commits, including
  the songs-metadata RLS leak on `0016:125`). Untouched here.
- Any weakening of an existing characterization assertion to make a gate pass.

## Constraints

- **A failing characterization test is fixed in the source, never in the assertion**
  (AGENTS.md, delivery workflow clause 3). Tests that pin buggy behaviour on purpose are
  marked `FINDING (behaviour, do not "fix")` — those are the ones a real fix must update,
  and the update is the deliverable, not a shortcut.
- YAGNI entry rule (`docs/engineering-review-backlog.md:5`) is active: implement an item
  only when its hito or BDD feature requires it.
- Conventional Commits; work-unit commits; chained `-prN-` slices at ~400 changed lines.

## Tasks

- [x] T1 — Map the branch state and verify the refactor gates. `pnpm lint` 0,
      `pnpm test` 293/9 files, `pnpm typecheck` 0, `pnpm build` OK.
- [x] T2 — Land PR 1b (six ADR 0002 refactors) with the acceptance-gate deviation
      documented. PR #168.
- [x] T3 — Write this record and its Engram mirror.
- [x] T4 — Proposal for finding A (parser sectional key).
      `openspec/changes/fix-parser-sectional-key/`
- [x] T5 — Proposal for finding C (OnSong `agreed_key`).
      `openspec/changes/fix-onsong-agreed-key/`
- [x] T6 — Proposal for findings F + G (readiness lifecycle and per-version
      tracking), paired because they are one defect seen from two sides.
      `openspec/changes/fix-readiness-lifecycle/`
- [x] T7 — Proposal for finding H (reconcile silent drop).
      `openspec/changes/fix-reconcile-silent-drop/`
- [x] T8 — Proposal for findings I + J (Spotify key parsing), paired because same
      module and same root cause class.
      `openspec/changes/fix-spotify-key-parsing/`
- [ ] T9 — Proposals for findings **B**, **D** and **E**. All three are blocked on the
      product decisions recorded above. None may be written before those are answered: a
      delta spec that assumes the answer is worse than no spec.
- [ ] T10 — Repair `openspec/config.yaml`. Deferred until the M0 chain merges, since it
      must describe the post-M0a tree and the test runner that M0b adds.

## Sequencing constraint

**No finding may be implemented until M0b (#171) merges.** The 293-test characterization
suite is the only regression net this repository has, and every finding here is a behaviour
change against code the suite currently pins. Fixing a finding rewrites the assertion that
pins the bug — legitimate, because the behaviour is intentionally changing, but it also means
nothing can catch an *unintended* change until the suite is on `main`.

## Verified file locations

The proposals cite these. An earlier version of the A proposal cited `src/lib/parser.js`,
which does not exist — the parser sits one level deeper, under `chordpro/`.

| Finding | File on `main` | After M0a |
|---|---|---|
| A | `src/lib/chordpro/parser.js` | `src/domain/chart/parser.js` |
| B, E | `src/lib/transpose.js`, `src/lib/degreeResolver.js` | `src/domain/music/*` |
| C | `src/lib/exporters/onsong.js` | `src/domain/setlist/exporters/onsong.js` |
| D, H | `src/lib/setlistCollab.js` | `src/domain/setlist/collab.js` |
| F, G | `src/lib/readiness.js` | `src/domain/chart/readiness.js` |
| I, J | `src/lib/spotify.js` | `src/integrations/spotify.js` |

## Acceptance criteria

- [ ] Each of A–E has an OpenSpec change with a delta spec whose scenarios are traceable
      to the Gherkin scenario it violates.
- [ ] Each proposal records its design decisions as Frozen Decisions, not as assumptions.
- [ ] The outreach proposal is not edited in this change; findings are handed to it.
- [ ] No characterization assertion is weakened to clear a gate.
- [ ] Every fix ships as its own PR with the Gherkin scenario it closes cited.

## Checks

- TDD: not applicable in the classic sense — these are behaviour changes against existing
  code, so the test is written from the Gherkin scenario, not from the implementation.
- Functional: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` (typecheck is not in
  CI — run it locally).
- For A, B and E specifically: the `FINDING (behaviour, do not "fix")` tests
  (`src/domain/chart/parser.test.js:86`, `src/domain/music/transpose.test.js:44`) must be
  **inverted** — the assertion changes from pinning the bug to asserting the spec.

## Progress / Verification evidence

- Engram mirror: topic `odd/music-theory-discrepancies/tasks`, project `cemurm`.
- T2 evidence: PR #168, 9 commits, gates green, gate deviation documented in the PR body.
- The four reproductions are recorded verbatim in `odd/tasks/cemurm-brand-landing.md` §14.1.

## Next step

Resolve the three design decisions, then write T4 (finding A), which is the only one of the
four with no open decision blocking it.
