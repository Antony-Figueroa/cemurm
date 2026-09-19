-- CEMURM 0011 — public wrapper for the copy RPC (fix-forward)
--
-- Gap closed: 0010 put copy_public_song_to_repertoire in `private` (the
-- correct safe-schema convention), but the S4.1 client calls it through
-- PostgREST (supabase.rpc), which only exposes `public` + `graphql_public`
-- (config.toml db.schemas = ["public", "graphql_public"]) — the RPC would
-- 404 from the app. This thin public wrapper keeps the definer logic in
-- `private` and exposes exactly one authenticated entry point.
--
-- Pattern follows 0003 (gap-closer for 0002's grants): a NEW migration
-- repairs prior ones; history is never rewritten.
--
-- Security posture:
--  · wrapper is SECURITY DEFINER, search_path pinned, refs fully qualified
--  · default PUBLIC/anon execute revoked, authenticated-only grant (D6)
--  · the private function keeps its own revoke/grant (0010) — unchanged

create or replace function public.copy_public_song_to_repertoire(p_public_song_id uuid)
returns uuid
language sql security definer set search_path = '' as $$
  select private.copy_public_song_to_repertoire(p_public_song_id);
$$;

revoke execute on function public.copy_public_song_to_repertoire(uuid) from public, anon;
grant execute on function public.copy_public_song_to_repertoire(uuid) to authenticated;