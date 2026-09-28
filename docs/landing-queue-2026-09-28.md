
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

---

# Handoff — tracks 2 and 3, not yet built

Written 2026-09-28 at the end of the session that built track 1 (#229). Both tracks are **mapped
but not assembled**: the merge order is known, the conflicts are known and located, and nothing has
been resolved. A fresh session can start from here without re-deriving any of it.

## Hard constraints for whoever continues

1. **Do not use `git add -A`.** It has already cost two bad diffs this session: 22 committed
   `.playwright-mcp/` snapshots that `.gitignore` excluded (15,000 of the 17,000 lines the
   consolidated diff first measured), and a 160-line macOS design doc that was not mine. Add paths
   explicitly, or check `git status --porcelain | grep '^??'` before staging. **The macOS doc
   `odd/tasks/visual-system-macos.md` is currently untracked in the working tree — leave it that
   way.** It belongs to someone else.
2. **The upstream cannot be pushed to.** The ruleset declines it with
   `push declined due to repository rule violations`, and the account holds `push: true`. Push to
   the fork `Antony-F-figuro` and open the PR from there. Backlog item 9.
3. **Never merge.** The agreement stands: the maintainer approves and merges. Do not re-litigate it
   without being asked.
4. **Land track 1 (#229) first.** It adds the fixtures that make the other two reviewable, and the
   three backlog entries the other two refer to.

## Track 2 — the ten music-theory findings

Nine branches, not ten: **#217 is closed as superseded by #218**, whose branch carries finding E's
commit `83e6b48` as its parent. #218 was retitled to say it carries findings A **and** E.

Merge in this order from `main` on a branch named `land/2-findings`:

```bash
git checkout -B land/2-findings main
for b in fix/reconcile-silent-drop fix/parser-sectional-key fix/key-spelling-preference \
         fix/onsong-agreed-key fix/spotify-key-parsing fix/readiness-lifecycle \
         fix/unspecified-crashes fix/unspecified-silent-wrong \
         fix/overlay-session-capability; do git merge --no-edit "$b"; done
```

The first six merge clean. **Three conflicts, in three files:**

| Branch | File | Both sides touch |
|---|---|---|
| `fix/unspecified-crashes` | `src/domain/chart/readiness.js` | lines 23-29 |
| `fix/unspecified-crashes` | `src/domain/setlist/collab.js` | lines 119-122 |
| `fix/unspecified-silent-wrong` | `src/domain/music/transpose.js` | lines 78-83 |

**Resolve each by keeping both changes — they are unrelated defects in the same function.** The
line ranges were measured, and the overlaps are real context collisions, not competing logic.
`fix/unspecified-crashes` renames nothing and `fix/unspecified-silent-wrong` does not touch
`readiness.js` or `collab.js` at all, so in the `readiness.js` and `collab.js` cases one side is a
pure context shift: take the incoming side and re-apply the local hunk. In `transpose.js` both sides
edit the same region — `#224` rewrites `CHORD_RE` and adds `normalizeRoot`, `#223` fixes the
fractional-semitone path — so both bodies are needed.

After resolving: all four gates, then push to the fork and open the PR. Expected size is roughly
2,000 lines across the music/domain and repository files.

## Track 3 — the Hito 5 chains

Thirteen branches, and **six of them are parent-child chains**, so the chains cost nothing: a child
is already based on its parent. Merge roots and children in any order within a chain.

Merge from `main` on `land/3-hito5`:

```bash
git checkout -B land/3-hito5 main
for b in fix/m0a-projection-drift docs/migrations-parity \
         feat/m2-projection-pages-v2 feat/m2-projection-entry-v2 \
         fix/feedback-migration-numbering \
         feat/m2-feedback-ui-v2 \
         feat/m2-plan-freeze-core-v3 feat/m2-plan-freeze-ui-v2 \
         fix/m1-review-batch1-minors-ui-v2 fix/m1-review-batch1-moderation-ui-v2 \
         feat/m2-external-display-channel-v2 feat/m2-display-stagemode-integration-v2 \
         feat/jsdoc-libs-s01-perf-core-v2; do git merge --no-edit "$b"; done
```

**One conflict:**

| Branch | File |
|---|---|
| `feat/m2-external-display-channel-v2` | `src/app/router.jsx` |

`router.jsx` is the hub of the whole queue: seven PRs across all three tracks add routes to it.
Track 3's conflict with track 2's `fix/overlay-session-capability` is the same file plus
`src/features/stage/pages/StageMode.jsx`. **Those two must land together rather than as separate
merges**, which is why the earlier per-PR ordering put the router-touching PRs in one block. If
track 2 has already landed by the time track 3 is built, this conflict is already resolved and only
the `router.jsx` one above remains.

**`fix/feedback-migration-numbering` replaces `feat/m2-feedback-data-v2`** — do not merge both. The
renumber branch is based on the data branch and renames `0029_feedback.sql` to `0033_feedback.sql`
plus adds the smoke test. Merging the data branch first and the renumber after is also correct;
merging the data branch alone is not, because it ships the colliding `0029`.

### Verified facts about track 3 that must not be re-litigated

- The `0029` collision is **real**: `origin/fix/fail-closed-minors`,
  `origin/feat/guardian-consent-db` and `origin/feat/guardian-email` all carry
  `0029_fail_closed_minors.sql` in a contiguous `0029`/`0030`/`0031` run. `supabase db reset`
  executes migrations in **filename order**, so two files sharing a version prefix have an
  arbitrary relative order.
- `0021_plan_freeze.sql` **keeps its number** and merges without a renumber. `0021` is still
  unclaimed.
- The renumber and its smoke were **verified**: 18 PASS / 0 FAIL, run inside a transaction that was
  rolled back, with `public.feedback` confirmed absent afterwards. No `supabase db reset` was run.
- `feat/jsdoc-libs-s01-perf-core-v2` is independent and conflicts with nothing in this track. The
  *other* jsdoc PRs, #204–#213, are **CONFLICTING** and are not part of this work — they need
  closing or resolving by whoever owns them.

## What has not been done, and is not claimed

- **Neither track 2 nor track 3 has been built, resolved, gated, or pushed.** The merge order and
  the conflict locations are the deliverable here, not the branches.
- **No merge has been attempted since the ruleset went active**, so whether the ruleset blocks
  *merges* as well as pushes is still unknown. The first merge of track 1 (#229) is the cheapest
  possible probe: it fixes nothing, so if the ruleset refuses it, nothing is lost.
- The rendered behaviour in track 2 is verified **per finding** in the browser via the track 1
  fixtures. The consolidated branch itself has not been exercised in the browser.
