# Proposal: Readiness lifecycle and per-version tracking

> Change: `fix-readiness-lifecycle`
> Findings: **F** and **G** of the 10 discrepancies (`odd/tasks/cemurm-brand-landing.md` §14.2).
> Status: proposed. Both reproduced. **One open product decision**, stated below.

## Intent

`src/lib/readiness.js` computes a two-valued answer. The feature file describes a four-state
lifecycle and a per-version unit of tracking. Neither is a bug in isolation; together they mean
the readiness surface cannot express what the product promises.

## Problem

**F — the lifecycle is two states, not four.** `computeReadiness` returns only `'ready'` or
`'draft'`. `features/song-lifecycle.feature` describes a lifecycle including `retired` and
`deleted`. There is no code path that can produce either, so a retired chart still reports
`draft`, and a deleted one may still report `ready`.

**G — readiness is per-song, not per-version.** `computeReadiness(song)` takes a single flat
`{ key, body }` with no version parameter. The module's own comment says so: *"readiness is
computed from the single current chart (body + key). Versioned readiness is Hito 3 — no version
table here."* But `features/song-lifecycle.feature:34` states *"Readiness is tracked per version,
not per song"*, and the schema records `is_ready` per version (`song_versions`).

The two interact. With a per-song function over a flat chart, a song with three versions has
exactly one readiness value, and which version it describes is undefined.

## Scope

### In scope

- The **state vocabulary**: decide which of `ready`, `draft`, `retired`, `deleted` the product
  actually needs, and whether `retired`/`deleted` are lifecycle states or absence.
- The **unit**: per-song or per-version, and if per-version, what the caller passes.
- The signature change and every call site.
- Delta spec for the `song-lifecycle` capability.

### Out of scope

- Findings A, B, C, D, E, H, I, J.
- Any migration. `song_versions.is_ready` already exists; this change is about computing and
  exposing it, not about storing it.
- Song deletion as a feature. Whether a hard delete exists is a separate question.
- The practice view and the setlist reader, which consume `computeReadiness` and must be updated
  as call sites but are not themselves in scope.

## Capabilities

### New capabilities

None.

### Modified capabilities

- `song-lifecycle` (new capability spec — the repository has no `openspec/specs/song-lifecycle/`
  today, so this change creates it)

## Approach

The decision is genuinely a product one and the proposal does not make it.

**Question 1 — is `retired` a state or an absence?**

- *A state*: readiness becomes a four-value enum; a retired chart reports `retired` and the UI
  can say so. Requires a `retired` marker somewhere — most naturally a `retired_at` on
  `song_versions`, which does not exist today and would mean a migration.
- *An absence*: retiring means the version is no longer current, so readiness over the *current*
  version is undefined and the UI shows nothing. No schema change, and it composes naturally
  with the per-version model.

**Question 2 — per version, or per song?**

- *Per version* is what the feature file says, and it is the only model that makes
  `song_versions.is_ready` mean anything. Cost: every call site passes a version, and the
  "current version" concept has to be defined for a song that has several.
- *Per song* is what the code does. Keeping it means amending
  `features/song-lifecycle.feature:34`, which is a product decision, not a code one.

These interact: per-version makes question 1's "absence" answer nearly free, because a retired
version is simply not the current one. Per-song makes it impossible, because the song still has
one readiness value.

**Recommendation:** per-version, and `retired` as an absence rather than a fourth state. That
needs no migration, it makes the existing `is_ready` column meaningful, and it is the reading the
feature file already commits to. But it changes every call site, so it is worth being explicit
that this is a real cost rather than a free correctness win.

## Affected areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/readiness.js` | Modified | the state vocabulary and the signature |
| `src/domain/chart/readiness.test.js` | Modified | the characterization suite pins `'ready' \\| 'draft'`; a real fix inverts it |
| every `computeReadiness` call site | Modified | identified at apply time, not here |
| `song_versions.is_ready` | Read | already exists; no migration if `retired` is an absence |
| `openspec/specs/song-lifecycle/spec.md` | New | capability spec |

## Verification

- `pnpm test` — `readiness.test.js` is the gate. It currently asserts the two-state vocabulary,
  so the diff in that file is the evidence the behaviour changed.
- `pnpm typecheck && pnpm lint && pnpm build`.
- Manual: a song with several versions where one is ready and another is not; the reader must
  show the current version's state, not a blend.

## Rollback

One module, its test, and its call sites. No migration under the recommended option, so rollback
is a revert. Under the `retired`-as-state option it would not be, which is the main argument
against that option.

## Frozen decisions

1. **One change, two findings.** F and G are the same defect seen from two sides: the vocabulary
   is too small *and* the unit is wrong. Fixing the vocabulary alone leaves the per-song model
   unable to express a song with mixed versions.
2. **No migration unless `retired` becomes a stored state.** If it is chosen as an absence, this
   change is revert-only. If a `retired_at` column is added, that is a separate migration and
   this proposal must be amended before it starts.
3. **The bug-pinning test is inverted, not deleted.** `readiness.test.js` asserts the two-state
   behaviour on purpose, with a comment saying so. Editing it to accept anything is the failure
   mode the delivery agreement forbids.
4. **The feature file is not amended to match the code.** If per-song readiness is the product
   decision, `features/song-lifecycle.feature:34` changes as a product act, with the reason
   recorded — not silently dropped inside a code change.
