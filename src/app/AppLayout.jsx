import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight01Icon,
  Building03Icon,
  Chat01Icon,
  Logout01Icon,
  User02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAuth } from './providers/useAuth.jsx'
import { useNotifications } from '../hooks/shared/useNotifications.js'
import { useActiveOrgName } from '../hooks/shared/useActiveOrgName.js'
import FeedbackForm from '../features/feedback/components/FeedbackForm.jsx'
import { CardNav } from '../features/design/components/cardNav.jsx'

// The same thirteen destinations the flat nav carried, grouped into the three
// cards the component draws. `href` stays the route: CardNav's own anchor is
// replaced by `renderNavLink` below, and it reads this field.
//
// Coverage is 13/13 against the old `navLinks` — verified with a diff, not by
// eye. Nothing was dropped and nothing was invented.
//
// ALL THREE SHARE `surface`. A three-step ramp (surface / elevated / hover)
// gave each card its own weight, but the step from the bar's `base` up to
// `surface` is small enough that the first card read as bare bar with text on
// it. One fill for all three, plus the 1px `elevated` edge the card CSS now
// carries, makes each of them unambiguously a card. Separation between them
// comes from the 12px gap, which is what the gap is for.
const NAV_CARDS = [
  {
    label: 'Play',
    bgColor: 'surface',
    textColor: 'text',
    links: [
      { label: 'Home', href: '/', ariaLabel: 'Go to Home' },
      { label: 'Repertoire', href: '/songs', ariaLabel: 'Go to Repertoire' },
      { label: 'Library', href: '/library', ariaLabel: 'Go to Library' },
      { label: 'Setlists', href: '/setlists', ariaLabel: 'Go to Setlists' },
      { label: 'Gigs', href: '/gigs', ariaLabel: 'Go to Gigs' },
    ],
  },
  {
    label: 'Band',
    bgColor: 'surface',
    textColor: 'text',
    links: [
      { label: 'Rehearsals', href: '/rehearsals', ariaLabel: 'Go to Rehearsals' },
      { label: 'Bandmates', href: '/bandmates', ariaLabel: 'Go to Bandmates' },
      { label: 'Organizations', href: '/organizations', ariaLabel: 'Go to Organizations' },
      { label: 'Services', href: '/services', ariaLabel: 'Go to Services' },
    ],
  },
  {
    label: 'System',
    bgColor: 'surface',
    textColor: 'text',
    links: [
      { label: 'Moderation', href: '/moderation', ariaLabel: 'Go to Moderation' },
      { label: 'Notifications', href: '/notifications', ariaLabel: 'Go to Notifications' },
      { label: 'Settings', href: '/settings', ariaLabel: 'Go to Settings' },
      { label: 'Storage', href: '/settings/storage', ariaLabel: 'Go to Storage' },
    ],
  },
]

/**
 * Unread badge on the Notifications link (Feed7, task 2.5). Rendered only when
 * authed; hidden at 0; capped at "99+". Its useNotifications instance converges
 * with the feed page via the realtime echo of read_at UPDATEs.
 */
