# Master Plan — CEMURM

> Authoritative sequencing for everything not yet on `main`. Written 2026-09-27 against
> verified git state at `main` = `8b66394`. Supersedes the Hito 5 / Hito 6 status claims in
> `docs/mvp-scope.md`, which are stale (see §0).
>
> Convention: ~400 changed lines per PR, chained `-prN-` slices. Larger work ships split, or
> with a written `size:exception` (precedent: `odd/tasks/hito5-substitutions-and-coverage.md:4`).

## 0. State of play — verified, not read from prose

Prose in this repo has drifted. These are the facts, checked against git and code:

| Fact | Value |
|---|---|
| `main` | `8b66394`, in sync with `origin/main` |
| **Test files on `main`** | **0** |
| **`test` script on `main`** | **absent** — `package.json` has `dev`, `build`, `preview`, `lint`, `typecheck` only |
| **CI on `main`** | `install --frozen-lockfile → lint → build`. **No test step.** |
| `src/` layout on `main` | `App.jsx`, `main.jsx`, `components/`, `hooks/`, `lib/`, `pages/`, `utils/` (pre-relocation) |
| Feature files | **42**, 656 scenarios |
| Migrations on `main` | 25 files, `0001`–`0019`, then a deliberate gap, then `0023`–`0028` |
| Hito 5 merged | 6 migrations + PRs #147, #148, #155, #156, #159, #165, #166 |

**`docs/mvp-scope.md` is wrong on Hito 5.** Line 217 states "Nothing from Hito 5 is merged to
main yet" and "Migrations 0021+ exist only on those branches". Six Hito 5 migrations and seven
PRs are on `main`. Lines 301 and 309-310 repeat it. Fix those when this plan lands.

## 1. 🔴 The blocker: `main` has no regression net

**There is no test runner and no test file on `main`.** CI runs lint and build, so a behaviour
regression passes green and merges.

This inverts the priority of everything else. Until a net exists:

- the 12 unmerged Hito 5 commits ship blind;
- the ten spec findings can be "fixed" with no way to prove the fix changed only what it should;
- the refactor work on `feat/cemurm-brand-landing-pr1b-boundary-refactors` has no proof of
  faithfulness on `main` at all.

**Consequence:** PR 1a must land before PR 1b-0 — the characterization tests import from
`src/domain/**` and `src/integrations/**`, paths that only exist after the relocation. There
is no way to take the tests without the moves.

### P0 — the net (2 PRs, from the existing branch)

| Slice | Content | Diff | Risk |
|---|---|---|---|
| **M0a** | PR 1a: relocate 111 modules into the ADR 0002 boundaries. Import paths only. | 111 files, renames | **None** — bundle verified byte-identical |
| **M0b** | PR 1b-0: Vitest 3.2.7 + 293 characterization tests + `test` script + CI test step | +2086, 7 test files | **None** — no production code |

Both are already built on `feat/cemurm-brand-landing-pr1b-boundary-refactors` (pushed, PR #168
open). They are **not yet split into separate PRs** — PR #168 currently carries 9 commits,
132 files and +5367, which is exactly the atomicity failure this plan exists to fix.

**Action:** re-cut as two PRs. M0a = `ae14521`. M0b = `e267b97` + `e9d41c3`. Neither touches
production behaviour.

> Vitest is pinned to **3.2.7** deliberately: Vitest 5 declares `vite ^6.4||^7||^8` as a peer
> and fails hard against Vite 5.4.21. Do not "upgrade Vitest" without moving Vite first.

## 2. P1 — finish Hito 5 (12 commits, 4 branches, ~3266 lines)

All four branches exist, are pushed, and are unmerged. Verified after `git fetch --prune`:

| Branch | Commits | Diff | Migration |
|---|---|---|---|
| `feat/hito5-in-app-feedback` | 4 | 7 files, +447 | **`0020`** |
| `feat/hito5-external-display` | 2 | 6 files, +570 | — |
| `feat/hito5-plan-freeze` | 3 | 5 files, +844 | **`0021`** |
| `feat/hito5-congregation-projection` | 3 | 9 files, +1405 | **`0022`** |

### 🔴 Blocker: migration numbers collide

The four branches claim **0020, 0021 and 0022** — exactly the numbers `main` left as a
deliberate gap, and numerically *below* `main`'s `0023`–`0028`. A merge as-is re-introduces
the gap and collides with migration `0020` already applied locally from
`fix/hito4-review-batch1`.

