/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { landing } from '../../../content/landing.es.js'
import { demoChart, roles, rotationGroupLabel } from '../../../content/landing-demo.es.js'
import OverlayView from '../../stage/components/OverlayView.jsx'
import SlideView from '../../projection/components/SlideView.jsx'
import RoleRotation from '../components/RoleRotation.jsx'

// The hero — the landing's single memorable thing — and the first section that
// does NOT render through the generic Section frame: section 8.2 makes the Stage
// Bus demo its own layout, so there is no title-over-a-slot here to reuse.

// The musician screen, hand-built. StageMode.jsx is 813 lines and pulls
// useSetlists, useFootPedal, useMidi and useGigs, which is the Supabase client —
// section 7.1's rule is that a visitor who never signs in must not download the
// data layer. This is the same view without any of it, and it paints on
// `cem.base`: a musician's own tablet is not a projector, so not a `cem.stage.*`
// surface.
function MusicianScreen({ role }) {
  return (
    <div className="flex min-h-screen flex-col bg-cem-base px-6 py-8">
      <p className="text-sm text-cem-secondary">{demoChart.title}</p>
      {/* The personal key. No accent: section 2.4 gives full-saturation amber to
          the current song and the primary action, and this is neither. */}
      <p className="mt-1 text-3xl font-semibold text-cem-text">{role.tone}</p>

      <div className="mt-6 space-y-3">
        {demoChart.musicianLines.map((line, index) => {
          if (line.section) {
            return (
              <p key={index} className="pt-2 text-sm font-semibold uppercase tracking-widest text-cem-secondary">
                {line.section}
              </p>
            )
          }
          // The personal annotation, and the only place in the whole demo it
          // exists. OverlayView skips chord-pro comments entirely and this screen
          // does not, which is the Stage Bus argument in one line of fixture.
          if (line.annotation) {
            return (
              <p key={index} className="text-sm italic text-cem-secondary-elevated">
                {line.annotation}
              </p>
            )
          }
          return (
            <div key={index}>
              <p className="text-lg font-semibold text-cem-text">{line.chord}</p>
              <p className="text-lg text-cem-text">{line.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function screenFor(role) {
  if (role.screen === 'overlay') return <OverlayView state={role.state} />
  if (role.screen === 'signal') return <SlideView slide={role.slide} />
  return <MusicianScreen role={role} />
}

// Reference 7.5: 2px solid `cem.text`, offset 2, `:focus-visible` only, and
// never the accent — a musician has to tell "this has keyboard focus" from
// "this is the current song" at a glance. Same rule, same ring, as the header's
// FOCUS constant, copied rather than shared because LandingHeader.jsx is not in
// this slice's edit surfaces and the ring must not drift between two CTAs.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

// §4.7 HERO STACK, max four text elements, and this is all four: eyebrow,
// headline, subtext, CTA. The demo caption L2 put here was the fifth, and §4.7's
// banned list names it exactly ("tiny tagline below CTAs"); it is a
// `<figcaption>` on the demo figure now, inside RoleRotation.
//
// §4.7 font scale: the headline is FOUR words, inside the rule's "3-5 words" band,
// so `text-6xl md:text-7xl` is permitted. `text-5xl md:text-6xl lg:text-7xl`
// reaches the rule's md and lg values and keeps a 375px phone off a 72px line.
//
// TOP PADDING is `pt-12` mobile and `pt-24` desktop: exactly §4.7's cap, never
// above it, and when the hero does not fit the rule says the fix is the type scale
// or the asset size, never the padding and never the copy. With a 72px header and
// an 800px viewport the CTA's bottom edge lands near 496px, above the fold.
//
// P2 MEASURE. The copy sits in `max-w-3xl` and the demo breaks out to
// `max-w-7xl`; before this the hero was one `max-w-5xl` column, the exact shape
// the review called out. The headline still meets §4.7's two-line cap: 1187px of
// estimated text in a 768px measure wraps to 2 lines.
export default function Hero() {
  const hero = landing.sections.find((section) => section.id === 'hero')

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-24"
    >
      <div className="relative mx-auto max-w-3xl">
        <p className="cem-enter text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
          {hero.eyebrow}
        </p>

        <h1 className="cem-enter mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tighter text-cem-text md:text-6xl lg:text-7xl">
          {hero.title}
        </h1>

        <p className="cem-enter mt-5 max-w-2xl text-base leading-relaxed text-cem-secondary md:text-lg">
          {landing.tagline}
        </p>

        {/* THE ONE CTA: same intent, label and href the header uses, so §4.5's
            one-label-per-intent holds and the two cannot drift. IT IS A DEAD END:
            `href` is `#waitlist`, and whether the waitlist needs a backend is B1,
            owned by davidjesus516. Stated, not papered over: no `mailto:`, no
            placeholder submit, no fake confirmation. Amber on `cem.base` measured
            at 8.31:1 from the built CSS, clearing AA and AAA; amber with light text
            computes to 2.05:1 and is a hard fail, so the fill carries the accent.
            `whitespace-nowrap` is §4.7's CTA BUTTON WRAP BAN. */}
        <a
          href={landing.cta.href}
          className={`cem-enter mt-8 inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-cem-amber px-6 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 ${FOCUS}`}
        >
          {landing.cta.label}
        </a>

        </div>

      {/* P3: the demo breaks out to the page's widest measure, because it is the
          one asset meant to be memorable and it now has room to be one. */}
      <div className="relative mx-auto mt-14 max-w-7xl md:mt-20">
        <RoleRotation
          groupLabel={rotationGroupLabel}
          caption={landing.demo.disclaimer}
          screens={roles.map((role) => ({ ...role, node: screenFor(role) }))}
        />
      </div>
    </section>
  )
}