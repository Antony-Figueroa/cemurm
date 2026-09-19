# Archive Report: hito-3-band-collaboration

- **Archiver**: sdd-archive
- **Date**: 2026-09-18
- **Change**: `hito-3-band-collaboration`
- **Archived to**: `openspec/changes/archive/2026-09-18-hito-3-band-collaboration/`
- **Native status at archive**: 22/22 tasks complete; artifacts proposal/specs/design/tasks/applyProgress/verifyReport all `done`; dependencies archive=`ready`; `nextRecommended: archive`; no blockers; `actionContext.mode: repo-local`, `allowedEditRoots` = repo root
- **Base**: `main` @ `f8c1860` (per verify-report); change folder was untracked at archive time (repo convention: active change folders commit at archive only)

## Closure State (final-state authority)

- **Tasks**: 22/22 complete (all checkboxes `[x]` in the persisted tasks artifact, observed at archive). Pending: 0.
- **apply-progress** (historical snapshot, persisted per batch 2026-09-16/17): its Batch 3 "GAP" claim — that migration 0006 granted only SELECT+INSERT on `shared_comments` and that edit/resolve/soft-delete (S5/S6/S7) plus offline replays remained gated — is **RESOLVED, not open**. Migration **0007** was merged to `main` afterwards in `f8c1860` via **PR #115** `feat(migration): 0007 shared_comments author writes — edit/resolve/soft-delete RLS (Hito 3 PR#3-4)`. The offline replays are no longer gated. Do not read the apply-progress GAP as current state.
- **verify-report**: regenerated 2026-09-18, verdict **PASS-WITH-WARNINGS**. 32 IN scenarios + RLS delta: **25 verified by code/demo/migration evidence** (4 executable `demo()` suites = 57 asserts; green transactional dry-run of 0006+0007 with rollback-verified zero residue), **7 partial**, **0 unimplemented**. Commands: `pnpm lint` 0, `pnpm build` 0, comments demo 12/0, setlistCollab demo 26/0, bandmates demo 8/0, annotations demo 11/0. 4 findings (classification/wording), none blocking archive; all four synced into the delta specs at archive time (Spec Sync below).
- **Delivery**: chain #101–#115 landed on `main` — 15 conventional commits including the #108→#109→#110 revert/re-land cycle. No scope creep: `git diff 6feabce..HEAD` = 20 affected files. `strict_tdd: false` — no test runner in the repo; no test commands were invented.

## Observation Lineage (Engram, project `cemurm`)

Artifact retrieval for this archive was by file path (native status resolved `openspec` file locators), so the files above are the authoritative sources. The following Engram observations exist for this change and are recorded for traceability:

| Artifact | Engram observation |
|---|---|
| proposal | #235 (architecture) |
| spec | #236 (architecture) |
| design | #237 (architecture) |
| tasks | #238 (architecture) |
| apply-progress | #240 (decision; orchestration summary) |
| PR#1a split decision | #239 (decision; orchestration) |
| verify-report | none — verify phase persisted the file only (per verify-report Skill Resolution) |
| archive-report | this report — mirrored to Engram via `engram save` (topic_key `sdd/hito-3-band-collaboration/archive-report`, type `architecture`, project `cemurm`, scope `project`); the `mem_save` MCP tool was not exposed in this session, CLI write used instead (CLI writes capture no prompt by construction) |

## Spec Sync (verify "Next Recommended" — executed before the archive move)

The four verify findings were reconciled into the **delta specs** first, then the main specs (source of truth) were composed/copied from them:

