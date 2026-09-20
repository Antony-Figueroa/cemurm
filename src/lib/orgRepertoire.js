// Organizational repertoire (Hito 4, org-repertoire-model): my org membership
// read, used by the service planner's org picker. Mirrors the canonical
// memberships query (org + branch nested); on THIS branch the
// organizations/branches/org_memberships tables stay deny-by-default for
// clients (0002 lock, re-opened by the org-repertoire slice's migration 0016),
// so the RLS-filtered read comes back empty and we fall back to the public
// session_org_ids() bridge (0005 — already used by gigs.js) so a leader can
// still create services. Names resolve automatically once org reads land.
//
// Public surface: getMyOrganizations.

import { supabase } from './supabase.js'

// ponytail: known user-facing errors re-thrown as-is; everything else maps to
// the generic message (songs.js / setlists.js convention).
const USER_ERRORS = new Set(['Not a member.'])

function handleError(error) {
  if (USER_ERRORS.has(error?.message)) throw error
  throw new Error('Something went wrong. Please try again.')
}

async function withErrorMapping(fn) {
  try { return await fn() } catch (e) { handleError(e) }
}

/** Flatten one raw org_memberships row (with embedded org + branch). */
function normalizeMembership(row) {
  const org = row.organizations
  const branch = row.branches
  return {
    id: row.id,
    orgId: row.org_id,
    branchId: row.branch_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    org: org
      ? { id: org.id, name: org.name, orgType: org.org_type, logoUrl: org.logo_url, status: org.status }
      : null,
    branch: branch
      ? { id: branch.id, name: branch.name, city: branch.city }
      : null,
  }
}

/**
 * My active org memberships (org + branch nested). RLS scopes the read to
 * rows I can see; when the org tables are still locked for clients, the read
 * is empty and the session_org_ids fallback keeps creation working.
 */
export function getMyOrganizations() {
  return withErrorMapping(async () => {
    const { data: session } = await supabase.auth.getUser()
    const userId = session?.user?.id
    if (!userId) return []

    const { data, error } = await supabase
      .from('org_memberships')
      .select('*, organizations(*), branches(*)')
      .eq('user_id', userId)
    if (error) throw error

    const memberships = (data || []).map(normalizeMembership)
    if (memberships.length > 0) return memberships

    // Deny-by-default fallback: org ids only — names resolve once the
    // org-repertoire slice opens the org tables.
    const { data: orgIds, error: orgErr } = await supabase.rpc('session_org_ids')
    if (orgErr) throw orgErr
    return (orgIds || []).map((orgId) => ({
      id: `org-${orgId}`,
      orgId,
      branchId: null,
      role: null,
      status: 'active',
      joinedAt: null,
      leftAt: null,
      org: { id: orgId, name: null, orgType: null, logoUrl: null, status: 'active' },
      branch: null,
    }))
  })
}