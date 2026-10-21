// Gate for the gerencial template at /admin.
//
// It sits inside RequireAuth and RequireGuardianConsent, so a signed-out
// visitor is already redirected and a minor without active guardian consent is
// held at the lock screen. This component answers the one extra question the
// template needs: is this account a manager?
//
// Fail-closed: a read error denies access rather than opening the console. The
// two reads are the same pair the rest of the app uses — getMyOrganizations()
// under RLS and isSystemAdmin() through the user_roles self-select policy.
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth.jsx'
import { getMyOrganizations } from '../../data/repositories/orgRepertoire.js'
import { isSystemAdmin } from '../../data/repositories/moderation.js'
import { isGerencial } from './gerencial.js'

export function RequireGerencial() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    if (!userId) {
      setAllowed(false)
      return undefined
    }

    let cancelled = false
    Promise.all([getMyOrganizations(), isSystemAdmin(userId)])
      .then(([memberships, systemAdmin]) => {
        if (!cancelled) setAllowed(isGerencial(memberships, systemAdmin === true))
      })
      .catch(() => {
        // Fail-closed: an unreadable membership or role is not a licence.
        if (!cancelled) setAllowed(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  if (allowed === null) return null
  if (!allowed) return <Navigate to="/" replace />
  return <Outlet />
}
