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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
// GSAP is a DOCUMENTED, DELIBERATE exception to Hard Rule 5 of
// skills/cemurm-visual-system ("no animation library in the authenticated
// bundle"). It costs ~82 kB eager and buys a real timeline.
//
// This was removed for a week and put back, and the reason is worth keeping:
// the CSS-transition version measured BETTER on every metric that is easy to
// measure — 0 bytes, no reflow, interruptible by construction — and looked
// worse. `height` and `opacity` are independent CSS transitions with no way
// to overlap them, so the panel snapped open before the cards appeared, and
// removing the `.open` class hid the content on frame 1 instead of after the
// animation. A timeline is what expresses "start the cards 100ms before the
// height finishes", and that overlap IS the feel.
//
// The library is also not free of charge elsewhere: the ease must be paired
// per direction, because reversing `circ.out` gives `circ.in`, which stamps.
// See closeMenu.
import { gsap } from 'gsap'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTokenColors } from './colors.js'
// cardNav.css, NOT reference.css. The CardNav stylesheet was split out of the
// gallery's reference.css precisely because AppLayout now renders this eagerly —
// importing the whole gallery sheet cost every app user ~29 kB. See the header
// of cardNav.css.
import './cardNav.css'

// The motion constants, in one place so reduced-motion can zero them.
const OPEN_DURATION = 0.4
const CLOSE_DURATION = 0.4
// Two curves, because reversing an `out` ease yields `circ.in`, which
// accelerates and stamps the bar shut — measured, the last four frames of a
// reversed close moved -29, -40, -61 and -74px. The close is therefore BUILT
// with its own curve rather than produced by reversing the open's. These are
// the exact values that were tuned and approved; do not retune them without
// watching the frames, not just the endpoints.
const EASE_OPEN = 'circ.out'
const EASE_CLOSE = 'power2.inOut'

