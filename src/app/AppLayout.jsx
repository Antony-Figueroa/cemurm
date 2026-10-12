import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
    bgColor: 'elevated',
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
    bgColor: 'hover',
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
  const [feedbackOpen, setFeedbackOpen] = useState(false)
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
  const renderNavLink = (lnk) => (
    <NavLink
      key={lnk.href}
      to={lnk.href}
      end={lnk.href === '/' || lnk.href === '/settings'}
      className="nav-card-link"
      aria-label={lnk.ariaLabel}
    >
      <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} className="nav-card-link-icon" aria-hidden="true" />
      {lnk.label}
      {lnk.href === '/notifications' && user && <UnreadBadge />}
    </NavLink>
  )

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

      <button type="button" className="nav-user-button" onClick={() => setFeedbackOpen(true)}>
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
          whole point. The space the CLOSED bar occupies is reserved here as a
          spacer, and `<main>` keeps its own top padding, so nothing sits under
          the bar at rest either. */}
      <header className="h-[calc(1rem+60px)] shrink-0" aria-hidden="true" />

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
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
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