`0020` is claimed by **two different files**: `0020_review_batch1.sql` on
`fix/hito4-review-batch1` and the feedback table on `feat/hito5-in-app-feedback`
(commit `f44731c`). Whichever merges second has to reconcile, not just renumber.

**Resolution:** renumber to `0029`, `0030`, `0031`, `0032` before any of these branches merges,
and rewrite the ODD records' migration references. Do it as the **first commit on each branch**,
or every later slice re-conflicts. The 0020–0022 gap stays a gap.

### 🔴 Second collision: `0019:184` is patched on two branches

`0019_rehearsal_workflow.sql:184` creates `private.display_name_for`, and a fresh migration
chain **aborts there** — which is why the review-batch branch had to fix it in place rather
than in a new migration. Two branches now carry that same fix independently:

- `fix/hito4-review-batch1` → `54ce559` "make 0019 display_name_for creation idempotent"
- `feat/hito5-in-app-feedback` → `1ee9615` "make display_name_for replaceable across
  service+rehearsal slices"

**Resolution:** pick one patch, land it first as its own commit, and drop the duplicate from
the other branch. A fresh `db reset` that aborts at 0019 is the failure this prevents — and
nobody will notice it until a full reset, which is exactly the workflow
`docs/local-dev.md` tells every new contributor to run.

### Slicing

| Slice | Branch | Content | ~Lines |
|---|---|---|---|
| M1a | in-app-feedback | feedback data layer + offline replay (no table) | ~200 |
| M1b | in-app-feedback | renumbered migration + form modal + header entry | ~250 |
| M1c | external-display | display channel, shared clean view, popup page + route | ~300 |
| M1d | external-display | stage-mode menu, preview, reconnect + restart recovery | ~270 |
| M2a | plan-freeze | freeze RPC wrappers (no table) | ~250 |
| M2b | plan-freeze | renumbered migration + freeze into versions | ~300 |
| M2c | plan-freeze | publish UI, changed flags, snapshot member view, version history | ~300 |
| M3a | projection | operator console + congregation display + slide deck | ~450 ⚠ |
| M3b | projection | start projection from service detail | ~150 |
| M3c | projection | renumbered migration + license gate, typo-fix, block audit | ~800 ⚠ split again |

⚠ M3a and M3c exceed the convention. M3c's migration plus audit logic should be two commits.
Options: split further, or record a written `size:exception` as the repo has done before.

### ⚠️ The dependency claim in `docs/mvp-scope.md` does not hold

The doc says `congregation-projection` "rides on the external-display surface". Not verified,
and the evidence points the other way: `features/external-display.feature:44` contains a
scenario titled *"External display vs congregation projection are separate targets"*, and the
external-display surface is absent from the tree (no `Display.jsx` / `Projector.jsx` under
`src/pages/`). The only cross-reference in code is a prose comment in `OverlayView.jsx:8`.

**Treat the four branches as independent until proven otherwise**, and confirm by reading the
projection branch's imports before sequencing M3 after M1c/M1d. If they really are separate
targets, the doc is wrong and should say so.

### Also unmerged, and not in this plan