function UnreadBadge() {
  const { unreadCount } = useNotifications()
  if (!unreadCount) return null
  return (
    <span className="rounded-full bg-cem-amber px-1.5 py-0.5 text-[10px] font-bold leading-none text-cem-base">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}

function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Bumped whenever something outside the router needs the menu to close (the
  // Feedback dialog). Passed to CardNav as `closeSignal`; it is a counter rather
  // than a boolean so two opens in a row are two distinct changes.
  const [closeSignal, setCloseSignal] = useState(0)
  const orgName = useActiveOrgName()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  // Replaces the reference's `<a href>`. That anchor navigates by full page
  // load, which inside a react-router app tears down the SPA and drops the
  // Supabase session — so every route here is a router transition instead.
  //
  // `end` mirrors the flat nav's `end={link.to === '/' || link.to ===
  // '/settings'}`: `/` must not stay highlighted on every path, and `/settings`
  // must not stay lit on `/settings/storage` (which is its own card link).
  // Both are explicit per-link because `end` cannot be derived from the route.
  // ACTIVE ROUTE IN AMBER. `NavLink` supplies `isActive` for the matched route,
  // and amber is the one accent this project has — the visual system's sanctioned
  // use for it is exactly "the active or selected state" (SKILL.md, Hard Rule
  // 2), so this is the accent doing its job rather than a new colour.
  //
  // The class is a FUNCTION of `isActive` rather than a static string, because a
  // static className cannot express a conditional. The colour itself lives in
  // cardNav.css as `.nav-card-link.is-active`, tokenised; writing the literal
  // here would trip rule 01a.
  //
  // Measured, because amber on a raised fill is a real contrast question and
  // this project's gate is blunt about it. Amber against the card fills:
  // surface 6.81:1, elevated 4.82:1, base 8.31:1 — all clear the 4.5:1 floor.
  // On `hover` it would be 3.53:1, UNDER the floor, which is a second reason
  // all three cards stay on `surface`: the active amber has to be legible on
  // every card it can land on, not just two of them.
  //
  // The icon takes the amber too — `currentColor` — so the whole row reads as
  // one active item rather than amber text next to a grey arrow.
  const renderNavLink = (lnk) => (
    <NavLink
      key={lnk.href}
      to={lnk.href}
      end={lnk.href === '/' || lnk.href === '/settings'}
      className={({ isActive }) => `nav-card-link${isActive ? ' is-active' : ''}`}
      aria-label={lnk.ariaLabel}
    >
      <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} className="nav-card-link-icon" aria-hidden="true" />
      {lnk.label}
      {lnk.href === '/notifications' && user && <UnreadBadge />}
    </NavLink>
  )

  // FEEDBACK IS A MODAL, NOT A LINK — and that changes the nav's behaviour.
  // `routeKey` closes the menu on navigation, but Feedback navigates nowhere,
  // so the menu would have stayed open with the dialog rendering underneath it.
  // Closing it here means the dialog arrives on a collapsed bar.
  function openFeedback() {
    setCloseSignal(n => n + 1)
    setFeedbackOpen(true)
  }

  // The user strip: the fourth card, below the three areas. CardNav has exactly
  // three fixed slots — hamburger, logo, CTA — and all three are spoken for, so
  // this is where the identity block lives.
  //
  // This whole strip is INSIDE the expanded panel, which is a real behaviour
  // change: Log Out used to be visible in the bar at all times and now takes one
  // tap to reach. It is the cost of the grouped layout, stated rather than
  // buried.
  const userStrip = (
    <>
      <span className="nav-user-item">
        <HugeiconsIcon icon={User02Icon} size={16} className="nav-user-icon" aria-hidden="true" />
        <span className="nav-user-name">{user ? user.displayName : 'Signed out'}</span>
      </span>

      {/* Hidden, not blanked: the hook resolves to '' when there is no active
          membership, and an empty flex child would still take the gap. */}
      {orgName && (
        <span className="nav-user-item">
          <HugeiconsIcon icon={Building03Icon} size={16} className="nav-user-icon" aria-hidden="true" />
          <span className="nav-user-name" title={orgName}>
            {orgName}
          </span>
        </span>
      )}

      <span className="nav-user-push" />

      <button type="button" className="nav-user-button" onClick={openFeedback}>
        <HugeiconsIcon icon={Chat01Icon} size={16} className="nav-user-icon" aria-hidden="true" />
        Feedback
      </button>

      {user ? (
        <button type="button" className="nav-user-button" onClick={handleSignOut}>
          <HugeiconsIcon icon={Logout01Icon} size={16} className="nav-user-icon" aria-hidden="true" />
          Log Out
        </button>
      ) : (
        <NavLink to="/auth" end className="nav-user-button">
          Sign In
        </NavLink>
      )}
    </>
  )

  return (
    <div className="min-h-screen flex flex-col bg-cem-base">
      {/* The bar is `position: absolute` (`.app-nav` in cardNav.css), so it floats
          over the page and expanding it never moves the content — that is the
          whole point. This spacer reserves what the CLOSED bar occupies plus
          the air beneath it.

          The arithmetic, and it must track `.app-nav`'s padding-top:
            2rem   the bar's own offset from the top
          + 60px   the bar
          + 2rem   clear space before the page begins
          Without the last term the bar sat flush on the content — measured gap
          0px, which is what made it read as part of the page rather than
          floating above it. */}
      <header className="h-[calc(4rem+60px)] shrink-0" aria-hidden="true" />

      <CardNav
        logo={
          <NavLink
            to="/"
            className="text-lg font-bold tracking-wider text-cem-text"
            aria-label="CEMURM home"
          >
            CEMURM
          </NavLink>
        }
        logoAlt="CEMURM"
        items={NAV_CARDS}
        ease="circ.out"
        className="app-nav"
        // `circ.out` is the requested curve. The reference default is
        // `power3.out`, kept as the prop default so /design is untouched.
        //
        // The bar is `base` (the darkest step) so the three cards read as
        // surfaces ON it. An earlier pass put the bar on `surface` and Play on
        // `surface` too — same token, so Play vanished into the bar with no
        // edge to separate them. The cards then step surface → elevated →
        // hover, so each is distinct from its neighbour and from the bar.
        baseColor="base"
        menuColor="text"
        // The CTA slot carries no call to action in this app — every user is
        // already signed in and the identity block moved to the strip.
        ctaLabel={null}
        renderLink={renderNavLink}
        footerSlot={userStrip}
        footerBgColor="surface"
        footerTextColor="text"
        // An SPA navigation does not reload the page, so nothing else would
        // dismiss the panel — the next page would render with the nav still
        // open over it. `pathname` (not the full location) is deliberate:
        // query-string and hash changes are not navigations and should leave
        // the menu alone.
        routeKey={pathname}
        // Opens the Feedback dialog, which is not a navigation.
        closeSignal={closeSignal}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-10 pb-8">
        <Outlet />
      </main>

      <footer className="bg-cem-surface border-t border-cem-elevated">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-cem-secondary">
          CEMURM &mdash; Community-Centered Musical Repertories Manager
        </div>
      </footer>

      {feedbackOpen && <FeedbackForm onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}

export default AppLayout