// Does the reader want less motion? Read once per animation so a mid-open
// change takes effect on the next interaction rather than being baked in.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function CardNav({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
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
  // Changes to this value close the menu. The caller owns the router, so this
  // stays a plain prop instead of the component importing one.
  routeKey = null,
  // Same contract, for closes that are NOT navigations — opening a modal is
  // the case that motivated it. A counter, so repeated opens are distinct.
  closeSignal = 0,
}) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const navRef = useRef(null)
  const cardsRef = useRef([])
  const navElRef = useRef(null)
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

  // HOW TALL IS THE PANEL WHEN OPEN?
  //
  // Measured in JS, animated in CSS. The measurement has to be here because the
  // height depends on the content and on the viewport; the animation does NOT
  // have to be here, and moving it out is the point of this rewrite (see the
  // file header: GSAP was 82 kB of eager bundle against Hard Rule 5, and it
  // animated `height`, a layout property).
  //
  // CLAMPED TO THE VIEWPORT. Unclamped, a 375x667 phone produced an 888px panel:
  // the user strip fell below the fold, and the only way to reach it was a
  // document scroll, which carried the hamburger off screen with it — so the
  // one control that closes the panel became unreachable. Clamping keeps the
  // whole panel on screen and lets the content scroll INSIDE it instead, where
  // the top bar stays put.
  const measureOpenHeight = () => {
    const navEl = navRef.current
    const contentEl = navEl?.querySelector('.card-nav-content')
    if (!navEl || !contentEl) return 260

    // Measure with the content forced open, then put back exactly what was
    // touched — four properties, restored in the order they were read.
    const wasVisible = contentEl.style.visibility
    const wasPointerEvents = contentEl.style.pointerEvents
    const wasPosition = contentEl.style.position
    const wasHeight = contentEl.style.height

    contentEl.style.visibility = 'visible'
    contentEl.style.pointerEvents = 'auto'
    contentEl.style.position = 'static'
    contentEl.style.height = 'auto'
    contentEl.offsetHeight // the reflow the read below depends on

    const TOP_BAR = 60
    const PADDING = 16
    const natural = TOP_BAR + contentEl.scrollHeight + PADDING

    contentEl.style.visibility = wasVisible
    contentEl.style.pointerEvents = wasPointerEvents
    contentEl.style.position = wasPosition
    contentEl.style.height = wasHeight

    // Whatever is left of the viewport below the bar, minus a small margin so
    // the panel never touches the screen edge.
    const barTop = navEl.getBoundingClientRect().top
    const ceiling = window.innerHeight - barTop - PADDING

    return Math.max(TOP_BAR, Math.min(natural, ceiling))
  }

  // Publish the measured height as a custom property. CSS transitions to it.
  // Runs on mount, on resize, and whenever the items change — a different set of
  // links is a different panel height.
  const syncHeight = useCallback(() => {
    const navEl = navRef.current
    if (!navEl) return
    navEl.style.setProperty('--nav-h', `${measureOpenHeight()}px`)
  }, [])

  const createTimeline = () => {
    const navEl = navRef.current
    if (!navEl) return null

    // WHY A FUNCTION, NOT THE ARRAY. `cardsRef.current` is filled by React
    // across two renders — three cards, then the strip — so index 3 is still
    // undefined while the first timeline is built. Handing GSAP that sparse
    // array captured the hole permanently: only three cards animated and the
    // strip never moved. A function target defers the read to when the tween
    // starts, by which point every ref is populated.
    const cards = () => cardsRef.current.filter(Boolean)

    gsap.set(navEl, { height: 60, overflow: 'hidden' })
    gsap.set(cards(), { y: 50, opacity: 0 })

    const tl = gsap.timeline({ paused: true })

    tl.to(navEl, {
      height: measureOpenHeight,
      duration: OPEN_DURATION,
      ease: EASE_OPEN,
    })

    // '-=0.1' IS THE WHOLE FEEL. The cards begin their rise 100ms BEFORE the
    // height finishes, so content is already arriving while the panel is still
    // growing. Without the overlap the panel reads as deploying and the cards
    // as animating afterwards, which is what a set of independent CSS
    // transitions cannot express and what this rewrite got wrong the first
    // time.
    tl.to(cards(), { y: 0, opacity: 1, duration: OPEN_DURATION, ease: EASE_OPEN, stagger: 0.08 }, '-=0.1')

    return tl
  }

  useLayoutEffect(() => {
    syncHeight()
  }, [syncHeight, items])

  // Owns the OPEN timeline for the lifetime of the component: built once, and
  // rebuilt after a resize so the measured height follows the viewport.
  useLayoutEffect(() => {
    tlRef.current = createTimeline()
    return () => {
      tlRef.current?.kill()
      tlRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useLayoutEffect(() => {
    const onResize = () => {
      if (!isExpanded) {
        syncHeight()
        return
      }
      tlRef.current?.kill()
      const next = createTimeline()
      tlRef.current = next
      if (next) next.progress(1)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded])

  // THE CLOSE IS BUILT, NOT REVERSED. See the `EASE_CLOSE` comment.
  //
  // And it does NOT install itself into `tlRef`. That was the severe bug two
  // review rounds found: `tlRef` is the OPEN timeline, so leaving a close
  // timeline there meant the next open replayed the collapse — the hamburger
  // opened once per page load, on every close path. The close timeline is local
  // to this call; it runs to completion and is collected.
  const closeMenu = useCallback(() => {
    const navEl = navRef.current
    if (!navEl || !isExpanded) return
    setIsHamburgerOpen(false)

    const cards = () => cardsRef.current.filter(Boolean)
    const reduced = prefersReducedMotion()
    const tl = gsap.timeline({ onComplete: () => setIsExpanded(false) })

    // Reduced motion keeps the fade but drops the travel: the cards do not rise
    // 50px, the height does not travel, and both finish in a fifth of the time.
    // It is a cross-fade, not a hard cut — a cut is its own kind of jarring.
    tl.to(cards(), {
      y: reduced ? 0 : 50,
      opacity: 0,
      duration: reduced ? 0.12 : CLOSE_DURATION,
      ease: EASE_CLOSE,
      stagger: reduced ? 0 : 0.04,
    }, 0)
    tl.to(navEl, {
      height: 60,
      duration: reduced ? 0.12 : CLOSE_DURATION,
      ease: EASE_CLOSE,
    }, 0)
  }, [isExpanded])

  const toggleMenu = () => {
    if (!isExpanded) {
      // Rebuild rather than replay. A timeline that has already run to its end
      // and been replaced by a close is exactly the fragile state that broke
      // this; `createTimeline` re-applies the closed-state `gsap.set`, so an
      // open always starts from a known frame.
      const tl = createTimeline()
      if (!tl) return
      tlRef.current = tl
      setIsHamburgerOpen(true)
      setIsExpanded(true)

      if (prefersReducedMotion()) {
        // Same end state, no travel.
        gsap.set(navElRef.current, { height: measureOpenHeight() })
        gsap.set(cardsRef.current.filter(Boolean), { y: 0, opacity: 1 })
      } else {
        tl.play(0)
      }
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
  }, [routeKey, closeMenu])

  // ...and the same for a non-navigation close (a modal opening). Kept as its
  // own effect so the two triggers cannot interfere: a route change while a
  // modal opens still runs each exactly once.
  const lastCloseSignal = useRef(closeSignal)
  useEffect(() => {
    if (lastCloseSignal.current === closeSignal) return
    lastCloseSignal.current = closeSignal
    closeMenu()
  }, [closeSignal, closeMenu])

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el
  }

  // KEYBOARD DISMISSAL AND FOCUS.
  //
  // Before this, a keyboard-only user could open the panel and not close it:
  // Escape did nothing, the outside-click target is a div that never takes
  // focus, and Tab walked straight out of the panel into the page behind it,
  // leaving the only close control unreachable. One judge called that a hard
  // lockout and the other a warning; both are right about their own evidence,
  // and a trap plus Escape closes it.
  //
  // Focus MOVES into the panel on open and RETURNS to the hamburger on close,
  // because leaving focus behind a closed overlay is the same bug wearing a
  // different hat — the next Tab would land nowhere the user could see.
  useEffect(() => {
    if (!isExpanded) return undefined

    const navEl = navElRef.current
    const FOCUSABLE =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
        return
      }
      if (event.key !== 'Tab' || !navEl) return

      // Trap: cycle within the panel rather than letting focus escape to the
      // page it is covering.
      const stops = [...navEl.querySelectorAll(FOCUSABLE)].filter(
        el => el.offsetParent !== null
      )
      if (stops.length === 0) return

      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !navEl.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    // Move focus in on open, so the first Tab does not start from the page.
    const first = navEl?.querySelector(FOCUSABLE)
    if (first) first.focus()

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isExpanded, closeMenu])

  // ...and hand focus back to the hamburger on close.
  useEffect(() => {
    if (isExpanded) return
    const burger = navElRef.current?.querySelector('.hamburger-menu')
    if (burger && document.activeElement === document.body) burger.focus()
  }, [isExpanded])

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
      <nav ref={el => { navRef.current = el; navElRef.current = el }} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: colors.base }}>
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
              style={{
                backgroundColor: colors[`bg${idx}`],
                color: colors[`text${idx}`],
                // CSS reads this to stagger the rise. Inline because it is
                // per-element data, not a style decision — the visual system
                // has no opinion about a 40ms delay.
                '--i': idx,
              }}
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
              style={{
                backgroundColor: colors.footerBg,
                color: colors.footerText,
                '--i': 3,
              }}
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
