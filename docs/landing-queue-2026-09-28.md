
> ## SUPERSEDED 2026-09-28 — this ordering is not the plan any more
>
> The maintainer chose to land this as **three PRs by track**, not 25 PRs by finding. The
> per-PR order below is kept only as the record of *why* the tracks are shaped the way they
> are: which PRs shared a file, which would have needed a rebase, and which were a hub.
>
> **Do not follow the queue below.** It is a dated snapshot of an approach that was measured
> and then replaced. The three tracks are: fixtures and docs; the ten music-theory findings;
> and the Hito 5 feature chains.
>
> Two things here survive the change and are still true: `src/app/router.jsx` is touched by
> seven PRs across the tracks, and #223 is the other hub. That is why #225 and the display
> chain have to be resolved together rather than in separate merges.

# Landing queue — 2026-09-28

> **This is a dated snapshot, not a living plan.** It describes the 23 open PRs as they stood on
> 2026-09-28 against `main` @ `bfaf6e8`. Once the queue drains, delete it.
>
> **Nobody merges from this document.** The maintainer approves and merges. What is listed here is
> the order, and which PRs will need a rebase and therefore a fresh approval — the ruleset has
> `require_last_push_approval: true`, so a rebase invalidates any prior approval.

## Why this order and not the PR number order

Three facts, each computed rather than assumed:

1. **Every branch is based on `main`, so the chains cost nothing.** A child PR is already based on
   its parent, so `git diff main..child` shows the parent's files too. Those "overlaps" are not
   conflicts. The rebase cost is only at the *roots*.
2. **`src/app/router.jsx` is a hub.** Seven PRs add routes to it: #188, #189, #194, #195, #196, #197,
   #225. Every one after the first will need a rebase. Grouping them consecutively means paying that
   cost once, in one block, instead of seven times across the whole queue.
3. **#223 is the other hub.** It collides with four PRs, each in a *different* file, with real line
   overlap — not textual adjacency. Landing it last means four PRs merge untouched and only #223
   rebases.

## The queue

### Phase 1 — no conflicts, no router. Nothing rebases.

| # | PR | Finding / what |
|---|---|---|
| 1 | **#226** | fixtures. Fixes nothing; makes phases 2–4 demonstrable in the app |
| 2 | **#187** | correct the migration paragraph the merges made wrong |
| 3 | **#198** | jsdoc types for the gigs module |
| 4 | **#221** | Spotify: the mode check was an exact match |
| 5 | **#220** | OnSong: carry the agreed key to the export |
| 6 | **#218** | parser sectional key **+** `qualityForDegree` (findings A **and** E) |
| 7 | **#222** | readiness is per-version |

### Phase 2 — the `router.jsx` block. Rebases concentrate here.

| # | PR | Chain |
|---|---|---|
| 8 | **#186** | projection relocation (+4/−4) |
| 9 | **#188** | projection pages and routes |
| 10 | **#189** | start-projection entry point |
| 11 | **#194** | minors: guardian capability link |
| 12 | **#195** | moderation: queue, case detail, own-cases |
| 13 | **#196** | login-less external display channel |
| 14 | **#197** | external display into Stage Mode |
| 15 | **#225** | overlay capability is a token, not the primary key |

**#225 lands last in this block on purpose** — it is the sixth PR to touch `router.jsx`, so it takes
the rebase. Its other file, `StageMode.jsx`, is also touched by #197, but the two changes are in
different features: #197 integrates the *external display*, #225 changes the *OBS overlay*. Verified
by diff, not assumed.

### Phase 3 — migrations and their chains

| # | PR | Chain |
|---|---|---|
| 16 | **#190** | feedback data layer — **BLOCKED, see below** |
| 17 | **#191** | feedback form modal and header entry |
| 18 | **#192** | freeze published plans into versions (592 lines) |
| 19 | **#193** | plan-freeze publish UI |

### Phase 4 — the multi-rebase tail

| # | PR | Rebases onto |
|---|---|---|
| 20 | **#216** | #190/#191 — `src/offline/drainer.js` |
| 21 | **#219** | — (first of the transpose pair) |
| 22 | **#224** | #219 — `transpose.js` and its test, the largest overlap in the queue |
| 23 | **#223** | #216, #222, #219, #224 — **the one to watch** |

**#223 deserves a human eye on the diff, not just the gates.** It touches `collab.js`,
`readiness.js` and `transpose.js` — precisely the three files the other PRs also move. A bad merge
there is a change of *context*, not of code, and no gate detects that. Land it with the diff open.

## BLOCKER — #190 cannot land as-is

`#190` carries `supabase/migrations/0029_feedback.sql`. **`0029` is also claimed by the guardian
branch family** — `origin/fix/fail-closed-minors`, `origin/feat/guardian-consent-db` and
`origin/feat/guardian-email` all carry a *contiguous run*:

```
0029_fail_closed_minors.sql
0030_date_of_birth_step.sql
0031_guardian_consent_email.sql
```

`supabase db reset` executes migrations in **filename order**, so two files sharing a version prefix
have an arbitrary relative order, and the migration ledger is keyed on that version.

**Recommendation: renumber #190, not the guardian branch.** The guardian side is a contiguous
three-file run where each builds on the last, so renumbering inside it is the more invasive move.
#190's `0029_feedback.sql` is standalone. `0032` is taken by #225, so **`0033_feedback.sql`** is the
first genuinely free number.

**This needs someone with push to `feat/m2-feedback-data-v2` on the upstream.** It is not a
mechanical rename either: `scripts/smoke/` has no smoke for `0029_feedback.sql`, which is the only
migration since 0022 shipping without one, and that gap should be closed in the same pass.

Recorded as item 8 in `docs/engineering-review-backlog.md`.

## Already decided

**#217 is closed as superseded by #218.** Not by judgement: `fix/parser-sectional-key` carries two
commits, and the second is `83e6b48` — #217's only commit. It is the parent of #218's own commit, so
GitHub listed it first under a title that said "parser" only. #218 has been retitled and its body
corrected so the reviewer sees both findings.

## Gates

Every PR in this queue passed all four locally: `pnpm test`, `pnpm typecheck`, `pnpm lint`,
`pnpm build`. **Typecheck is not in CI** — `AGENTS.md` says so and it is still true — so it was run
by hand on every branch.

A note that matters for reviewing any PR in this queue: **`pnpm build` does not verify imports.** With
a deliberately broken import it prints the missing-export error and **exits 0**, still writing
`dist/`. `pnpm lint` is the real gate — `no-undef` catches it, from `eslint:recommended`.
