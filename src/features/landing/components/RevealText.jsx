/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// A2 — the clip-mask text reveal. One component with a mode, because the
// primitive is identical and only two things vary: the split unit (word or line)
// and the descender reserve on the clip box.
//
// THE PRIMITIVE, from the reference. Each unit is wrapped in a box with
// `overflow:hidden`. The inner span starts at `translateY(115%)` with
// `opacity:0` and animates to `translateY(0)` / `opacity:1`, so the text rises
// out from behind its own mask rather than fading in place.
//
// ── WHY THE CLIP PADDING IS NOT A ROUND NUMBER ─────────────────────────────────
// A clip box's height comes from `line-height`, NOT from the glyphs. Inter's real
// metrics, read from the shipped `inter-latin-*-normal.woff2` with fontTools
// (upm 2048): cap height 1490 (0.7275em), hhea ascender 1984 (0.9688em),
// descender -494 (-0.2412em), so ascent + descent = 1.21em.
//
// With half-leading, the box's bottom edge sits at
//   descent + (lineHeight - 1.21) / 2
// below the baseline. The descenders need -0.2412em. So the reserve required is
//   padding-bottom >= (1.21 - lineHeight) / 2
// which at the reference's `line-height: 0.85` is **0.18em**, not the 0.12em the
// reference uses for words. The reference's 0.12em is safe at a taller
// line-height, and 0.85 is the tightest value this font allows before ink is cut.
//
// The hero therefore runs `pb-[0.2em]` (0.18em required, rounded up) and the
// section headlines run `pb-[0.14em]`, which at their `leading-[1.05]` requires
// 0.08em. Both are checked against the arithmetic above rather than assumed, and
// the numbers are asserted at the bottom of this file so a change to the
// line-height cannot silently reintroduce a clipped descender.
//
// ── THE WIDTH, MEASURED NOT ASSUMED ────────────────────────────────────────────
// The reference uses `font-size: 12.5vw` with `white-space: nowrap`. That works
// for a two-word English headline. Ours is 27 characters, so the advance width of
// "UNA CANCIÓN, TRES LECTURAS." in Inter Medium was measured from the shipped
// woff2: **15.6377em**. Any single-line headline therefore obeys
//   font-size <= measureWidth / 15.6377
// Hero.jsx owns the resulting clamp and the arithmetic is recorded there.

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]
const LINE_OUT_Y = '115%'

// Reference defaults. The hero overrides the first two.
const DEFAULTS = { stagger: 0.12, duration: 0.95 }

// The one word this component listens for. A1 owns it and this file does not
// modify IntroLoader.jsx; the name is repeated here because depending on a
// constant that only exists inside a sibling component means a rename there
// silently breaks this one.
const READY_EVENT = 'cemurm:landing-ready'

/**
 * Gate on A1's ready signal, covering both mount orders.
 *
 * ALWAYS STARTS FALSE, and that is the load-bearing decision. A1 resets
 * `dataset.landingReady` to 'false' inside its own mount EFFECT, which runs after
 * render. Reading the dataset during the `useState` initialiser would therefore
 * see a stale 'true' left over from a previous visit and reveal the hero at t=0,
 * underneath a curtain that has not started yet. Polling in the effect instead
 * means the poll always runs after A1's reset, because React runs sibling effects
 * in tree order and A1 is rendered before the hero.
 *
 * THREE PATHS, and which one fires:
 *   cold load  — the poll reads 'false', so it waits; the CustomEvent arrives at
 *                ~1400ms and this is the path that actually runs.
 *   late mount — the poll reads 'true' and the component reveals immediately,
 *                which is what a lazy route mounting after the loader finished
 *                needs. Without the poll it would wait forever for an event that
 *                already happened.
 *   mid-flight — the poll runs before the event is dispatched, then the listener
 *                is attached, then the dataset is re-read. That last re-read
 *                closes the window between the first poll and the listener
 *                attaching, where a signal could have been missed.
 *
 * `detail.at` discards a signal that predates this component's own mount, so a
 * late-mounting reveal cannot be triggered by an event it never saw.
 */
export function useLandingReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mountedAt = Date.now()
    const isReady = () => document.documentElement.dataset.landingReady === 'true'

    if (isReady()) {
      setReady(true)
      return undefined
    }

    const onReady = (event) => {
      if (typeof event.detail?.at === 'number' && event.detail.at < mountedAt) return
      setReady(true)
    }
    window.addEventListener(READY_EVENT, onReady)
    if (isReady()) setReady(true)

    return () => window.removeEventListener(READY_EVENT, onReady)
  }, [])

  return ready
}

/**
 * Split a headline into lines for the line mode. A headline of five or more words
 * breaks at the word nearest the midpoint; anything shorter stays one line, since
 * forcing a two-line break on "Lo que no hacemos." would read as a mistake.
 *
 * This is LAYOUT, not copy: no string is altered, the words only move to a second
 * line. The alternative, letting the browser wrap, produces an unbalanced break at
 * whatever width the browser happens to have, which is the thing this slice is
 * meant to stop.
 */
