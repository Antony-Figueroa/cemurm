/* eslint-disable react/prop-types -- the shape is frozen in the registry below,
   and there is no propTypes anywhere in src/ (see FeedbackForm.jsx:1). */
import { landing } from '../../../content/landing.es.js'

// The frame every landing section renders inside: the page's vertical rhythm,
// the eyebrow, the title, and an empty slot a later slice fills with content.
//
// TIER 1. Full macOS language — radius and depth are legitimate here, unlike
// tier 2 where a material or a decorative shadow would be wrong.
//
// THE EYEBROW, TITLE AND BODY ARE NOT PROPS. All three resolve from the
// registry by `id`, so `Landing.jsx` renders thirteen frames while carrying no
// copy at all, and a later slice adds content without being able to disagree
// with the title the registry already froze. It also means a prose section
// arrives with no component change at all: the registry entry grows a `body`
// and the frame grows the prose. The hero in L2 does not use this frame at all:
// the Stage Bus demo is its own layout, not a title over a slot.
//
// TYPOGRAPHY is the type ramp from the macOS reference 3.5, mapped onto the
// Tailwind steps that already exist. `text-2xl` is the `title` role's 24 px and
// `leading-tight` is its 1.25, exactly; the ramp has nothing between that and
// `display`, so nothing is scaled up here. The eyebrow uses `text-sm` because
// 14 px is the floor for anything, ever — `text-xs` would sit under it — and
// `font-semibold` because no weight below 400 is permitted. Body copy is the
// `body` role at `text-lg` (18 px) with `leading-snug`; the role asks for 1.4
// and the nearest real step is 1.375, which beats an arbitrary line height for
// two hundredths of a ratio.
//
// `max-w-prose` is reference 4.5's "restrict the width of text for optimal
// readability" — prose must not run the full width of a landscape window.
//
// ZERO MOTION HERE. No transition, no animation, no scroll timeline. Upstream
// 8.1 row 3 asks for "3 points, no cards", so the prose is bare paragraphs; the
// single motion budget in section 7.7 went to the hero rotation and cannot be
// spent twice.
//
// BOUNDARIES use one mechanism per line (reference 5.5): a section is a
// boundary between sections, which Apple settles with negative space. So
// `py-16` alone — no border, no fill and no shadow. `cem.surface` is the
// content-layer step, and using it as page rhythm would paint thirteen
// alternating bands for no reason.
export default function Section({ id, children }) {
  const section = landing.sections.find((entry) => entry.id === id)

  // A hand-written id that is not in the registry renders nothing rather than an
  // untitled section. Landing.jsx only ever passes ids the registry itself
  // produces, so this guards a later edit, not a runtime path.
  if (!section) return null

  return (
    <section id={id} className="px-4 py-16 md:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-wide text-cem-secondary">
          {section.eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-cem-text">
          {section.title}
        </h2>
        {/* `body` wins when present; `children` is the title-over-slot fallback
            L1 shipped, kept so a later interactive section can still be handed a
            slot instead of a paragraph array. */}
        {section.body ? (
          <div className="mt-8 max-w-prose space-y-6">
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-lg leading-snug text-cem-secondary">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          children && <div className="mt-8">{children}</div>
        )}
      </div>
    </section>
  )
}