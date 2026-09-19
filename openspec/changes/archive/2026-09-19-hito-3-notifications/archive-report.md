# Archive Report: hito-3-notifications

- **Archiver**: sdd-archive
- **Date**: 2026-09-19
- **Change**: `hito-3-notifications` (change 2 of Hito 3)
- **Archived to**: `openspec/changes/archive/2026-09-19-hito-3-notifications/`
- **Native status at archive**: 26/26 tasks `[x]`; artifacts proposal/specs/design/tasks/apply-progress `done`; no verify-report artifact exists (verify phase was not run — verification evidence lives in `apply-progress.md`); `actionContext.mode: repo-local`, allowed edit roots = repo root
- **Archive branch**: `docs/hito-3-notifications-archive`, created from `c910244` (head of `docs/hito-3-band-collaboration-archive`, PR #116) — the change-1 canonical main specs (collaboration-bandmates, collaborative-comments, shared-setlist-collaboration, and the 11-requirement row-level-security composed spec) exist only on that branch, and the change-2 deltas compose against them. Main @ `f8c1860` still carries the pre-change-1 specs (RLS = 6 requirements), so composition required the #116 head as base. The change folder was untracked at archive time and carried across the branch switch (repo convention: active change folders commit at archive only).

## Closure State (final-state authority)

- **Tasks**: 26/26 complete (all checkboxes `[x]` in the persisted tasks artifact, observed at archive): PR#0 0.1–0.5, PR#1 1.1–1.5, PR#2a 2.1–2.2, PR#2b 2.3–2.5, PR#4 4.1–4.7, PR#5 5.1–5.4. Pending: 0. No checkboxes were repaired during archive.
- **Delivery — 6-PR chain complete**: PR #117 (pr0, 0008 core), #118 (pr1, 0009 activity), #119 (pr2a, data layer), #120 (pr2b, UI shell), #121 (pr4, event wiring), #122 (pr5, comments + @mention) — all open on origin. **PR#3 intentionally does not exist** (documented gap, tasks.md RQ #8: the former PR#3 was renumbered PR#4 and the former PR#4 renumbered PR#5). Branches pushed: `7062c79`/`0d1a34c` (pr0), `720a6a8`/`aa77884` (pr1), `1251ca0` (pr2a), `b024872` (pr2b), `aa26726` (pr4), `c20e66a` (pr5).
- **apply-progress** (historical snapshot, persisted per batch 2026-09-18/19): its "Remaining … PR#5 pending orchestrator" statement is **SUPERSEDED, not open** — PR #122 was opened afterwards (orchestrator-gated step completed); the 6-PR chain is complete. Do not read the apply-progress "pending" line as current state.
- **Migration split (owner decision 2026-09-18, apply-progress "First pass" + tasks RQ #7)**: the original single-file `0008_notifications.sql` was split into `0008_notifications_core.sql` (PR#0; shared helpers + bandmate_links/setlist_collaborators emissions + transfer RPC) and `0009_notifications_activity.sql` (PR#1; reorder RPC + song-added + shared_comments + **publication + `replica identity full`** — task 1.4, commit `aa77884`, 0009 lines 299–300). The pre-split "migration 0008" wording in the change-2 specs was reconciled to the shipped numbering at archive time (Spec Sync below). This is final state: `notifications` joined `supabase_realtime` and got `replica identity full` in 0009, not 0008.
- **Scenario/IN coverage**: 22 IN scenarios covered per the tasks IN-scenario map (21 scenario blocks in the `notifications` spec + 1 in the RLS delta, "Publication limited to RLS-enabled tables"), each mapped to at least one `[x]` task. PR#5 verification note: "all 22 IN scenarios now covered".
- **Fixes already in the PRs**: `1f83ede` (docs(migration) 0008 header, pr0), `1251ca0` (notifications demo assert count 19→24, pr2a).
- **Local DB state at close** (do not read as clean): the PR#5 walk left the local stack mid-scenario — julian …0004, Tour Setlist …0005 owned by isolation, comment/mention rows, ±noise — all session-local to the reset baseline (apply-progress "Local stack state"). Per the launch contract no `supabase db reset` / walk was re-run at archive; the validations recorded below were executed earlier and are not re-claimed here.
- **Verification evidence (from apply-progress, all exit 0 at their time)**: `supabase db reset --yes` 0001–0009 + seed; divided dry-run psql walk (17+17 blocks PR#0/PR#1); demo suites — `relativeTime` 9 asserts, `notifications` 24 asserts, `setlists` 4 cases, `comments` 12 asserts; PR#4 walk (reorder exactly one row via GUC, transfer zero 'removed'); PR#5 walk (11 blocks — mention dedup, out-of-scope zero rows, no 42501 on openability sweep); `pnpm lint` exit 0 (zero warnings); `pnpm build` exit 0 (pre-existing >500 kB chunk warning only). No verify-report was persisted; nothing here claims a verification certificate that does not exist.

## Spec Sync (executed before the archive move)

Per repo convention (change-1 archive #116: "the four verify findings were reconciled into the **delta specs** first, then the main specs (source of truth) were composed/copied from them"), the drafting defects below were reconciled into the change-2 delta/full specs at archive time, then main specs were produced by the native `gentle-ai sdd-archive-compose` command (or mechanical copy for the full spec). Every reconciliation is listed; nothing was rewritten in silence.

### Reconciliations (documented before → after)

1. **RLS delta — compose refused as written.** The scaffold run failed with exit 1:
   `Error: sdd-archive-compose: unapplied MODIFIED delta for requirement "Notifications replica identity full": no canonical requirement named "Notifications replica identity full"`
   The delta placed a genuinely new requirement under `## MODIFIED Requirements`. Reconciliations:
   - **Moved** `Notifications replica identity full` (requirement + scenario, body verbatim except the migration number) from MODIFIED → **ADDED Requirements**.
   - **Dropped** the phantom ADDED `Notifications publication RLS-safe` entry whose own body read: "Migration 0008 MUST add `notifications` to the `supabase_realtime` publication immut- — (verbatim reconciliation: the RLS publication contract is covered fully in MODIFIED 'Realtime publication RLS-safe'; no separate delta needed)" — stale authoring scaffolding; the 0008 publication change is carried by the MODIFIED entry, exactly as the note itself states.
   - **Cleaned** the drafting fragments from the MODIFIED `Realtime publication RLS-safe` body ("Restructured-verbatim copy of the 0006 realtime publication contract (RLS safe + table publication list from `specs/row-level-security/spec.md` line 186) with the change-2-0008 delta … gener- (reconciliation: …)") into final prose.
   - **Corrected migration numbers** to shipped reality: publication add + `replica identity full` ship in **0009** (task 1.4 / commit `aa77884`; 0009 lines 299–300), not 0008 as spec'd pre-split. Requirement bodies and both GIVEN clauses now read "after 0009"; scenario title renamed `Publication limited to RLS-enabled tables after 0008` → `… after 0009`.
   - **Carried the unchanged canonical scenario** `Subscribers receive only readable rows` into the MODIFIED block, per the OpenSpec convention that a MODIFIED entry replaces the full requirement block (delta MUST contain entire updated requirement including unchanged scenarios). The scaffold compose test confirmed MODIFIED replaces the whole block (missing scenarios are dropped).
2. **notifications full spec — pre-split numbering corrected** (3 lines): Purpose "(migration 0008)" → "(migrations 0008 core + 0009 activity)"; Frozen Decision 3 "in migration 0008" → "in migrations 0008/0009"; Realtime Delivery "Migration 0008 MUST add `notifications` … and MUST set `replica identity full`" → "Migration 0009 MUST …".
3. **shared-setlist-collaboration delta — broken cross-reference removed**: "(…see Proposal Decision cele at change-1 0006 Realtime publication and RLS)" — no decision named "cele" exists anywhere in the change artifacts — replaced with "(…see the change-1 archive reconciliation (verify Finding 3) on the 0006 Realtime publication RLS-safe requirement)". The deferred-clause context is preserved verbatim around it.
4. **No other artifacts found**: `Sys1` (bandmates MODIFIED) is a legitimate cross-reference to the notifications-domain scenario "Pending bandmate accepts" (exploration/proposal/tasks map it); comments delta (2 ADDED) and the bandmates/setlists scenario bodies scanned clean.

### Composition (main spec existed — native tool, exit 0 each invocation)

```bash
gentle-ai sdd-archive-compose \
  --canonical "openspec/specs/{domain}/spec.md" \
  --delta "openspec/changes/hito-3-notifications/specs/{domain}/spec.md" \
  --output "openspec/specs/{domain}/spec.md.compose-tmp" \
&& mv "openspec/specs/{domain}/spec.md.compose-tmp" "openspec/specs/{domain}/spec.md"
```

| Domain | Delta sections | Compose exit | Post-compose vs c910244 canonical |
|---|---|---|---|
| collaboration-bandmates | MODIFIED ×3 | 0 | only the 2 changed requirement blocks differ (3rd re-stated byte-identical); 6 requirements |
| collaborative-comments | ADDED ×2 | 0 | 2 requirements appended; 13 total |
| shared-setlist-collaboration | ADDED ×1 + MODIFIED ×2 | 0 | removal requirement + scenario replaced (S10 now IN), 1 appended; 12 total |
| row-level-security | ADDED ×1 + MODIFIED ×1 (reconciled) | 0 | only `Realtime publication RLS-safe` block replaced + `Notifications replica identity full` appended; 11 → 12 requirements; all 10 unrelated requirements byte-identical |

Post-compose `diff` vs the change-1 canonical (verbatim in phase result) confirmed: no unrelated requirement was altered or dropped; the change-1 fingerprint (incl. verify Findings 1–4 reconciliations) is preserved byte-for-byte in every untouched block.

### Full-spec copy (no main spec existed)

`notifications`: the delta IS a full spec. Copied mechanically with `cp` → temp (`mktemp` in `openspec/specs/notifications/`), `diff -r` (empty, byte-identical), `mv` into `openspec/specs/notifications/spec.md`. Permissions set to the repo convention `644` (the compose/copy temp files default to 600; `chmod 644` applied to all five synced main specs). 7 requirements, 21 scenario blocks.

## Archive Contents (all observed present at move time)

- exploration.md — present (scope decomposition, feature-to-scenario map)
- proposal.md — present (frozen decisions 1–7; Web Push out, in-app only)
- design.md — present; its file table (design.md line 115) still shows the **pre-split** single `0008_notifications.sql` plan — historical, preserved as written (launch contract: do not rewrite design.md; the owner-mandated 0008/0009 split is final state, above)
- tasks.md — present; **26/26 complete, 0 unfinished**
- apply-progress.md — present (historical snapshot; "PR#5 pending" superseded by PR #122, see Closure State)
- verify-report.md — **absent** (verify phase was not run; no report was ever produced)
- specs/notifications/spec.md, specs/collaboration-bandmates/spec.md, specs/collaborative-comments/spec.md, specs/shared-setlist-collaboration/spec.md, specs/row-level-security/spec.md — present (delta/full specs as reconciled above)
- .gentle-ai-instance — **absent** (not present in this change folder)
- archive-report.md — this file (additive, written after the move; excluded from the move readback)

Nothing missing beyond the two absences above, which are reported as observed. No checkboxes were repaired and no historical report (tasks/apply-progress/design) was rewritten during archive.

## Byte-Preservation Evidence (Mechanical Copy Contract)

- **Archive move**: snapshot-guarded mechanical move (`cp -R` to `mktemp -d` snapshot → `git mv` refused, status 128, untracked source: `fatal: directorio de fuente está vacío, fuente=openspec/changes/hito-3-notifications, destino=openspec/changes/archive/2026-09-19-hito-3-notifications` → fallback guards: source-unchanged `diff -r` empty, destination absent → plain `mv`) → final `diff -r <snapshot>/source <archived-folder>` = **empty (byte-identical)**. Verbatim outputs included in the phase result.
- **Main-spec copy**: notifications `diff -r` delta-vs-temp = **empty** before `mv`.
- **Main-spec composes**: 4 × `gentle-ai sdd-archive-compose` exit **0** (composition evidence); post-compose diffs vs the change-1 canonical inspected and limited to intended blocks (above).
- No artifact content passed through a model Read/Write path during copy/move; all copies/moves were native shell operations. The delta reconciliation edits described in Spec Sync are content changes to the change artifacts themselves (the #116 precedent did the same and documented it), not byte-copies.

## Findings and Unresolved Items at Close

- **Resolved during archive**: RLS delta section placement + drafting artifacts + migration numbering (0008 → 0009); notifications spec migration numbering; setlists delta broken cross-reference. All recorded above with before/after text.
- **Open (not re-verified at close)**: the local DB is mid-PR#5-scenario (session-local state, above); no runtime two-browser realtime walk of the non-PK `user_id` filter was executed in this session — the evidence at close is the 0009 SQL (`replica identity full` + publication), the divided dry-run assertions (1.5(g): publication = exactly {setlists, setlist_items, setlist_collaborators, notifications}, `relreplident = 'f'`), and the design's focus-refetch fallback (2.3/4.6) if the local Realtime stack ever fails the filter. The RLS spec wording ("relies on…, so `postgres_changes` honors RLS per subscriber") reflects the shipped mechanism, not a re-run claim.
- **Deferred (per tasks deferred table, NOT tasks)**: Web Push infrastructure; push preferences ×4; weekly digest (Sys4/Sys6); org-membership invitation (I4); event notifications ×4; proximity-code expiry (Sys2); password-reset request (Sys3); feed unification (change-1 D5/D6); song-removal emission site (silent by design); retention/purge RPC. All unchanged from the persisted tasks artifact.
- **Suggestions**: none new at archive.

## Observation Lineage (Engram, project `cemurm`)

Artifact retrieval for this archive was by file path (native status resolved `openspec` file locators), so the files in the archived folder are the authoritative sources. The following Engram observations exist for this change and are recorded for traceability:

| Artifact | Engram observation |
|---|---|
| proposal | #248 (architecture) |
| spec | #249 (architecture; concatenated delta specs) |
| design | #250 (architecture) |
| tasks | #251 (architecture) |
| apply-progress | #252, #253, #254 (architecture; per-slice mirrors: re-slice / PR#4 / PR#5) |
| verify-report | none — verify phase was not run; no observation exists |
| archive-report | this report — mirrored to Engram via `engram save` CLI (topic_key `sdd/hito-3-notifications/archive-report`, type `architecture`, project `cemurm`, scope `project`); the `mem_save` MCP tool is not exposed in this sub-agent session; CLI writes capture no prompt by construction |

## Delivery Note

Per the launch contract (unlike change-1's #116 phase, which prepared the tree and let the owner decide), this archive **commits** the archived change folder and the synced main specs as a `docs(openspec)` commit on `docs/hito-3-notifications-archive`, pushes the branch, and **opens the archive PR** (base `main` per repo convention — the same shape as PR #116; no labels, no `Closes`, milestone in prose). The PR is NOT merged by this phase (owner decides). Main specs on `main` remain pre-change-2 until #116 and this PR land — the sync lives on the archive branch, as with change 1.