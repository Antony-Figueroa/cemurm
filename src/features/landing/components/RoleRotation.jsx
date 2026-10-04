/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import DeviceFrame from './DeviceFrame.jsx'

// THE ONE NON-USER-TRIGGERED MOTION MOMENT IN THE WHOLE LANDING (section 7.7
// budgets exactly one). It is a three-step sequence that runs once on load and
// then stops: nothing on this page loops, nothing auto-plays, and every other
// transition on the landing is a response to a scroll, a hover or a click.
//
// It stops rather than loops, which is also the accessibility answer: WCAG 2.2.2
// requires a pause mechanism for auto-updating content, and a sequence that runs
// once and hands over has nothing to pause. The whole sequence spans 2.8s, which
// is under the 5s threshold even if you ignore that.
//
// FROZEN PROP SHAPE — { groupLabel, screens }
//   groupLabel: accessible name for the single-select control that switches the
//            three projections. Copy, so it comes from the content module.
//   screens: [{ id, label, blurb, anchor, node }], in presentation order. `id` is
//            the React key and the tab identity; `label` and `blurb` are copy and
//            must come from the content module; `anchor` is 'top' | 'center' and
//            picks which part of a viewport-sized screen the frame crops; `node`
//            is the rendered screen. The caller builds the array, so this
//            component knows nothing about OverlayView, SlideView or the fixture.

// Reference 6.4: `motion-base` is 200ms on cubic-bezier(0.32, 0.72, 0, 1). Both
// numbers are the reference's, not Tailwind's defaults.
const DURATION = 0.2
const EASE = [0.32, 0.72, 0, 1]

// Reference 6.4 rule 6: under reduce, x/y/z TRANSITIONS become an opacity
// cross-fade — movement is removed, information is not. So the scale target is
// dropped rather than the transition. This has to be done through motion's own
// `useReducedMotion`, because src/app/index.css sets `transition-duration:
// 0.01ms !important` and motion writes inline styles, which that block cannot
// reach. Nothing here overrides index.css.
export default function RoleRotation({ groupLabel, screens }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduce) return undefined
    // 1 -> 2 -> 0. Shows the switching twice and settles back on the default
    // view, so the tabs are visibly in their resting state when it ends.
    const steps = [1, 2, 0].map((index, step) =>
      setTimeout(() => setActive(index), (step + 1) * 1400),
    )
    return () => steps.forEach(clearTimeout)
  }, [reduce])

  const current = screens[active]
  const target = (isActive) =>
    reduce
      ? { opacity: isActive ? 1 : 0.45 }
      : { opacity: isActive ? 1 : 0.45, scale: isActive ? 1 : 0.92 }

  return (
    <div>
      {/* The siblings overlap and bleed. `overflow-hidden` is the crop, which is
          what section 8.2 asks for ("rotated and cropped by the canvas edge"),
          and it is also what keeps three 18rem frames inside a 375px phone. */}
      <div className="flex items-end justify-center overflow-hidden">
        {screens.map((screen, index) => {
          const offset = index - active
          // The focused frame stands upright; its neighbours tilt away from it,
          // so the row reads as a fan around the one that matters.
          const tilt = offset === 0 ? '' : offset < 0 ? '-rotate-6' : 'rotate-6'
          return (
            <motion.div
              key={screen.id}
              animate={target(offset === 0)}
              transition={{ duration: reduce ? 0 : DURATION, ease: EASE }}
              className={`-ml-12 w-72 shrink-0 origin-bottom first:ml-0 sm:w-80 ${tilt}`}
            >
              <DeviceFrame anchor={screen.anchor}>{screen.node}</DeviceFrame>
            </motion.div>
          )
        })}
      </div>

      {/* Reference 5.2: `radius-sm` is literally the "segment" class, and a
          three-up tab row is a set of segments rather than a set of primary
          actions — so capsule is wrong here (rule 5) even though rule 4 makes a
          horizontal row prefer it. Selected state is `text-cem-amber` plus a 2px
          amber rule, which is the accent as an indicator rather than as a second
          full-saturation surface. */}
      <div className="mt-8 flex justify-center gap-2" role="group" aria-label={groupLabel}>
        {screens.map((screen, index) => (
          <button
            key={screen.id}
            type="button"
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-cem-sm border-b-2 px-4 text-sm font-medium duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base ${
              index === active
                ? 'border-cem-amber text-cem-amber'
                : 'border-transparent text-cem-secondary hover:text-cem-text'
            }`}
          >
            {screen.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-cem-secondary">{current.blurb}</p>
    </div>
  )
}