# Hito 4 — Rehearsal Workflow

## Objective
Plan and run rehearsals against setlists: agenda with per-song parts/readiness, duration estimates + timebox warnings, outcome/run/notes per song, carry-over of needs-work into the next agenda, publish + RSVPs, agreed-key changes logged with the leader, read-only archive at close.

## BDD
`features/rehearsal-workflow.feature` (17 scenarios): agenda from setlist (order + agreed keys); chart readiness flags per song ("Ready to play" / "Needs chart work before rehearsal"); members per song from vocal_parts (unassigned = optional); songs not in setlist ("Not in setlist" tag, setlist unchanged); publish notifies assigned members + shows confirmations; duration estimate from song lengths (exact seconds); overrun warning ("Estimated 24 minutes — exceeds your 20-minute timebox") + Trim/Extend offers; trim drops the song's slot, rest intact; run count + outcome per song; needs-work carries into next agenda with notes; notes attach back to song's rehearsal history (not chart content); chart edit creates a version (existing app behavior); agreed-key change by leader logged with decider + projections update; ready-chart ≠ polished-performance carry-over; absent members' parts flagged (via declined RSVP) + substitution link; offline notes with pending sync (future outbox work).

## Backend (validated — migration 0019, branch feat/hito4-rehearsal-workflow)
**`supabase/migrations/0019_rehearsal_workflow.sql`** (43 KB, 18 functions, 13 policies; no deps on 0014–0018; existing tables from 0001):
- New tables: `rehearsal_rsvps` (rehearsal_id, user_id, status invited/confirmed/declined/undecided, responded_at; UNIQUE(rehearsal_id, user_id)) — publish → invitations → confirmations; `setlist_change_log` (setlist_id, actor_id, action, detail jsonb, created_at) — agreed-key audit with decider.
- RLS (D6): rehearsals select visible (leader OR org member for scope='org' OR event participant for scope='event' — event_participants PK is (event_id, org_id), so event membership resolves as active-org-member of a participating org, documented); leader writes, complete-once-then-read-only; rehearsal_items select visible, insert/delete leader, update leader OR org member/event participant (members mark outcomes/notes) with completed-cooldown (direct client UPDATE → 42501 via grants); rsvps select visible, insert leader (publish), update SELF only from 'invited' → confirmed/declined/undecided; setlist_change_log select setlist-owner/collaborator only, no client insert.
- Helpers: `display_name_for`, session rehearsal visible/writable/item-mark guards, event-scope resolver (definer reads event_participants; events family is deny-by-default here).
- RPCs (definer core + public wrapper, authenticated-only):
  - `create_rehearsal(p_org_id, p_name, p_setlist_id, p_timebox_minutes, p_planned_for)` → uuid: mirrors setlist items into the agenda + carry-over (copies prior needs-work notes into the new items, sets old items' carry_over_to = new rehearsal).
  - `publish_rehearsal(p_rehearsal_id)` → count: status published, creates invited rsvps for DISTINCT vocal_parts users, notify_user each ('invitation', payload rehearsal_id).
  - `rsvp_rehearsal(p_rehearsal_id, p_status)` — self, from 'invited' only.
  - `add_rehearsal_song(p_rehearsal_id, p_song_id)` — leader; 'Not in setlist' tag client-side.
  - `record_rehearsal_run`, `mark_rehearsal_outcome` (polished/needs_work/quick_review), `update_rehearsal_note` — member-of-org/event or leader, completed-blocked.
  - `complete_rehearsal(p_rehearsal_id)` — leader → status completed.
  - `change_setlist_item_key(p_setlist_id, p_item_id, p_agreed_key)` — setlist owner/collaborator OR leader of a non-completed org rehearsal referencing the setlist; updates agreed_key + logs with decider.
- Error strings exact (client maps): 'Not a member.', 'Setlist not found.', 'Rehearsal not found.', 'Only the leader can add songs to this rehearsal.', 'Song already in the agenda.', 'Invalid outcome.', 'You are not invited to this rehearsal.', 'Only the leader can publish this rehearsal.', 'Only the leader can complete this rehearsal.', 'Rehearsal not found or already completed.', 'Only the setlist owner or the rehearsal leader can change the agreed key.', 'Invalid key.', 'Item not found in the setlist.'
- Duration estimate + trim + overrun warning are client-side (song_versions client-readable); no estimate RPCs.
- `substitution_requests` untouched (deny-by-default; the uncovered-parts link is a placeholder UI).

## Frontend (pending)
- `src/lib/rehearsals.js`: listRehearsals, getRehearsal(id) (agenda items + song titles/versions/readiness/outcome/run/notes + rsvps + setlist items' vocal_parts/agreed_key/position), createRehearsal (setlist picker + org + timebox), publishRehearsal, rsvpRehearsal, addRehearsalSong, recordRun, markOutcome, updateNote, completeRehearsal, changeSetlistItemKey — exact error mapping; duration estimate helper (sum song_versions.duration_seconds; quick_review trims the slot)
- `src/pages/Rehearsals.jsx`: list + create form (name, org, setlist, timebox, planned_for)
- `src/pages/RehearsalDetail.jsx`: agenda ordered by setlist position (song + agreed key + readiness badge "Ready to play"/"Needs chart work before rehearsal" + "Not in setlist" tag), parts chips per song (from vocal_parts → member names; unassigned members "optional"), duration summary + timebox overrun warning (exact BDD string) with Trim/Extend hints, per-song outcome/run/notes controls (member-visible), publish flow + RSVP confirmations panel (confirmed/declined/undecided badges; my RSVP button), add-song picker, carry-over tags ("Carried over: needs work" + prior notes), absent/uncovered parts (declined rsvp → "… part uncovered — … absent" + substitution link placeholder), agreed-key change (leader; logged), completed → read-only banner
- `src/App.jsx` routes `/rehearsals` + `/rehearsals/:id` (protected) + `src/components/layout/AppLayout.jsx` nav link "Rehearsals"
- Chart-edit-creates-version (scenario 13) is existing app behavior (songs.js creates song_versions on save); no change. Offline notes (scenario 17) remain future outbox work; the server RPCs are the contract.

## Verification (backend)
- [x] `supabase db reset` applies 0001→0013 + 0019 cleanly (spot re-check EXIT=0)
- [x] create_rehearsal as demo → uuid, 3 items mirroring setlist positions/versions; iso/outsider → 'Not a member.'
- [x] add_rehearsal_song → 4 items; duplicate → 'Song already in the agenda.'; non-leader → leader error
- [x] carry-over: r0 (completed, needs_work + note) → r2's item carries the note; r0 item carry_over_to = r2
- [x] record_run ×2 → run_count 2; outcome polished; invalid → 'Invalid outcome.'; outsider → 'Rehearsal not found.'
- [x] publish → status published, 2 invited rsvps (distinct vocal_parts users), 1 rehearsal invite notification for iso (payload-scoped; the seed's bandmate notification is separate)
- [x] rsvp confirm → confirmed + responded_at; repeat from confirmed → denied (0 rows); outsider denied
- [x] complete: non-leader denied; demo completes; post-completion record_run silent (run_count unchanged); direct client UPDATE → 42501
- [x] change key as owner demo G→A + log (old/new/decider); non-leader denied; iso-led leader-branch change on i2 → succeeds + 2nd log row
- [x] INSERT matrix denied ×4 (setlist_change_log, rehearsal_rsvps, rehearsal_items, rehearsals)

## Notes
- Event-scope rehearsals resolve participants via event_participants (org-level PK) — documented in the migration header.
- RSVP self-response is a single transition ('invited' → response); further changes go through the leader (delete + republish).

## Review status (RDD)
- Assess `medium` (2241 lines base main, `slice_budget_reached`) → preflight STATUS: `stop / managed_assets_outdated` (same environment block as all previous Hito 4 features; `gentle-ai sync` refuses the custom plugin `opencode-review-transport.ts`). **Deferred per session policy** (user decision 2026-09-20: skip native review for now; can run later on the PR slice after the plugin asset state is resolved).
- Commits: `0f084d9` (backend, 980 lines) `5c75a7e` (frontend, 1261 lines). Branch `feat/hito4-rehearsal-workflow` from main; no push/PR yet.
- The `src/pages/ServiceDetail.jsx` cross-reference in the generate-next-agenda carry-over render is client-side heuristic (inSetlist join); the backend carry-over contract is the note copy + carry_over_to backlink (validated).