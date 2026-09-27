// Supabase data layer for minor accounts + guardian consent (Hito 4).
// The backend owns every rule: consent writes go through the RPCs only, and
// profiles.date_of_birth / is_minor are never client-readable (0017 shipped no
// select grant for either column, 0030 did not add one).
// Since 0030 the app asks the server for its own age status — getAgeStatus
// returns the only two facts the UI needs (dob_known, is_minor) and the
// database decides. user_metadata.isMinor survives as a signup-time UX hint
// only; it is user-editable through GoTrue updateUser(), so nothing gates on it.
// Since 0031 consent is a two-step handshake and BOTH steps are client-driven:
// requestGuardianConsent opens a 'pending' row (it does NOT unlock anything),
// and sendGuardianConsentEmail asks the send-guardian-consent edge function to
// mail the guardian the one-shot link. Neither step may be skipped: a request
// with no email reaches no guardian, so the minor stays locked forever.
// Public surface: getAgeStatus, setDateOfBirth, getConsentStatus,
// requestGuardianConsent, sendGuardianConsentEmail, approvePublicSharing.
// Scenario coverage: features/minors-and-guardian-consent.feature
// (signup age gate, account activation, consent record, public-sharing gate).

import { supabase } from '../supabase.js'

// ponytail: known user-facing errors re-thrown as-is; network/PostgREST
// errors map to a safe generic message (songs.js/publicLibrary.js pattern).
const USER_ERRORS = new Set([
  'Guardian consent required.',
  'You can only consent for your own account.',
  'Consent is only required for minors.',
  'Consent already active for this account.',
  'Consent not found or not active.',
  // 0030 set_date_of_birth / my_age_status
  'Sign in to set your date of birth.',
  'Sign in to check your age status.',
  'Enter your date of birth.',
  'Date of birth cannot be in the future.',
  'Date of birth must be after 1900.',
  'A minor account cannot declare an adult date of birth.',
  'Profile not found.',
])

function handleError(error) {
  if (USER_ERRORS.has(error?.message)) throw error
  throw new Error('Something went wrong. Please try again.')
}

async function withErrorMapping(fn) {
  try { return await fn() } catch (e) { handleError(e) }
}

// snake_case → camelCase, matching the app's flatten conventions (songs.js).
function flattenConsent(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    publicSharingApproved: row.public_sharing_approved,
    publicSharingApprovedAt: row.public_sharing_approved_at,
    guardianName: row.guardian_name,
    guardianEmail: row.guardian_email,
    consentText: row.consent_text,
    consentedAt: row.consented_at,
    revokedAt: row.revoked_at,
    archivedAt: row.archived_at,
  }
}

/**
 * Latest consent row for the user (created_at desc, limit 1) or null when
 * none exists. The row's status tells the caller whether consent is 'active'
 * (vs older revoked/archived records). RLS self-select only.
 */
export function getConsentStatus(userId) {
  return withErrorMapping(async () => {
    const { data, error } = await supabase
      .from('guardian_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return flattenConsent(data)
  })
}

/**
 * OPEN a consent request on the caller's own account (RPC only).
 *
 * This does not grant consent. Since 0031 the row is created 'pending' and the
 * account stays locked until the GUARDIAN clicks the emailed link — the server
 * owns that transition, so `record` would have been a lie. It therefore calls
 * `request_guardian_consent`, not 0031's deprecated `record_guardian_consent`
 * alias, which is kept only so pre-0031 bundles keep working.
 *
 * The exact consent text the guardian will see is stored verbatim (scenario 3).
 * Returns the new pending row id. Follow it with sendGuardianConsentEmail().
 */
export function requestGuardianConsent({ userId, guardianName, guardianEmail, consentText }) {
  return withErrorMapping(async () => {
    const { data, error } = await supabase.rpc('request_guardian_consent', {
      p_user_id: userId,
      p_guardian_name: guardianName,
      p_guardian_email: guardianEmail,
      p_consent_text: consentText,
    })
    if (error) throw error
    return data
  })
}

/**
 * Ask the send-guardian-consent edge function to mail the guardian the
 * one-shot confirm/revoke link for the caller's open request.
 *
 * The function reads the pending row itself and derives both links from
 * SITE_URL + the row's 128-bit revocation_token, so the only thing the browser
 * sends is the session bearer. verify_jwt is on, so the function authenticates
 * as the minor and re-checks that the row is theirs.
 *
 * NEVER throws for a delivery failure: a mail that did not go out is a normal
 * outcome the UI has to be able to state honestly, not an exception. Returns
 * one of:
 *   'sent'            — Resend accepted the message
 *   'already_active'  — consent was confirmed while this page was open
 *   'no_open_request' — no pending row to send for (stale page)
 *   'unavailable'     — the call could not complete (offline, 5xx, bad config)
 */
export async function sendGuardianConsentEmail() {
  let result
  try {
    result = await supabase.functions.invoke('send-guardian-consent', { body: {} })
  } catch {
    return 'unavailable'
  }
  if (result.error) return 'unavailable'
  const status = result.data?.status
  return status === 'sent' || status === 'already_active' || status === 'no_open_request'
    ? status
    : 'unavailable'
}

/**
 * Mark public sharing as guardian-approved on the caller's ACTIVE consent
 * (RPC only, scenario 4). Void on success — publishing becomes allowed.
 */
export function approvePublicSharing(userId) {
  return withErrorMapping(async () => {
    const { error } = await supabase.rpc('approve_guardian_public_sharing', {
      p_user_id: userId,
    })
    if (error) throw error
  })
}

/**
 * The caller's own age status (RPC public.my_age_status, 0030). Returns
 * { dobKnown, isMinor } — two booleans and never the date itself, because the
 * birth date is not client-readable by design (0017 lines 37-38, 68-70).
 *
 * Fail-closed reading, which is the whole point: dobKnown false means UNKNOWN,
 * never "adult". A missing profile row comes back as { false, false } too, so an
 * account that has not finished onboarding is never mistaken for a grown-up.
 * Callers must treat a rejected read as dobKnown: false — see
 * RequireGuardianConsent in src/components/auth/AuthGuards.jsx.
 */
export function getAgeStatus() {
  return withErrorMapping(async () => {
    const { data, error } = await supabase.rpc('my_age_status')
    if (error) throw error
    // PostgREST returns a single-row function as a one-element array.
    const row = Array.isArray(data) ? data[0] : data
    return {
      dobKnown: Boolean(row?.dob_known),
      isMinor: Boolean(row?.is_minor),
    }
  })
}

/**
 * Declare (or correct) the caller's date of birth — the ONLY write path
 * (RPC public.set_date_of_birth, 0030). The direct column grant 0017 shipped
 * is revoked, so a bypass is not possible even by hand: the RPC validates the
 * value, refuses a minor re-declaring themselves as an adult, and lets the
 * profiles_minor_flag trigger recompute is_minor from whatever date lands.
 *
 * `date` is an ISO 'YYYY-MM-DD' string (what <input type="date"> gives us).
 * Void on success — re-read getAgeStatus() to see the resulting state.
 */
export function setDateOfBirth(date) {
  return withErrorMapping(async () => {
    const { error } = await supabase.rpc('set_date_of_birth', {
      p_date_of_birth: date,
    })
    if (error) throw error
  })
}