// Supabase data layer for the public library (Hito 4 S4.1).
// Catalog reads hit the security_invoker view `public_library_entries`
// (supabase/migrations/0010_public_library.sql) and are read-through cached
// in IndexedDB exactly like songs.js. The only write in this slice is the
// server-side copy RPC (private.copy_public_song_to_repertoire): chart
// content NEVER crosses the client; the definer function creates the copy
// owned by auth.uid().
// Public surface: listPublicEntries, copyPublicSongToRepertoire. The pure
// catalog filter (filterPublicEntries) lives in search.js (Node-safe) and is
// imported here — this module is Vite-bound through supabase.js.
// Scenario coverage: features/public-library-community.feature
// (BROWSING THE PUBLIC LIBRARY + Add a public song to my repertoire).

import { supabase } from './supabase.js'
import { offlineGet, offlineSet } from './offlineCache.js'
import { filterPublicEntries } from './search.js'
import { invalidateSongs } from './songs.js'

// ponytail: known user-facing errors re-thrown as-is; network/PostgREST
// errors map to a safe generic message. The RPC raises 'Song not found.'
// as a DB exception, so this layer also matches the wrapped PostgREST text.
const USER_ERRORS = new Set(['Song not found.'])

function handleError(error) {
  const msg = error?.message || ''
  if (USER_ERRORS.has(msg) || msg.includes('Song not found.')) throw error
  throw new Error('Something went wrong. Please try again.')
}

async function withErrorMapping(fn) {
  try { return await fn() } catch (e) { handleError(e) }
}

// Same read-through contract as songs.js: every successful network read
// overwrites the cache and offline reads serve it unconditionally, so
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
 * List live public library entries. Optional client-side filters mirror
 * the future Supabase query surface so the hook/UI stay put.
 * ponytail: single cache key — a filtered read overwrites the unfiltered
 * cache; acceptable until offline filtered reads matter (same note as
 * songs.js).
 */
export function listPublicEntries(filter = {}) {
  return withErrorMapping(() => withReadThrough('publicLibrary:entries', async () => {
    const { data, error } = await supabase
      .from('public_library_entries')
      .select('*')
      .order('title', { ascending: true })
    if (error) throw error
    return filterPublicEntries(data || [], filter)
  }))
}

/**
 * Copy a live public entry into the caller's repertoire (standalone copy).
 * Runs server-side in the SECURITY DEFINER RPC; chart content never crosses
 * the client. Returns the new songs.id. Invalidates the caller's song list
 * and the new song's cache so My Songs reflects the copy immediately.
 * Standalone by design: linked-copy subscription is S4.2.
 */
export async function copyPublicSongToRepertoire(userId, publicSongId) {
  return withErrorMapping(async () => {
    const { data, error } = await supabase.rpc('copy_public_song_to_repertoire', {
      p_public_song_id: publicSongId,
    })
    if (error) throw error
    if (!data) throw new Error('Song not found.')
    invalidateSongs(userId, [data])
    return data
  })
}