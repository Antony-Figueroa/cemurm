# Fix duplicate migration version 0035 and guard against recurrence

## Objective

Restore `supabase db reset` / `supabase start`, which have been impossible since
2026-10-15, and make the class of defect detectable by CI instead of by a runtime
duplicate-key crash.

## Problem

`supabase/migrations/` carried two files with version prefix `0035`:

| file | introduced by |
|---|---|
| `0035_projection.sql` | `07522a0`, 2026-10-10 (`chore(migrations): renumber plan_freeze 0021→0034, projection 0022→0035`) |
| `0035_fix_migration_chain_rls.sql` | `2f06b1f`, **#376, 2026-10-15** |

`supabase_migrations.schema_migrations` is keyed by version, so the first INSERT
succeeds and the second aborts the reset:

```
Applying migration 0035_fix_migration_chain_rls.sql...
Applying migration 0035_projection.sql...
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"
Key (version)=(0035) already exists.
```

Evidence: E2E Chromium job `116973294639`, run `38901098665`.

Blast radius: `supabase db reset`, `supabase start`, the E2E suite, and all 13
`scripts/smoke/*.sql` (which mandate a fresh reset first). `main` could not be
green.

## Why it went unnoticed

The two failures are stacked. `main`'s E2E died **earlier**, at the Docker image
pull (`toomanyrequests` from `public.ecr.aws`), and never reached the migration
stage. Fixing the registry (#377) revealed the next failure. A green-looking red
job hid a second, independent break.

## Why it is not an "it was free when I looked" defence

`AGENTS.md` documents this hazard twice -- *"A number free on `main` is not free
for you"* and *"It was free when I looked was true twice and false both times"* --
and it landed anyway. Prose did not hold, which is the argument for the guard.

## Scope

- `supabase/migrations/0035_fix_migration_chain_rls.sql` →
  `0038_fix_migration_chain_rls.sql` (next free slot; `0036`/`0037` taken).
- `scripts/check-migrations-unique.sh` -- new CI gate.
- `.github/workflows/ci.yml` -- one step, immediately before the visual gate.

## Why 0038 is safe

- The file is idempotent by design: `create or replace` / `drop policy if exists`
  throughout, and its own header states *"MIGRATIONS ARE IMMUTABLE: 0014–0019 are
  left exactly as shipped ... a fresh full-chain reset and already-deployed
  databases converge to the same state."* Re-running it under a new version is
  therefore a no-op on convergent state.
- Neither `0036` nor `0037` references anything it creates. `0036` creates the
  `approve_guardian_public_sharing*` functions; `0037` creates
  `setlist_conflict_resolutions` and `apply_setlist_item_op`; the renamed file
  only recreates `display_name_for` and four RLS policies on `songs`,
  `event_participants` and `event_setlists`. Sorting last is safe.
- Header comment updated to record the renumber; SQL logic untouched.

## Acceptance criteria

1. No duplicate version prefix remains in `supabase/migrations/`.
2. `supabase start` gets past the migration stage in E2E.
3. The E2E suite goes green on this branch (which also carries #377's registry
   fix, so this branch is the first place the full chain can pass).
4. The guard fails on a duplicate and passes on the real tree.

## Checks

- `bash scripts/check-migrations-unique.sh` → exit 0 on the real tree.
- Same script against a synthetic duplicate tree → exit 1, naming both files.
- Same script against a malformed filename → exit 1.
- CI `lint-and-build` runs the guard; E2E is the behavioural verdict.

## Progress

- [x] Rename `0035_fix_migration_chain_rls.sql` → `0038_fix_migration_chain_rls.sql`
- [x] Update the migration header to record the renumber
- [x] Add `scripts/check-migrations-unique.sh` (+ executable bit)
- [x] Wire it into `.github/workflows/ci.yml` before the visual gate
- [x] Verify the guard passes on the real tree and fails on a duplicate
- [ ] Push and confirm E2E passes the migration stage / goes green
- [ ] Open PR stacked on #377

## Deviations / notes

- Stacked on `ci/e2e-ghcr-images` (#377) deliberately: neither fix alone turns
  E2E green, because each branch carries the other's defect. This branch is the
  first place the full chain can be observed passing.
- The guard deliberately does not check for *gaps* in numbering. Gaps are legal
  (numbers get abandoned or burned); duplicates are not.
- No `size:exception` needed: ~36 lines of script plus a rename and one CI step.
