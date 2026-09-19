// Public library hook (Hito 4 S4.1).
// Owns catalog state + the copy-to-repertoire action. Search and license
// filtering stay client-side on the full catalog (mirrors Songs.jsx
// ponytail); the lib layer keeps the future server-side surface.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth.jsx'
import * as publicLibrary from '../lib/publicLibrary.js'

export function usePublicLibrary() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')
  const [pendingId, setPendingId] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await publicLibrary.listPublicEntries()
      setEntries(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Copy a public entry into this user's repertoire. Resolves the new
   * songs.id. Re-throws on failure so the page can decide how to surface
   * it; the hook records the error message as well.
   */
  async function addToRepertoire(publicSongId) {
    if (!user || pendingId) return null
    setPendingId(publicSongId)
    setError('')
    try {
      const songId = await publicLibrary.copyPublicSongToRepertoire(user.id, publicSongId)
      return songId
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setPendingId(null)
    }
  }

  return {
    entries,
    loading,
    error,
    refresh,
    search,
    setSearch,
    licenseFilter,
    setLicenseFilter,
    pendingId,
    addToRepertoire,
  }
}