/* eslint-disable react/prop-types -- the shape is { href, label, onPress, type,
   onClick, ghost, children } and only href is required for an anchor; there are
   no propTypes anywhere in src/ (see FeedbackForm.jsx:1). */

import { memo } from 'react'

// APPLE §1, respond on pointer-down. The button highlights the instant it is pressed, and
// commits on release. The scale is Emil's baseline — 0.97 over 150ms ease-out — because
// 200ms is past the top of the band for press feedback and this is the one interaction where
// latency is most visible. The press state is pure CSS :active, no JS.
//
// ONE AMBER PRIMARY PER VIEWPORT. This button is the primary amber pill and it is the only
// full-saturation amber surface on screen at a time. The hover state is a darker amber, not a
// new colour, and the press state is the same amber scaled, so the accent never multiplies.
//
// NO SPARK HERE. This component used to carry one behind a gate that read a ref it never
// attached, so it could not mount; and making it mount would be wrong twice over. The hero's
// primary CTA must not burst (Hero says so, because the CTA points at a waitlist that is not
// wired yet), and Registro and CtaFinal already mount their own press-point spark. The section
// owns the burst, the button owns the press: onPress fires on pointer-down and the host decides
// whether anything renders.
//
// FOCUS. Apple §7.5: 2px solid cem.text, offset 2, :focus-visible only, never the accent.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

const PRESS = 'transition-transform duration-150 ease-out active:scale-[0.97]'

// The light sweep. A píldora with a subtle highlight move on hover is the specular treatment;
// it is a pure CSS sweep across the surface, not a new colour. Under reduced motion it is a
// simple opacity/brightness shift instead of a moving highlight.
const SWEEP = 'relative overflow-hidden'

export const SpecularButton = memo(function SpecularButton({
  href,
  label,
  onPress,
  onClick,
  type = 'button',
  ghost = false,
  children,
}) {
  // onPress is the pointer-down hook (spark hosts position themselves from it); onClick is the
  // commit hook. Neither is required: a plain anchor needs neither, and a form submit only needs
  // type="submit" so the form's own onSubmit stays the single capture point.
  const handlePointerDown = (e) => {
    if (onPress) onPress(e)
  }

  const content = children ?? label

  return (
    <span className={SWEEP}>
      {href ? (
        <a
          href={href}
          className={`inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-sm font-semibold ${PRESS} ${FOCUS} ${
            ghost
              ? 'border border-cem-text/20 bg-transparent text-cem-text hover:bg-cem-text/10'
              : 'bg-cem-amber text-cem-base border-t border-cem-text/20 hover:bg-cem-amber/90'
          }`}
          onPointerDown={handlePointerDown}
          onClick={onClick}
        >
          {/* The light sweep — a thin highlighted strip that moves across the surface on
              hover. Pure CSS, no JS, no colour literal (the highlight is white at low alpha,
              not amber). */}
          <span
            className="pointer-events-none absolute inset-0 h-full w-1/2 -translate-x-full bg-gradient-to-r from-cem-text/10 via-cem-text/6 to-transparent transition-transform duration-300"
            aria-hidden="true"
          />
          <span className="relative z-10">{content}</span>
        </a>
      ) : (
        <button
          type={type}
          className={`inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-sm font-semibold ${PRESS} ${FOCUS} ${
            ghost
              ? 'border border-cem-text/20 bg-transparent text-cem-text hover:bg-cem-text/10'
              : 'bg-cem-amber text-cem-base border-t border-cem-text/20 hover:bg-cem-amber/90'
          }`}
          onPointerDown={handlePointerDown}
          onClick={onClick}
        >
          <span
            className="pointer-events-none absolute inset-0 h-full w-1/2 -translate-x-full bg-gradient-to-r from-cem-text/10 via-cem-text/6 to-transparent transition-transform duration-300"
            aria-hidden="true"
          />
          <span className="relative z-10">{content}</span>
        </button>
      )}
    </span>
  )
})

export default SpecularButton