1. **Finding 3 — pre-accept "view but not edit" corrected** (`shared-setlist-collaboration`, "Shared setlist creation and invitation"): requirement and scenario now state that invitees MUST NOT see or edit the setlist until they accept — acceptance unlocks visibility. Motive recorded in-spec: 0002 `setlists_select_member` requires `accepted_at IS NOT NULL`, so the earlier wording was not reachable under the shipped RLS; accept is a view-unlock, not an edit-unlock.
2. **Finding 1 — offline indicator clause annotated deferred/partial** (`shared-setlist-collaboration`, "Offline edit with pending sync"): the local "pending sync" flag is data-layer-only for setlists (`buildOptimisticCollab`, cache-persisted); no UI badge renders it on setlist surfaces and no server/feed signal exists for a local pending edit. Clause annotated in requirement and scenario.
3. **Finding 2 — activity-feed record clause annotated deferred/partial** (`shared-setlist-collaboration`, "Non-conflicting offline merge"): `reconcileSetlistOp` merges/drops (demo-verified), but drained ops never broadcast activity events; the feed records only live share/reorder/transfer broadcasts and local emits. Clause annotated in requirement and scenario, under the disclosed D5/D6 live-broadcast ceiling.
4. **Finding 4 — two notification clauses added to the named deferral tables**: bandmates S5 declined-invite notification ("I receive a notification that Lucia declined") added to the `collaboration-bandmates` Deferred Scenarios table (→ change 2; PR#1a surface = declined-outgoing list section); setlists S10 removal notification ("Julian sees a notification that she was removed") added to the `shared-setlist-collaboration` Deferred Scenarios table (→ change 2; PR#2a surface = "N collaborator(s) remaining" notice). Both scenarios/requirements annotated accordingly.

### Composition (row-level-security — main spec existed)

```bash
gentle-ai sdd-archive-compose \
  --canonical "openspec/specs/row-level-security/spec.md" \
  --delta "openspec/changes/hito-3-band-collaboration/specs/row-level-security/spec.md" \
  --output "openspec/specs/row-level-security/spec.md.compose-tmp" \
&& mv "openspec/specs/row-level-security/spec.md.compose-tmp" "openspec/specs/row-level-security/spec.md"
```

Exit **0** (composition evidence). Post-compose check: the 6 pre-existing requirements are preserved (Hardened lookup helpers, RLS enabled on all 48 tables, Owner-scoped policies, Gap tables deny-by-default, Demo seed data, User preferences owner-scoped) and the delta's 5 ADDED requirements appended (Profiles table with RLS, Bandmate links pair-scoped RLS, Shared comments arrangement-scoped RLS, Setlist collaborator self-accept, Realtime publication RLS-safe).

### Full-spec copies (no main spec existed)

`collaboration-bandmates`, `collaborative-comments`, `shared-setlist-collaboration`: each delta IS a full spec; copied mechanically with `cp` → temp, `diff -r` (empty, byte-identical), `mv` into `openspec/specs/{domain}/spec.md`. Final confirmation after the archive move: `diff -r` archived delta vs main spec = **empty** for all three domains.

## Archive Contents (all observed present at move time)

- proposal.md — present
- exploration.md — present
- design.md — present
- tasks.md — present; **22/22 complete, 0 unfinished**
- apply-progress.md — present (historical snapshot; Batch 3 GAP superseded by 0007/`f8c1860`/PR #115, see Closure State)
- verify-report.md — present (2026-09-18, PASS-WITH-WARNINGS)
- specs/collaboration-bandmates/spec.md, specs/collaborative-comments/spec.md, specs/row-level-security/spec.md, specs/shared-setlist-collaboration/spec.md — present
- .gentle-ai-instance — present
- archive-report.md — this file (additive, written after the move; excluded from the move readback)

Nothing missing. No checkboxes were repaired and no historical report (tasks/apply-progress/verify-report) was rewritten during archive.

## Byte-Preservation Evidence (Mechanical Copy Contract)

- Archive move: snapshot-guarded mechanical move (`cp -R` to `mktemp -d` snapshot → `git mv` refused, status 128, untracked folder "source directory is empty" → fallback guards: source-unchanged `diff -r` empty → plain `mv`) → `diff -r <snapshot>/source <archived-folder>` = **empty (byte-identical)**.
- Main-spec copies: per-domain `diff -r` delta-vs-temp before `mv` = **empty** for all three domains; final archived-delta-vs-main-spec `diff -r` = **empty** for all three domains.
- No artifact content passed through a model Read/Write path; all copies/moves were native shell operations.

## Findings and Unresolved Items at Close

- **Resolved during archive**: verify findings 1–4 (disclosure/classification gaps) are now reflected in the archived delta/main specs — annotated as deferred/partial or moved into the named deferral tables. None described wholesale-unimplemented scenarios; none block closure.
- **Still open (post-archive verification, per verify-report)**: behavioral runtime walks — two-user RLS walk, two-browser realtime <2s / lock / conflict-toast walks, offline drain walk, 2-account invite/comment walks — were NOT EXECUTED at verify time (they require deploying 0006+0007 on the persistent local stack via `supabase db reset`/`db push` plus seeded browser sessions; verify brief marks them not-required). Scenarios were rated by code/demo/migration evidence with the runtime gap stated. `setlists.js`/`offlineSync.js` bare-node `demo()` remains not executable (static `import.meta.env` evaluation at module scope); pure collab/reconcile logic is covered by `setlistCollab.js` demo (26 asserts).
- **Suggestions (non-blocking, per verify-report)**: split `setlist_collaborators_update_self` surface into a dedicated `accepted_at` column grant + owner-side `can_edit` grant if self-granting edit must be prevented; consider a fallback read in `moveSongInSetlist` before erroring on an empty cache; upgrade `transferOwnership` to a Postgres RPC for atomicity.
- **Deferred to change 2** (notifications feed/triggers): declined-invite notification (bandmates S5 clause), removal notification (setlists S10 clause), setlist change-notifications push (S15), notify-bandmates and @mention comment triggers (comments S11/S12). **Deferred to change 3**: merge-conflict screen (S8), revert (S14), conflict policy, proximity-code gated flows (bandmates S6–S9, S13 — gated on PR#1 line budget, not IN).

## Engram Mirror

Archive report mirrored to Engram project `cemurm` via `engram save` with title/topic_key `sdd/hito-3-band-collaboration/archive-report`, type `architecture`, scope `project`. The `mem_save` MCP tool is not exposed in this sub-agent session; the CLI write fulfills the same deterministic topic-key upsert and captures no prompt by construction.

## Delivery Note

No commit/push/PR was made by this phase (per launch contract). The tree is prepared: 4 main specs updated, change folder archived. Owner decides delivery under ordinary repository policy (previous archive `hito-2-remainder` was committed as `docs(openspec)` by owner decision). Untracked-at-archive: the archived change folder and the updated main specs — pending the owner's commit decision.