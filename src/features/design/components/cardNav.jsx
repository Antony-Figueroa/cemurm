/* eslint-disable react/prop-types */
// cardNav.jsx — ported from the reference source (reactbits
// `src/content/Components/CardNav/CardNav.jsx`, with its `CardNav.css` ported
// into cardNav.css — see that file's header for why it is not reference.css).
//
// WHAT IT IS: a navigation bar, not the card deck that used to carry this name
// in blocks.jsx — a hamburger button, a 60px bar with the logo centred and the
// CTA at the right, and a GSAP timeline that opens the bar to a measured
// height while three link cards rise into place.
//
// PRESERVED EXACTLY, because these are the whole component:
//   * `calculateHeight` — on mobile it forces `.card-nav-content` open
//     (visibility / pointer-events / position / height), reads `scrollHeight`,
//     restores the four styles it touched and returns top bar + content +
//     padding; anywhere else it returns the fixed 260.
//   * the timeline — `gsap.set(nav, { height: 60, overflow: 'hidden' })` and
//     `gsap.set(cards, { y: 50, opacity: 0 })`, then a paused timeline that
//     tweens the height over 0.4s on the `ease` prop and the cards in at
//     `-=0.1` with `stagger: 0.08`.
//   * `toggleMenu` — `play(0)` on open; on close, `eventCallback(
//     'onReverseComplete', …)` clears `isExpanded` first and only then
//     `reverse()`, so the collapsed state lands when the bar has closed.
//   * the resize handler kills and rebuilds the timeline, keeping
//     `progress(1)` while expanded so the measured height follows the viewport.
//   * the hamburger keeps `role="button"`, `aria-label`, `aria-expanded`,
//     `tabIndex` and its Enter/Space handler; `card-nav-content` keeps
//     `aria-hidden={!isExpanded}`; the cards are `items.slice(0, 3)` — three is
//     the contract, not a coincidence of the demo data.
//
// TWO DEVIATIONS, both forced, no others:
//   * COLOUR (rule 01a). Upstream fills `baseColor`, `menuColor`,
//     `buttonBgColor`, `buttonTextColor` and each item's `bgColor` /
//     `textColor` with colour literals. Rule 01a of
//     scripts/check-visual-contract.sh is enforcing over `src/`, so every one
//     of them takes a TOKEN NAME instead, resolved at runtime by
//     `useTokenColors` (colors.js). The defaults keep upstream's read: light
//     bar (`text`) with a dark hamburger and a dark CTA (`base`), dark CTA
//     label (`text`). A token the probe cannot resolve falls back to
//     `surface`, which is colors.js's own fallback; the first frame paints
//     late rather than wrong.
//   * ICON. `GoArrowUpRight` comes from react-icons, which is not a
//     dependency here — upstream's own file says to use your own icon import
//     when react-icons is unavailable. The arrow is `ArrowUpRight01Icon`
//     (Hugeicons) at size 16, which is upstream's 1em at a 16px font, keeping
//     the `nav-card-link-icon` class and the `aria-hidden`.
//
// THREE MORE, added by the CEMURM app nav (AppLayout). Each is an OPT-IN prop
// defaulting to the upstream behaviour, so the /design demo renders exactly as
// before and its characterisation tests keep passing:
//   * `renderLink` — replaces the `<a href>`. Upstream's anchor navigates by
//     full page load; inside a react-router app that tears down the SPA and
//     drops the Supabase session, so the app passes a `NavLink` renderer.
//   * `footerSlot` — a fourth card, full width, below the three. It is how the
//     user block (display name, organisation, Log Out) survives the redesign:
//     the component has three fixed slots — hamburger, logo, CTA — and those
//     are all spoken for. Rendering `null` (the default) leaves the card out
//     entirely, so the demo is unaffected.
//   * `ctaLabel` — upstream hardcodes the button text "Get Started". Passing
//     `null` removes the button; the app nav has no such call to action.
//
// The footer card is deliberately NOT a footer: `.nav-user-strip` in
// reference.css shares `.nav-card`'s padding, gap and radius and takes only
// `flex: 1 1 100%`, so it reads as a fourth card in the same grid rather than a
// full-bleed bar bolted underneath.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTokenColors } from './colors.js'
// cardNav.css, NOT reference.css. The CardNav stylesheet was split out of the
// gallery's reference.css precisely because AppLayout now renders this eagerly —
// importing the whole gallery sheet cost every app user ~29 kB. See the header
// of cardNav.css.
import './cardNav.css'

