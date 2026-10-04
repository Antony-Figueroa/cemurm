/* eslint-disable react/prop-types -- the shape is one boolean (heroInView) and
   there are no propTypes anywhere in src/ (see FeedbackForm.jsx:1). */

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { landing } from '../../../content/landing.es.js'
import VideoBG from './VideoBG.jsx'
import MaskedHeading from './MaskedHeading.jsx'
import SpecularButton from './SpecularButton.jsx'
import ClickSpark from './ClickSpark.jsx'
import GlassIcon from './GlassIcon.jsx'
import DeviceFrame from './DeviceFrame.jsx'

// APPLE §14 — reduced motion. The video is the visitor's ambient media choice and is NOT
// killed by reduced motion. What IS killed is the synthetic parallax on the mockups and the
// rAF layers the parent would otherwise start, because those are the actual synthetic motion
// here. The headline reveal still cross-fades under reduced motion (a comprehension aid) but
// does not translate.

// The one non-user-triggered motion moment the page budgets. The hero's reveal is a response
// to the page becoming visible (the intro loader hands off a READY signal), not a loop; it
// cannot re-trigger and it is gone before the visitor can act on anything else. The video's
// own loop is ambient media, not a page motion moment.

// Amount of parallax translate on the mockup stack, in px. Small — the stack is three frames,
// and a big translate would push the outer frames off the section edge on a phone. This is the
// Apple §9 rubber-band discipline: soft movement, soft boundaries, no hard throw.
const PARALLAX = 14

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

const PRESS = 'transition-transform duration-150 ease-out active:scale-[0.97]'

// THE HEADLINE SCALE. Display size, clamped so a 375px phone does not overflow a 72px line.
// Negative tracking (Apple §15) because it is display text. The type scale is the same
// discipline RevealText and MaskedHeading already apply.
//
// THREE UTILITIES, NOT ONE ARBITRARY PROPERTY. Writing `font-size`, `leading-tight` and the
// tracking inside a single `[..._...]` token asks Tailwind for one CSS declaration whose value
// is `clamp(...) leading-tight tracking-[-0.02em]`, which is not valid CSS, so Tailwind emits
// no rule at all and the h1 silently inherits body size. The length type hint is required:
// `text-` accepts both a colour and a length, and without `length:` the value is ambiguous.
// Verified against the built stylesheet, not assumed: `grep -c 'clamp('` on the emitted CSS.
const HEADLINE =
  'text-[length:clamp(2rem,6vw,4.5rem)] leading-tight tracking-[-0.02em]'

// THE SPARK. Mounted only where a real pointer exists and motion is not reduced, same gate as
// the repo's existing ClickSpark call sites. Spark color is cem.amber resolved from the token
// class, never a literal.
function canSpark() {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches !== false &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true
  )
}

