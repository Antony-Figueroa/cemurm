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
// FROZEN PROP SHAPE — { groupLabel, caption, screens }
//   groupLabel: accessible name for the control that switches the projections.
//   caption:   the demo's data-provenance line, as the figure's `<figcaption>`.
//            Section 8.2 forbids asserting a licence nobody has checked, and this
//            is where that claim lives: on the asset, not in the hero copy stack.
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

// THE DEPTH TREATMENT. Reference: device mockups stacked at opposing angles with
// real perspective. Before this the row was a flat fan of 2D `rotate-6` with no
// perspective, so the frames read as a collage rather than as objects in a space.
//
// `perspective` itself is `.cem-perspective` in src/app/index.css, NOT a
// Tailwind class, because Tailwind 3.4 has no 3D transform utilities at all.
// Its Transforms section is scale, rotate, translate, skew and transform-origin;
// `rotate-x-*`, `rotate-y-*`, `rotate-z-*`, `perspective-*`, `transform-style`
// and `backface-visibility` all arrived in v4. Verified two ways: the v3 docs
// list ten `rotate-*` values and no axis variants, and in THIS install
// `rotate-6` emits while `rotate-x-6`, `rotate-y-6`, `perspective-[1200px]`,
// `preserve-3d` and `backface-hidden` emit nothing and trip no check. A
// class-based 3D treatment would have been the same silent no-op as
// `backdrop-saturate-180`. So the rotation and the Z offset go through `motion`,
// which composes its own inline `transform` string and supports every one of
// them (motion 14.0.0: transformPerspective, rotateX/Y/Z, translateZ).
//
// The sign of `rotateY` is a visual judgement only a browser can settle:
// opposite signs on the two sides makes the outer edges recede, a concave fan
// embracing the active frame. If it reads as a convex bow, flip both signs.
const TILT_Y = 9
const TILT_Z = 5
const RECEDE_Z = -90

// Reference 6.4 rule 6: under reduce, every rotation, the Z offset and the scale
// are DROPPED rather than the transition: movement is removed, information is
// not. It has to go through motion's own `useReducedMotion`, because index.css
// sets `transition-duration: 0.01ms !important` and motion writes inline styles,
// which that block cannot reach.
function depthFor(offset, reduce) {
  if (reduce) return { opacity: offset === 0 ? 1 : 0.45 }
  if (offset === 0) return { opacity: 1, scale: 1, rotateY: 0, rotateZ: 0, translateZ: 0 }
  return {
    opacity: 0.45,
    scale: 0.92,
    rotateY: offset < 0 ? TILT_Y : -TILT_Y,
    rotateZ: offset < 0 ? TILT_Z : -TILT_Z,
    translateZ: RECEDE_Z,
  }
}

export default function RoleRotation({ groupLabel, caption, screens }) {
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

  return (
    <div>
      {/* `<figcaption>` must be a DIRECT child of `<figure>`, so the caption
          cannot render from inside the row below. Hence `caption` is a prop. */}
      <figure>
        {/* The siblings overlap and bleed. `overflow-hidden` is the crop, which is
            what section 8.2 asks for ("rotated and cropped by the canvas edge"),
            and it is also what keeps three frames inside a 375px phone.
            `.cem-perspective` puts the row in a 3D space; it composes with the
            crop, since `perspective` affects the children's rendering and not
            the container's own box.

            `z-10` ON THE ACTIVE FRAME is a fix, not a flourish. The frames paint
            in DOM order, so index 0 painted FIRST and sat BEHIND the other two,
            which is the resting state after the rotation settles back to 0. The
            focused screen was the most occluded of the three at exactly the
            moment the eye lands. Lifting it costs one class.

            SIZING. P3 called this the weakest thing on the page, so the frames
            grew to `w-72 md:w-80 lg:w-96` (288 to 384px) and DeviceFrame's window
            grew to match. The overlap widens with them (`-ml-12 lg:-ml-16`) so the
            row grows by two thirds, not three cards wide: 384 + 320 + 320 =
            1024px at lg, inside a 1280px measure. */}
        <div className="cem-perspective flex items-end justify-center overflow-hidden">
          {screens.map((screen, index) => (
            <motion.div
              key={screen.id}
              animate={depthFor(index - active, reduce)}
              transition={{ duration: reduce ? 0 : DURATION, ease: EASE }}
              className={`-ml-12 w-72 shrink-0 origin-bottom first:ml-0 md:w-80 lg:-ml-16 lg:w-96 ${
                index === active ? 'z-10' : 'z-0'
              }`}
            >
              <DeviceFrame anchor={screen.anchor}>{screen.node}</DeviceFrame>
            </motion.div>
          ))}
        </div>

        {/* Section 8.2 in one line: the demo is not a real piece of music. It has
            to stay LEGIBLE, because a disclosure nobody can read is not a
            disclosure, so this is `text-sm` rather than caption-sized `text-xs`. */}
        <figcaption className="mt-6 text-center text-sm leading-relaxed text-cem-secondary">
          {caption}
        </figcaption>
      </figure>

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