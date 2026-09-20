# Hito 4 — Community Moderation

## Objective
System-appointed community moderators review reports on public-library entries and decide keep/remove/escalate. Org admins get NO moderation powers. Reporter identity stays hidden from contributors.

## BDD
`features/community-moderation.feature` (166 lines): appointment, org-admin exclusion, queue scope, report intake with reason categories, duplicate prevention, identity hiding, grouping with reason counts, no re-queue of decided grounds, keep/remove/escalate, takedown propagation, appeal by different moderator, online-only decisions.

## Backend (validated live against local Supabase)
**Migration `0015_community_moderation.sql`:**
- `private.is_community_moderator(uuid)` — SECURITY DEFINER helper, tenancy-guarded (`auth.uid()`), role `community_moderator` in `user_roles`
- `private.consolidate_report(uuid)` — definer RPC: folds pending reports into ONE open case per entry (reason_counts jsonb + grounds), excludes/closes already-decided grounds
- `private.decide_moderation_case(uuid, text, text)` — definer RPC: moderator gate, appeal different-decider guard, decision write, report closing, takedown (status → 'removed', linked_copies cleared, rating_restrictions increment), notifications via `public.notify_user` (0008 canonical path)
- `private.file_appeal(uuid, text)` — definer RPC: contributor-only, appeal_of linkage
- Thin public wrappers (`public.*`) for PostgREST + revoke/grant per 0012 convention
- RLS: reports (self insert/select, moderator select/update), moderation_cases (moderator select/update ONLY — no client insert), user_roles (self select), rating_restrictions stays deny-by-default
- Added `moderation_cases.created_at` (queue ordering; 0001 DDL lacked it)

**src/lib/moderation.js** — reportPublicSong (insert + consolidate RPC), getModerationQueue, getReportedEntries, isModerator, decideCase, fileAppeal, getAppeals, hasReported. All case writes are RPC-only (online-only).

## Frontend
- `src/hooks/useModeration.js` — queue/decide/appeal/report state
- `src/components/moderation/` — ReportDialog.jsx, ModerationQueue.jsx, CaseDetail.jsx
- `src/pages/Moderation.jsx` — route `/moderation`, gates on isModerator
- `src/App.jsx` — route added under authed AppLayout
- `src/components/layout/AppLayout.jsx` — nav link
- `src/pages/PublicLibrary.jsx` — Report button + dialog on catalog/following cards (hidden for own entries), pre-checked already-reported reasons

## Verification
- [x] `supabase db reset` applies 0015 cleanly (0001→0015)
- [x] RLS live: demo files 2 reports → consolidated; demo/outsider see 0 cases; moderator sees 1 case with `{"spam_duplicate":1,"wrong_metadata":1}`
- [x] Non-moderator decide → `Not a moderator.`
- [x] Decide keep → case decided, reports closed, notification to reporter (hidden from decider's own select — self-scope works)
- [x] Decided-ground exclusion: spam decided earlier → new spam report closes, new wrong_metadata consolidates
- [x] Appeal: contributor succeeds (appeal_of set); non-contributor → `Only the contributor can appeal.`; same decider → `Cannot review your own decision.`; different moderator succeeds
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds

## Notes
- 0015 has no offline queue for moderation writes (scenario 17) — reports rely on the general outbox pattern only if added later; decisions are strictly RPC/online.
- Contributor-facing appeal UX needs a case-id entry point outside the moderator queue (future UI refinement; payload carries public_song_id in the removed notification).