// The mockup stack, with parallax on scroll. Each frame is a DeviceFrame around one of the
// three Stage Bus views, angled slightly so the stack reads as three objects in space rather
// than three flat cards. The active frame lifts (z-10) and the others recede (z-0) so the
// focused view is never the most occluded one. On scroll the whole stack translates y by a
// small amount proportional to scroll position, capped so the outer frames do not leave the
// section edge.
function MockupStack({ reduce }) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (reduce) return undefined
    const onScroll = () => {
      const vh = window.innerHeight
      const scrolled = Math.min(window.scrollY, vh * 0.6)
      setOffset((scrolled / vh) * PARALLAX)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduce])

  return (
    <div className="relative mx-auto mt-16 max-w-7xl md:mt-24">
      {/* Eyebrow — moved here from the hero copy stack, sitting directly above the frames
          it names. §15 tracking, the other direction: this stays POSITIVE at 0.18em because
          it is 12px uppercase. Apple asks for negative tracking on display text and slightly
          positive on small text, and the page needs both, so the scale keeps both rather than
          flattening to one value. */}
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
        {landing.hero.eyebrow}
      </p>

      {/* The three frames, stacked with opposing tilts so the outer edges recede (a concave
          fan embracing the active frame). Perspective is on the parent; the crop is on this
          container; the active frame lifts with z-10 so it is never the most occluded one. */}
      <div
        className="cem-perspective flex items-end justify-center overflow-hidden"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        {landing.hero.views.map((view, index) => {
          const active = index === 0
          return (
            <motion.div
              key={view.id}
              className={`-ml-12 w-72 shrink-0 origin-bottom first:ml-0 md:w-80 lg:-ml-16 lg:w-96 ${
                active ? 'z-10' : 'z-0'
              }`}
              animate={reduce ? { opacity: 1 } : {
                opacity: active ? 1 : 0.45,
                scale: active ? 1 : 0.92,
                rotateY: active ? 0 : index < 1 ? 9 : -9,
                rotateZ: active ? 0 : index < 1 ? 5 : -5,
                translateY: offset * (active ? 0 : index < 1 ? 1 : -0.6),
              }}
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <MockupFrame view={view} index={index} />
            </motion.div>
          )
        })}
      </div>

      {/* Caption — lives on the figure, not in the hero copy stack. Section 8.2 forbids
          asserting a licence nobody has checked, and this is the honest place for that claim:
          on the asset, next to the demo. Kept legible (text-sm, not caption-sized text-xs)
          because a disclosure nobody can read is not a disclosure. */}
      <figcaption className="mt-6 text-center text-sm leading-relaxed text-cem-secondary">
        {landing.hero.caption}
      </figcaption>

      {/* The spark hosts the tab row on hover devices. Not on the CTA — the CTA leads to the
          waitlist and a burst on a button that goes to an empty section is polish on a broken
          promise (Apple §16.8: delight is the result of getting the other seven right). The
          spark earns its place on the demo's own controls, where it marks a real state change
          and lands where the visitor's attention already is. */}
      {canSpark() && (
        <div
          className="mt-8 flex h-12 justify-center"
          role="group"
          aria-label="Vista del escenario"
        >
          <ClickSpark
            sparkColor="bg-cem-amber"
            sparkSize={9}
            sparkRadius={16}
            sparkCount={7}
            duration={380}
            extraScale={1.1}
          >
            <div className="flex h-full items-center justify-center gap-2">
              {landing.hero.views.map((view) => (
                <span key={view.id} className="sr-only">
                  {view.label}
                </span>
              ))}
            </div>
          </ClickSpark>
        </div>
      )}

      {/* One-line caption under each frame, so the reader knows what each view is without
          chasing the tab label. */}
      <div className="mt-4 flex justify-center gap-6 text-sm text-cem-secondary">
        {landing.hero.views.map((view) => (
          <span key={view.id} className="text-center">
            <span className="block text-cem-amber text-xs font-semibold uppercase tracking-widest">
              {view.label}
            </span>
            <span className="mt-1 block">{view.blurb}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// One mockup frame: a DeviceFrame around a glass tile (icon + label) so the three views read
// as screens, not as empty black boxes. The icon is a glass tile with the system colour set,
// amber as the default, so the three frames share one material and differ only in the colour.
function MockupFrame({ view, index }) {
  const colors = ['amber', 'sky', 'emerald']
  return (
    <DeviceFrame anchor="top">
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <GlassIcon kind={['chart', 'roles', 'projection'][index]} color={colors[index]} />
          <span className="text-sm font-medium text-cem-text">{view.label}</span>
          <span className="text-xs text-cem-secondary">{view.blurb}</span>
        </div>
      </div>
    </DeviceFrame>
  )
}

export default function Hero() {
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onReady = () => setReady(true)
    // The intro loader dispatches a cemurm:landing-ready event; this component polls the
    // dataset on documentElement AND subscribes, so it reveals correctly whether it mounts
    // before or after the loader finishes (see RevealText.jsx for the same dual-path pattern).
    if (document.documentElement.dataset.landingReady === 'true') {
      setReady(true)
    }
    window.addEventListener('cemurm:landing-ready', onReady)
    return () => window.removeEventListener('cemurm:landing-ready', onReady)
  }, [])

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-24"
    >
      {/* Video background — placeholder until you connect the real file. The overlay is the
          same dark scrim the rest of the landing uses, so text over it breathes. */}
      <div className="absolute inset-0 -z-10">
        <VideoBG src="" overlay />
        {/* Extra dark gradient at the bottom so the headline area is the brightest part of the
            hero and the CTA reads against it. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cem-base/90 via-cem-base/40 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Headline — masked reveal.*/}
        <div className="max-w-3xl">
          <MaskedHeading
            as="h1"
            className={`${HEADLINE} text-cem-text font-semibold`}
            text={landing.hero.title}
            stagger={0.12}
            duration={1.1}
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
          />

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cem-secondary md:text-lg">
            {landing.hero.subtitle}
          </p>

          {/* The one amber primary CTA on screen at a time. Below the hero this becomes the
              ghost outline variant in the header, so the two amber CTAs never sit on screen
              together. */}
          <div className="mt-8">
            <SpecularButton href={landing.hero.cta.href} label={landing.hero.cta.label} />
          </div>
        </div>
      </div>

      {/* Mockup stack — three Stage Bus views as angled frames with subtle parallax on scroll. */}
      <MockupStack reduce={reduce} />
    </section>
  )
}
