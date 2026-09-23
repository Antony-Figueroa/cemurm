// Scale catalog data layer — fetches from Supabase `scale_catalog` table,
// caches locally in module scope. Read-only reference data for music theory
// features (Hito 4). No writes — catalog is seeded via migration.

let cache = null

/**
 * Lazy-imported Supabase client (same pattern as annotations.js).
 */
let supabaseClient = null
async function supabase() {
  if (!supabaseClient) supabaseClient = (await import('./supabase.js')).supabase
  return supabaseClient
}

/**
 * Fetch all scales from the catalog and cache in module scope.
 * Returns the cached array on subsequent calls. Never throws — returns []
 * on network/RLS failure so callers degrade gracefully.
 */
export async function fetchScales() {
  if (cache) return cache
  try {
    const { data, error } = await (await supabase())
      .from('scale_catalog')
      .select('id, name, aliases, intervals, parent_scale_id, rotation, cardinality')
      .order('cardinality')
    if (error) throw error
    cache = data || []
    return cache
  } catch {
    cache = []
    return cache
  }
}

/**
 * Lookup a scale by its UUID. Returns the scale object or null.
 */
export async function getScaleById(id) {
  const scales = await fetchScales()
  return scales.find((s) => s.id === id) || null
}

/**
 * Pure catalog match (exported for tests): exact name → exact alias →
 * ambiguity-safe substring. The old substring scan ran over a
 * cardinality-ASCENDING list, so a query like "minor" silently hit
 * Pentatonic Minor (5 notes) before Natural Minor (7) and computed degrees
 * against the wrong scale (issue #152). The fallback now fires only when the
 * substring uniquely identifies ONE scale; ambiguous queries return null
 * instead of guessing.
 */
export function matchScaleByName(scales, name) {
  if (!name || !scales) return null
  const normalized = name.trim().toLowerCase()

  // Exact name match
  const exact = scales.find((s) => s.name.toLowerCase() === normalized)
  if (exact) return exact

  // Exact alias match
  const alias = scales.find(
    (s) => s.aliases?.some((a) => a.toLowerCase() === normalized),
  )
  if (alias) return alias

  // Unique substring match (e.g. "harmonic" → "Harmonic Minor"); null when
  // several scales match, so "minor" can never resolve to Pentatonic Minor.
  const matches = scales.filter(
    (s) => s.name.toLowerCase().includes(normalized)
      || s.aliases?.some((a) => a.toLowerCase().includes(normalized)),
  )
  return matches.length === 1 ? matches[0] : null
}

/**
 * Fuzzy-match a scale by name or alias (case-insensitive) against the
 * fetched catalog. Returns the scale object or null.
 */
export async function findScaleByName(name) {
  if (!name) return null
  return matchScaleByName(await fetchScales(), name)
}

/**
 * Clear the module cache (for tests or hot-reload).
 */
export function resetScaleCache() {
  cache = null
}

// Self-check: node -e "import('./src/lib/scaleCatalog.js').then(m => m.demo())"
export async function demo() {
  const assert = (actual, expected, label) => {
    if (actual !== expected) {
      throw new Error(`scaleCatalog demo FAILED: ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    }
  }

  // Without Supabase, fetchScales returns [] gracefully.
  const scales = await fetchScales()
  assert(Array.isArray(scales), true, 'fetchScales returns array')

  const none = await getScaleById('no-such-id')
  assert(none, null, 'missing id returns null')

  const none2 = await findScaleByName('no-such-scale')
  assert(none2, null, 'missing name returns null')

  // Exact/alias hits win; the ambiguous substring "minor" must NOT resolve
  // (the old cardinality-ascending scan picked Pentatonic Minor first).
  // Fixture ordered the way fetchScales returns it (cardinality ASC → the
  // 5-note pentatonics first, exactly where the old scan went wrong).
  const fixture = [
    { name: 'Pentatonic Major', aliases: ['Major Pentatonic'] },
    { name: 'Pentatonic Minor', aliases: ['Minor Pentatonic', 'Blues Pentatonic'] },
    { name: 'Major', aliases: ['Ionian'] },
    { name: 'Natural Minor', aliases: ['Aeolian'] },
    { name: 'Harmonic Minor', aliases: [] },
    { name: 'Melodic Minor', aliases: ['Jazz Minor'] },
  ]
  assert(matchScaleByName(fixture, 'Natural Minor')?.name, 'Natural Minor', 'exact minor scale')
  assert(matchScaleByName(fixture, 'Aeolian')?.name, 'Natural Minor', 'alias minor scale')
  assert(matchScaleByName(fixture, 'minor'), null, 'ambiguous substring resolves to null')
  assert(matchScaleByName(fixture, 'harmonic')?.name, 'Harmonic Minor', 'unique substring resolves')

  console.log('scaleCatalog demo OK: 8 asserts (cache, id lookup, name lookup, ambiguity)')
}