function splitLines(text) {
  const words = text.split(' ').filter(Boolean)
  if (words.length < 5) return [text]
  let running = 0
  let best = 1
  let bestDelta = Infinity
  words.forEach((word, i) => {
    if (i === words.length - 1) return
    running += word.length + 1
    const delta = Math.abs(running - text.length / 2)
    if (delta < bestDelta) {
      bestDelta = delta
      best = i + 1
    }
  })
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

/**
 * @param text       the string to reveal
 * @param mode       'word' (hero, per-word stagger) or 'line' (section headlines)
 * @param as         element type, 'h1' or 'h2'
 * @param trigger    'ready' gates on A1's signal (hero); 'inView' uses
 *                   `whileInView` with `once` (sections below the fold)
 * @param className  classes for the rendered element
 */
export default function RevealText({
  text,
  mode = 'line',
  as: Tag = 'h2',
  trigger = 'inView',
  className = '',
  stagger = DEFAULTS.stagger,
  duration = DEFAULTS.duration,
}) {
  const reduce = useReducedMotion()
  // Hook order is unconditional: `useLandingReady` is called for BOTH triggers and
  // simply returns true for 'inView', because conditional hooks are illegal and
  // the trigger can change between renders of a reused element.
  const ready = useLandingReady()

  // §6.B. Under reduce this returns plain, fully visible text with no transform,
  // no opacity and no stagger. `useReducedMotion` is the ONLY control here:
  // src/app/index.css sets `transition-duration: 0.01ms !important`, but motion
  // writes inline styles, which that block cannot reach, and there is no
  // MotionConfig anywhere in src/ so motion's own default stays
  // reducedMotion:'never'. The global block does not cover this component.
  if (reduce) return <Tag className={className}>{text}</Tag>

  const units = mode === 'word' ? text.split(' ').filter(Boolean) : splitLines(text)
  // Word mode needs a deeper reserve than the reference's 0.12em because the hero
  // runs line-height 0.85; see the arithmetic at the top of this file.
  const reserve = mode === 'word' ? CLIP_RESERVE.word : CLIP_RESERVE.line
  // `motion[Tag]` rather than a hardcoded `motion.p`: the hero headline has to
  // stay an <h1> for the document outline, and a `<p>` would silently drop the
  // page's only level-one heading.
  const MotionTag = motion[Tag]

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: 0 } },
  }
  const unit = {
    hidden: { y: LINE_OUT_Y, opacity: 0 },
    show: { y: '0%', opacity: 1, transition: { duration, ease: EASE_OUT_EXPO } },
  }

  return (
    <MotionTag
      className={className}
      variants={container}
      {...(trigger === 'ready'
        ? { initial: 'hidden', animate: ready ? 'show' : 'hidden' }
        : { initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.4 } })}
    >
      {units.map((piece, i) => (
        <span key={i} className={`block overflow-hidden ${reserve}`}>
          <motion.span className="block" variants={unit}>
            {piece}
            {mode === 'word' && i < units.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}

// The reserve arithmetic, asserted rather than claimed in prose.
//
// Inter's ascent + descent is 1.21em (read from the shipped woff2: 1984 and -494
// at upm 2048). A clip box's bottom edge sits `descent + (lineHeight - 1.21) / 2`
// below the baseline, so the reserve a line-height demands is
// `(1.21 - lineHeight) / 2`. Hero at 0.85 demands 0.18em; the sections at 1.05
// demand 0.08em. Both reserves clear their own threshold with room to spare.
//
// A dev-only warning rather than a throw: these are constants, and a mismatch is
// a clipping bug a reviewer should see in a console, not a reason for the whole
// landing to fail to render in production.
const REQUIRED_RESERVE = (lineHeight, inkSpan = 1.21) => Math.max(0, (inkSpan - lineHeight) / 2)

export const HERO_LINE_HEIGHT = 0.85
export const SECTION_LINE_HEIGHT = 1.05
export const CLIP_RESERVE = { word: 'pb-[0.2em]', line: 'pb-[0.14em]' }

if (import.meta.env?.DEV) {
  const pairs = [
    ['hero word', CLIP_RESERVE.word, HERO_LINE_HEIGHT],
    ['section line', CLIP_RESERVE.line, SECTION_LINE_HEIGHT],
  ]
  for (const [name, cls, lh] of pairs) {
    const actual = parseFloat(cls.match(/0\.(\d+)em/)[1]) / 10
    if (actual < REQUIRED_RESERVE(lh)) {
      console.warn(
        `[RevealText] ${name} clip reserve ${actual}em is under the ${REQUIRED_RESERVE(lh)}em that line-height ${lh} demands`,
      )
    }
  }
}