export function CardNav({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = 'text',
  menuColor = 'base',
  buttonBgColor = 'base',
  buttonTextColor = 'text',
  // --- CEMURM app-nav additions. See the header comment for why each exists.
  // All three default to upstream's behaviour, so /design is unchanged.
  renderLink,
  footerSlot = null,
  footerBgColor = 'base',
  footerTextColor = 'text',
  ctaLabel = 'Get Started',
  // Separate curve for closing. Reversing an `out` ease turns it into an `in`
  // ease, which lands hard; this settles in both directions. See closeMenu.
  closeEase = 'power2.inOut',
  // Changes to this value close the menu. The caller owns the router, so this
  // stays a plain prop instead of the component importing one.
  routeKey = null,
}) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const navRef = useRef(null)
  const cardsRef = useRef([])
  const tlRef = useRef(null)

  // Token names in, resolved colours out — empty on the first pass, so the bar
  // renders before it paints (the ordering colors.js is written for). `|| []`
  // lives here and only here: the render below keeps the reference's own
  // expression for the cards.
  const list = items || []
  const colors = useTokenColors({
    base: baseColor,
    menu: menuColor,
    buttonBg: buttonBgColor,
    buttonText: buttonTextColor,
    bg0: list[0]?.bgColor,
    text0: list[0]?.textColor,
    bg1: list[1]?.bgColor,
    text1: list[1]?.textColor,
    bg2: list[2]?.bgColor,
    text2: list[2]?.textColor,
    // The footer card is a FOURTH card, so it needs its own pair — reusing
    // bg0 would make it identical to Play. Defaults are `base` with `text`
    // ink: 17.06:1, measured, and the darkest fill of the four so the strip
    // recedes under the three areas above it.
    footerBg: footerBgColor,
    footerText: footerTextColor,
  })

  const calculateHeight = () => {
    const navEl = navRef.current
    if (!navEl) return 260

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    // Mobile always measures. Desktop measures ONLY when the footer strip is
    // present, because the reference's fixed 260 was sized for three cards and
    // nothing else: the strip adds a second row, and the tallest card decides
    // the rest. Measured on the app nav at 258/260 — 2px of headroom, which
    // clipped every card the moment a link was added. /design keeps the fixed
    // 260, so the reference demo renders exactly as it always has.
    if (isMobile || footerSlot) {
      const contentEl = navEl.querySelector('.card-nav-content')
      if (contentEl) {
        const wasVisible = contentEl.style.visibility
        const wasPointerEvents = contentEl.style.pointerEvents
        const wasPosition = contentEl.style.position
        const wasHeight = contentEl.style.height

        contentEl.style.visibility = 'visible'
        contentEl.style.pointerEvents = 'auto'
        contentEl.style.position = 'static'
        contentEl.style.height = 'auto'

        // Force the reflow the measurement needs before the styles are read.
        contentEl.offsetHeight

        const topBar = 60
        const padding = 16
        const contentHeight = contentEl.scrollHeight

        contentEl.style.visibility = wasVisible
        contentEl.style.pointerEvents = wasPointerEvents
        contentEl.style.position = wasPosition
        contentEl.style.height = wasHeight

        return topBar + contentHeight + padding
      }
    }
    return 260
  }

  const createTimeline = () => {
    const navEl = navRef.current
    if (!navEl) return null

    // WHY THIS IS A FUNCTION, NOT THE ARRAY ITSELF. `cardsRef.current` is
    // assigned by React across the render that mounts the three cards and the
    // one that mounts the footer strip, so it is SPARSE while the first timeline
    // is built — index 3 may still be undefined. Passing the array captured
    // that hole permanently: GSAP tweened only the three cards, and the strip
    // never moved on open or close. A function target defers the read to when
    // the tween actually starts, by which point every ref is populated.
    const cards = () => cardsRef.current.filter(Boolean)

    gsap.set(navEl, { height: 60, overflow: 'hidden' })
    gsap.set(cards(), { y: 50, opacity: 0 })

    const tl = gsap.timeline({ paused: true })

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    })

    tl.to(cards(), { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1')

    return tl
  }

  useLayoutEffect(() => {
    const tl = createTimeline()
    tlRef.current = tl

    return () => {
      tl?.kill()
      tlRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items])

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return

      if (isExpanded) {
        const newHeight = calculateHeight()
        gsap.set(navRef.current, { height: newHeight })

        tlRef.current.kill()
        const newTl = createTimeline()
        if (newTl) {
          newTl.progress(1)
          tlRef.current = newTl
        }
      } else {
        tlRef.current.kill()
        const newTl = createTimeline()
        if (newTl) {
          tlRef.current = newTl
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded])

  // The close half of the toggle, on its own so that closing on a route change
// and closing on an outside click run the SAME animation rather than a second,
// subtly different one. `power2.inOut` is deliberate: `circ.out` reversed is
// `circ.in`, which accelerates and stamps the bar shut.
const closeMenu = () => {
    const tl = tlRef.current
    if (!tl || !isExpanded) return
    setIsHamburgerOpen(false)
    tl.getChildren().forEach(child => child.vars && (child.vars.ease = closeEase))
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false))
    tl.reverse()
  }

  const toggleMenu = () => {
    const tl = tlRef.current
    if (!tl) return
    if (!isExpanded) {
      setIsHamburgerOpen(true)
      setIsExpanded(true)
      tl.play(0)
    } else {
      closeMenu()
    }
  }

  // CLOSE WHEN THE ROUTE CHANGES. An SPA navigation does not reload the page,
  // so nothing would otherwise dismiss the panel: open the menu, tap a card
  // link, and the new page renders with the nav still covering it. `routeKey`
  // is supplied by the caller (AppLayout passes the pathname) rather than read
  // from a router context here, because this component is deliberately
  // router-agnostic — it lives under features/design and /design must keep
  // working without one.
  const lastRouteKey = useRef(routeKey)
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return
    lastRouteKey.current = routeKey
    closeMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el
  }

  return (
    <div className={`card-nav-container ${className}`}>
      {/* CLICK OUTSIDE TO CLOSE. A transparent full-viewport layer, only while
          expanded, sitting UNDER the bar (z-index 0 against the bar's own 2) so
          it catches every click that is not the panel itself without covering
          it. It is not a scrim — it paints nothing — so the page stays readable
          underneath; it exists purely to give "click away" a target. */}
      {isExpanded && (
        <div
          className="card-nav-dismiss"
          onClick={toggleMenu}
          aria-hidden="true"
        />
      )}
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: colors.base }}>
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleMenu()
              }
            }}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            tabIndex={0}
            style={{ color: colors.menu }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">
            {/* `logo` takes a src string (upstream, and what /design passes) or a
                node. The CEMURM app passes a text brand instead: the wordmark
                SVG bakes a hardcoded dark ink into its letters, which is ink
                for a LIGHT background and goes near-invisible on this dark
                bar. The string form is untouched, so /design still renders its
                image. */}
            {typeof logo === 'string' ? (
              <img src={logo} alt={logoAlt} className="logo" />
            ) : (
              logo
            )}
          </div>

          {ctaLabel && (
            <button
              type="button"
              className="card-nav-cta-button"
              style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            >
              {ctaLabel}
            </button>
          )}
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {/* The three area cards get their OWN flex row. They used to be direct
              children of `.card-nav-content` alongside the user strip; with the
              strip on `flex: 1 1 100%` the summed basis filled the row, free
              space was zero, and all three collapsed to width 0. A separate row
              removes the competition. See `.card-nav-cards` in cardNav.css. */}
          <div className="card-nav-cards">
            {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: colors[`bg${idx}`], color: colors[`text${idx}`] }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) =>
                  renderLink ? (
                    renderLink(lnk, `${item.label}-${i}`)
                  ) : (
                    <a
                      key={`${lnk.label}-${i}`}
                      className="nav-card-link"
                      href={lnk.href}
                      aria-label={lnk.ariaLabel}
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        size={16}
                        className="nav-card-link-icon"
                        aria-hidden="true"
                      />
                      {lnk.label}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
          </div>
          {footerSlot && (
            <div
              className="nav-card nav-user-strip"
              /* THE STRIP ANIMATES WITH THE CARDS. Without this ref the strip
                 was never in `cardsRef`, so GSAP neither tweened it in on open
                 nor out on close — it simply stayed put while the three cards
                 above it rose and fell, which is why it looked glued to the
                 bottom. Index 3 puts it last in the array, so the existing
                 stagger of 0.08 carries it in after the three cards. */
              ref={setCardRef(3)}
              style={{ backgroundColor: colors.footerBg, color: colors.footerText }}
            >
              {footerSlot}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}

export default CardNav