`fix/hito4-review-batch1` — 9 commits including a **songs-metadata RLS leak fix**
(`main:0016_org_repertoire_model.sql:125` uses `org_id is null` unguarded, so every
authenticated user can read every other user's personal repertoire metadata). It needs its
own decision, separate from this plan. See §5.

## 3. P2 — the ten spec findings

Five reproduced (A–E), six reported and pending triage (F–J). All ten still hold on `main`;
verified per file:line. Full detail in `odd/tasks/cemurm-brand-landing.md` §14.

`odd/tasks/music-theory-discrepancies.md` is the working record. One change proposal exists
(`openspec/changes/fix-parser-sectional-key/`, finding A); B through J have none.

Each finding is one behaviour change against one Gherkin scenario — already atomic, and each
needs its own PR. Three of them hide a **product decision** that no amount of reading resolves:

- **B** — when does a flat win? Key's own spelling, circle-of-fifths canonical, or
  caller-supplied preference. Changes what `transposeKey` means at every call site.
- **D** — what is the tie-break rule, and where is it stored? The Gherkin requires the applied
  rule be persisted "so every device reaches the same result", so this implies a **schema
  change** *and* an undefined rule. This is the determinism claim the product is sold on.
- **E** — what is the correct degree-quality algorithm? The code reads consecutive scale steps
  as a triad's root/third/fifth; stacking real thirds is a different computation.

The other seven (A, C, F, G, H, I, J) are mechanical against a written scenario and can be
scheduled immediately once the net exists.

> The suite **pins the buggy behaviour deliberately** — `parser.test.js:86` reads
> `it('sectionKeyContexts is ALWAYS empty, even for a chart that modulates')` with
> `// FINDING (behaviour, do not "fix")`, and `transpose.test.js:44` asserts flat keys are
> unreachable. Fixing a finding therefore *inverts* that assertion. That is the deliverable.
> Editing an assertion to make a gate pass without changing behaviour is forbidden
> (AGENTS.md, delivery workflow clause 3).

## 4. P3 — Hito 6: 99 scenarios, 0 shipped

`docs/mvp-scope.md` marks Hito 6 "not started". Verified: no implementation exists for any of
its six features.

| Feature | Scenarios | Note |
|---|---|---|
| `analytics-and-insights` | 23 | none |
| `export-and-sharing` | 23 | ~1 of 23 — OnSong/ChordPro only; no PDF, MusicXML, ABC, QR or share channels |
| `cross-organization-event-collaboration` | 16 | largest design lift: depends on org model + service planning + shared-setlist collab + repertoire ownership |
| `user-onboarding` | 16 | none |
| `account-data-export-and-erasure` | 11 | none |
| `offboarding-cascade` | 10 | none |

Plus the non-BDD deliverables in `mvp-scope.md:254-261`: Lighthouse > 90, WCAG 2.1 AA, UI
polish, bug-fix sprint, beta docs, error boundaries, analytics.

Sequence by dependency, not by scenario count: `offboarding-cascade` and
`account-data-export-and-erasure` are privacy obligations and are the natural first slice
regardless of size. `export-and-sharing` extends work Hito 5 already landed. `cross-org` goes
last — it depends on four other surfaces being stable.

## 5. Doc rot to repair (cheap, do it alongside)

| File | Defect |
|---|---|
| `docs/mvp-scope.md:217,301,309-310` | claims nothing from Hito 5 is merged; six migrations and seven PRs are on `main` |
| `docs/mvp-scope.md:82,84` | the execution-trio / projection-rides-on-display dependency is unverified and probably wrong |
| `AGENTS.md` methodology table | says 45 `.feature` files; there are **42** |
| `AGENTS.md` test paragraph | says the `node` environment comes "via the existing `vite.config.js`"; `vite.config.js` has no `test` block, so `node` is Vitest's default, not configured |
| `openspec/config.yaml` | declares "NO test framework, NO typecheck, NO CI"; `test_command`/`test_framework` empty; `rules.design` points at the pre-relocation layout |
| `CONTRIBUTING.md` | says `npm install`, `npm run lint`, and a `src/store/` Zustand layer that does not exist |
| `odd/tasks/hito4-remaining.md` | 42 unchecked boxes; its own per-feature headers say COMPLETE. Superseded umbrella — **not** backlog |
| `docs/local-dev.md:29` | "two confirmed users"; the seed creates three |
| `odd/tasks/cemurm-brand-landing.md` §14.2 | reuses the letter **E** for a different finding than §14.1's E. Fix the lettering before anyone triages by letter |
| `feat/hito5-*` branches | **no ODD record exists** for plan-freeze, external-display, in-app-feedback or congregation-projection. Create one per slice as it merges |

## 6. Order, and why

```
M0a  relocation (renames, bundle identical)      ← unblocks everything
M0b  characterization suite + CI test step        ← the net; gates all of §2–§4
M1   renumber migrations 0020/0021/0022 → 0029+  ← blocker, do before any Hito 5 merge
M2   finish Hito 5, 10 slices                    ← already built, cheapest real product value
M3   findings A–J, 10 PRs                        ← now provable against the suite
M4   Hito 6, sliced by feature                   ← 99 scenarios from zero, the long pole
M5   doc repairs, alongside each slice above
```

Two things deliberately do **not** go in this plan:

- **The landing / brand cycle** (`feat/cemurm-brand-landing-pr1b-boundary-refactors`, PR #168).
  It is marketing surface, and it is currently one 9-commit PR. The refactor slices inside it
  (M0a, M0b, plus PR 1b) are worth keeping and land as their own PRs; the brand and landing
  work is deferred and should be re-planned against this state.
- **`fix/hito4-review-batch1`.** Nine unmerged commits, several of them security fixes, one of
  them a real metadata leak. That is its own decision with its own urgency, and merging it is
  not a formality.
