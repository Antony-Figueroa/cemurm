# Hito 4 — Service Planning

## Objective
Structure a service into ordered blocks with assigned musicians, per-block setlists and budgets, a call sheet with agreed keys, day-of check-in, last-minute song swaps with notifications, and read-only archive after completion.

## BDD
`features/service-planning.feature` (14 scenarios): service composed of ordered blocks; setlist fills a block (songs in order + agreed key); reordering blocks; independent block setlists; time-budget overrun warning; musician assignment; multiple sequential blocks allowed; overlapping assignments rejected; uncovered block warning + substitution link; call sheet with songs/keys/call time/block start; agreed key wins; day-of check-in with timestamp; last-minute song swap notifies affected members + change logged with leader as decider; plan read-only for members until published; rehearsal outcomes surface ("Needs work — check in rehearsal notes"); completed service read-only; offline carry + queued check-in.

## Backend (validated — migration 0018, branch feat/hito4-service-planning)
**`supabase/migrations/0018_service_planning.sql`** (752 lines; no deps on 0014–0017 existing tables from 0001):
- Schema additions: `services.starts_at` (service day/time), `service_blocks.start_offset_minutes` (block interval = [starts_at+offset, +time_budget]), `service_assignments.call_lead_minutes` (default 15 → call time = block start − lead), new `service_change_log` audit table (action + detail jsonb).
- RLS (revoke → policies → grants, D6): services select org-member/leader, insert leader+org-member, update/destroy leader + `status <> 'completed'` (completing once passes; completed rows are read-only), delete leader; blocks/assignments/change_log scope through the parent service; `service_assignments_checkin_self` (user marks own checkin_at once, column-scoped update grant); change_log no client insert.
- Helpers: `private.service_visible_to_session`, `private.service_writable_by_session`, `private.block_interval` ([offset, offset+duration]), `private.display_name_for` (profiles → username → 'Someone'), `is_org_member` is two-arg in 0002 (`user_id, org_id`).
- RPCs (definer core + public wrapper, authenticated-only):
  - `validate_service_plan(p_service_id)` → jsonb warnings `{kind, message}`: overrun (`'{block} block: {est} minutes estimated — {over} minutes over budget'` — exact BDD string; est = SUM song_versions.duration_seconds of the block's setlist items, version-first then latest-version fallback), uncovered (`'{block} block has no musicians assigned'`), overlap (`'{name} is already assigned to {block} — overlapping times'`; interval math, skipped when starts_at NULL), needs_work (`'{song} needs work — check in rehearsal notes'` via rehearsal_items.outcome).
  - `assign_musician(p_service_id, p_block_id, p_user_id, p_part)` → uuid; leader-only; overlap rejection; audit row.
  - `reorder_service_blocks(p_service_id, p_block_ids uuid[])` → two-pass position rewrite (avoids UNIQUE(service_id, position) transients); audit row.
  - `swap_block_song(p_service_id, p_block_id, p_old_song_id, p_new_song_id)` → updates setlist_items (keeps position, resets version/key), notifies every block assignee via `notify_user` (category 'system'), audit row with decided_by.
  - `check_in(p_assignment_id)` → self, once, blocked on completed service.
- Errors exact (client maps): 'Only the service leader can edit the plan.', 'Service not found.', 'Block not found.', 'Block has no setlist.', 'Song not found in the block's setlist.', 'Assignment not found or already checked in.', 'Service is already completed.', overlap message as above.
- `substitution_requests` untouched (deny-by-default; substitution UI is another feature — this slice only warns uncovered).

## Frontend (pending)
- `src/lib/services.js`: listServices, getService(id) (blocks + assignments + setlist items joined), createService, updateServiceStatus (publish/complete), validateServicePlan, assignMusician, unassign, reorderBlocks, swapBlockSong, checkIn — exact error mapping
- `src/pages/Services.jsx`: list + create service (org/branch/name/leader/starts_at pickers)
- `src/pages/ServiceDetail.jsx`: ordered block list (reorder via arrows), per-block setlist (song title + agreed key), time budget + overrun badge, warnings panel (validate output + Needs-work rehearsal chips), musician assignment per block (member picker + part), check-in self toggle, swap-song action with confirm, publish/complete transitions, call sheet view (member → their blocks' songs/keys/call times), change log feed
- `src/App.jsx` route `/services` + `/services/:id` (protected) + `src/components/layout/AppLayout.jsx` nav link "Services"
- Offline queued check-in (scenario 17) is future work tied to the outbox; server-side `check_in` RPC is the contract it will validate against.

## Verification (backend)
- [x] `supabase db reset` applies 0001→0013 + 0018 cleanly (spot re-check EXIT=0)
- [x] RLS visibility: demo/isolation see service family (3 rows each); outsider 0/0/0/0
- [x] validate: overrun exact "Worship block: 29 minutes estimated — 4 minutes over budget"; needs_work exact; uncovered exact for empty block; no overlap on sequential blocks
- [x] reorder [Worship, Opening, Closing] → positions 0/1/2, UNIQUE never violated, audit row
- [x] assign overlap → "… is already assigned to Opening — overlapping times", no row left; ok assign → uuid; non-leader → leader error
- [x] swap → item replaced (position kept, version/key reset), notification to assignee (system, actor injected), change_log with decided_by; non-leader locked
- [x] check_in self once; second → already checked in; direct PATCH only checkin_at (others 42501)
- [x] completed service: leader UPDATE 0 via RLS; check_in → 'Service is already completed.'; all leader RPCs locked
- [x] Client INSERT into service_change_log / substitution_requests → permission denied
- [x] Execute grants: 5 public wrappers authenticated-only, anon false; private cores/helpers locked

## Notes
- Block "simultaneous" semantics derive from start_offset_minutes + time_budget intervals; overlap is skipped when starts_at is NULL (documented).
- Completed-edit observation in tests needed a temporary table-level UPDATE grant (writes are RPC-only in the final grants); revoked immediately.
- Review status (RDD): assess + preflight deferred per session policy (same managed-assets block as previous features; sync refuses the custom plugin). Fill in after assess run.