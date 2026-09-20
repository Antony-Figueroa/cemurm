// Supabase data layer for community follows (Hito 4 S4.2.4).
// Follow/unfollow writes go through the S4.2 SECURITY DEFINER RPCs (0013);
// the own-graph read (is-following state) hits the `follows` table directly
// under the participant-only RLS select policy (0013) — the same surface the
// T5 discovery feed query will use. Profile counts come from the aggregate
// RPC (followers/following BIGINTs; no row/identity exposure). Reads are
// read-through cached in IndexedDB exactly like publicLibrary.js / songs.js.
// Public surface: getProfileFollowCounts, getFollowState, followUser,
// unfollowUser, invalidateFollowCaches.
// Scenario coverage: features/public-library-community.feature
// (Follow another musician / Follow and unfollow are reversible).

import { supabase } from './supabase.js'
import { offlineGet, offlineRemove, offlineSet } from './offlineCache.js'

// ponytail: known user-facing errors re-thrown as-is; network/PostgREST
// errors map to a safe generic message (same contract as publicLibrary.js).
const USER_ERRORS = new Set([
  'Authentication required.',
  'Cannot follow yourself.',
])

function handleError(error) {
  const msg = error?.message || ''
  if (USER_ERRORS.has(msg)) throw error
  throw new Error('Something went wrong. Please try again.')
}

async function withErrorMapping(fn) {
  try { return await fn() } catch (e) { handleError(e) }
}

// Same read-through contract as publicLibrary.js: every successful network
// read overwrites the cache and offline reads serve it unconditionally, so
// staleness self-heals on the next successful fetch.
async function withReadThrough(key, fn) {
  try {
    const data = await fn()
    await offlineSet(key, data)
    return data
  } catch (e) {
    if (USER_ERRORS.has(e?.message)) throw e
    const cached = await offlineGet(key)
    if (cached?.data) return cached.data
    throw e
  }
}

/**
 * Drop the follow caches a mutation invalidates: the (follower → followed)
 * state row and the target profile's counts. Invalidate-before-refresh shape
 * matches publishSongToLibrary's offlineRemove('publicLibrary:entries').
 */
export async function invalidateFollowCaches(followerId, followedId) {
  await offlineRemove(`follows:state:${followerId}:${followedId}`)
  await offlineRemove(`follows:counts:${followedId}`)
}

/**
 * Aggregate follow counts for a profile (0013 RPC). Resolves
 * { followers, following } as numbers. Aggregates only — the RPC never
 * returns follow rows, so no identity/edge-list exposure for arbitrary users.
 */
export function getProfileFollowCounts(userId) {
  return withErrorMapping(() => withReadThrough(`follows:counts:${userId}`, async () => {
    const { data, error } = await supabase.rpc('get_profile_follow_counts', {
      p_user_id: userId,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return {
      followers: Number(row?.followers) || 0,
      following: Number(row?.following) || 0,
    }
  }))
}

/**
 * Does `followerId` currently follow `followedId`? Reads the own row via the
 * participant-only RLS select policy (0013) — the same query shape the T5
 * discovery feed runs for the full own-graph. RLS zero-returns rows where
 * the caller is not a participant, so callers must pass the session user as
 * `followerId` (the hook does).
 */
export function getFollowState(followerId, followedId) {
  return withErrorMapping(() => withReadThrough(`follows:state:${followerId}:${followedId}`, async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('created_at')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle()
    if (error) throw error
    return Boolean(data)
  }))
}

/**
 * Follow another musician (scenario 11). Idempotent server-side (0013:
 * ON CONFLICT DO NOTHING); the RPC rejects anonymous sessions and
 * self-follow. The hook invalidates local caches after success.
 */
export async function followUser(followedId) {
  return withErrorMapping(async () => {
    const { error } = await supabase.rpc('follow_user', { p_followed_id: followedId })
    if (error) throw error
  })
}

/**
 * Unfollow another musician (scenario 12, reversible). Idempotent:
 * unfollowing someone already unfollowed is a no-op server-side.
 */
export async function unfollowUser(followedId) {
  return withErrorMapping(async () => {
    const { error } = await supabase.rpc('unfollow_user', { p_followed_id: followedId })
    if (error) throw error
  })
}