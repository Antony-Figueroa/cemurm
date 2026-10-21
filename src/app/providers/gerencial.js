// Gerencial access predicate — pure so the rule is testable without a browser.
//
// A "gerencial" account is either platform staff (public.user_roles carries
// system_admin) or an active manager of an organisation (org_memberships has
// role org_owner / org_admin / branch_admin and status 'active'). The role
// vocabulary is the one migration 0001 already defines; this file invents no
// role and no column.
//
// 'instructor' is deliberately excluded: it is an elevated repertoire role,
// not a manager of the organisation. 'former' and 'pending' memberships are
// historical or unconfirmed, and the rest of the app already filters to
// status === 'active' (Organizations.jsx, useActiveOrgName).
export const GERENCIAL_ROLES = Object.freeze(['org_owner', 'org_admin', 'branch_admin'])

/**
 * @param {Array<{ role?: string, status?: string }> | null | undefined} memberships
 * @param {boolean} systemAdmin
 * @returns {boolean}
 */
export function isGerencial(memberships, systemAdmin) {
  if (systemAdmin === true) return true
  return (memberships || []).some(
    (membership) =>
      membership?.status === 'active' && GERENCIAL_ROLES.includes(membership?.role),
  )
}
