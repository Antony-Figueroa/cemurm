// Public library catalog (Hito 4 S4.1) — browse + add-to-repertoire surface.
// Read-only catalog for authenticated users; the copy runs server-side
// (private.copy_public_song_to_repertoire) so chart content never reaches
// the client. Search/license filtering is client-side on the full catalog
// (mirrors Songs.jsx ponytail; bounded catalog for now).
// Scenario coverage: features/public-library-community.feature
// (BROWSING THE PUBLIC LIBRARY + Add a public song to my repertoire).

/* eslint-disable react/prop-types */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { filterPublicEntries } from '../lib/search.js'
import { usePublicLibrary } from '../hooks/usePublicLibrary.js'

const LICENSE_OPTIONS = [
  { value: '', label: 'All licenses' },
  { value: 'public-domain', label: 'Public domain' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'proprietary', label: 'Proprietary' },
]

const LICENSE_STYLES = {
  'public-domain': 'bg-cem-amber/10 text-cem-amber',
  'CC-BY-4.0': 'bg-cem-elevated text-cem-secondary',
  proprietary: 'bg-cem-elevated text-cem-secondary',
}

function LicenseBadge({ license }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${LICENSE_STYLES[license] || LICENSE_STYLES['CC-BY-4.0']}`}
    >
      {license}
    </span>
  )
}

function PublicSongCard({ entry, pending, added, onAdd }) {
  const meta = [entry.artist, entry.genre].filter(Boolean).join(' · ')
  const label = added ? 'Added ✓' : pending ? 'Adding…' : 'Add to repertoire'

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-cem-text">{entry.title}</span>
          <LicenseBadge license={entry.license} />
        </div>
        <p className="mt-0.5 text-xs text-cem-secondary">
          {meta}
          {meta && entry.contributor_name && <span> · </span>}
          {entry.contributor_name && (
            <Link
              to={`/profile/${entry.contributor_id}`}
              className="text-cem-amber hover:underline"
            >
              by {entry.contributor_name}
            </Link>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(entry.id)}
        disabled={Boolean(pending || added)}
        className={`ml-4 shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
          added
            ? 'bg-cem-elevated text-cem-secondary'
            : 'bg-cem-amber text-cem-base hover:bg-cem-amber/90 disabled:opacity-50'
        }`}
      >
        {label}
      </button>
    </li>
  )
}

export default function PublicLibrary() {
  const {
    entries,
    loading,
    error,
    search,
    setSearch,
    licenseFilter,
    setLicenseFilter,
    pendingId,
    addToRepertoire,
    userId,
    withdrawingEntryId,
    withdrawEntry,
  } = usePublicLibrary()
  const [addedIds, setAddedIds] = useState({})
  const [tab, setTab] = useState('catalog')

  const filtersActive = Boolean(search.trim() || licenseFilter)
  const visible = filterPublicEntries(entries, { query: search, license: licenseFilter })
  const mine = entries.filter((entry) => entry.contributor_id === userId)

  async function handleAdd(publicSongId) {
    try {
      await addToRepertoire(publicSongId)
      setAddedIds((prev) => ({ ...prev, [publicSongId]: true }))
    } catch {
      // The hook surfaced the error banner already.
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cem-text">Public Library</h1>
      </div>

      <div className="mt-3 flex gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={tab === 'catalog' ? 'border-b-2 border-cem-amber text-cem-amber' : 'text-cem-secondary'}
        >
          Catalog
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={tab === 'mine' ? 'border-b-2 border-cem-amber text-cem-amber' : 'text-cem-secondary'}
        >
          My contributions
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-cem-rose/10 px-3 py-2 text-sm text-cem-rose">{error}</p>
      )}

      {tab === 'catalog' ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, artist or genre…"
              className="w-full max-w-md rounded-md border border-cem-elevated bg-cem-surface px-3 py-2 text-sm text-cem-text placeholder:text-cem-secondary focus:border-cem-amber focus:outline-none focus:ring-1 focus:ring-cem-amber"
            />
            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              className="rounded-md border border-cem-elevated bg-cem-surface px-3 py-2 text-sm text-cem-text focus:border-cem-amber focus:outline-none focus:ring-1 focus:ring-cem-amber"
            >
              {LICENSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-cem-secondary">Loading public library…</p>
          ) : visible.length === 0 ? (
            <p className="mt-6 text-sm text-cem-secondary">
              {filtersActive ? 'No results — try adjusting your filters.' : 'The public library is empty.'}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-cem-elevated rounded-lg border border-cem-elevated bg-cem-surface shadow-sm">
              {visible.map((entry) => (
                <PublicSongCard
                  key={entry.id}
                  entry={entry}
                  pending={pendingId === entry.id}
                  added={Boolean(addedIds[entry.id])}
                  onAdd={handleAdd}
                />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {loading ? (
            <p className="mt-6 text-sm text-cem-secondary">Loading public library…</p>
          ) : mine.length === 0 ? (
            <p className="mt-6 text-sm text-cem-secondary">You haven&apos;t contributed any songs yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-cem-elevated rounded-lg border border-cem-elevated bg-cem-surface shadow-sm">
              {mine.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-cem-text">{entry.title}</span>
                      <LicenseBadge license={entry.license} />
                    </div>
                    <p className="mt-0.5 text-xs text-cem-secondary">
                      {[entry.artist, entry.genre, entry.contributor_name && `by ${entry.contributor_name}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => withdrawEntry(entry.id)}
                    disabled={withdrawingEntryId === entry.id}
                    className="ml-4 shrink-0 rounded-md border border-cem-elevated px-3 py-1.5 text-sm font-medium text-cem-text hover:bg-cem-elevated disabled:opacity-50"
                  >
                    {withdrawingEntryId === entry.id ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}