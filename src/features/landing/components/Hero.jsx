/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { landing } from '../../../content/landing.es.js'
import { demoChart, roles, rotationGroupLabel } from '../../../content/landing-demo.es.js'
import OverlayView from '../../stage/components/OverlayView.jsx'
import SlideView from '../../projection/components/SlideView.jsx'
import RevealText from '../components/RevealText.jsx'
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
      <div className="relative mx-auto max-w-7xl">
        <p className="cem-enter max-w-3xl text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
          {hero.eyebrow}
        </p>

        {/* A2's headline. It takes the wrapper's full width while everything around
            it is capped at `max-w-3xl` / `max-w-2xl`. Both are left-aligned, so the
            left edges still line up and the display line simply runs further right.
            That is the asymmetric white-space §4.3 asks for at VARIANCE 8, and the
            width is what buys the single line.

          THE WIDTH, MEASURED NOT ASSUMED. The reference runs `font-size: 12.5vw`
          with `white-space: nowrap`, which works for a two-word English headline
          and fails for a 27-character Spanish one. The advance width of
          "UNA CANCIÓN, TRES LECTURAS." in Inter Medium, read from the shipped
          `inter-latin-500-normal.woff2` with fontTools (upm 2048, summing hmtx
          advances for all 27 glyphs), is **15.6377em**. So one line obeys
          `font-size <= measure / 15.6377`, and at `max-w-7xl` bounded by the
          section's `px-6` gutter:

            375px  gutter 16  available  343  size  28 (floor)   line  438  2 lines  128%
            640px  gutter 16  available  608  size  37.8          line  590  1 line    97%
            768px  gutter 24  available  720  size  45.3          line  709  1 line    98%
           1024px  gutter 24  available  976  size  60.4          line  945  1 line    97%
           1280px  gutter 24  available 1232  size  72 (ceiling) line 1126  1 line    91%
           1920px  gutter 24  available 1872  size  72 (ceiling) line 1126  1 line    60%

          The vw coefficient is 5.9 because that is the smallest value clearing the
          binding constraint, which is the mobile end: the gutter is a fixed
          subtraction, so it dominates as the viewport shrinks, and
          (375-32)/(375*15.6377) = 5.849vw. The asymptotic ceiling is
          1/15.6377 = 6.395vw. 5.9 sits between them.

          FOR CONTRAST, R2's headline was `text-5xl md:text-6xl lg:text-7xl` inside
          a 768px measure: at 72px the line needs 1126px, so it wrapped to TWO lines
          at every desktop size. This is one line from 640px up.

          THE TIGHT SPOT IS 640px TO 1220px, at 91-98% of the measure. That is
          inherent to filling the width and it is where to look first in review: a
          wrap there costs one extra line, not a broken layout. It also means the
          line count depends on Inter actually being loaded, which is a CLS risk
          during the font swap that §7.7 records as unmeasured.

          UPPERCASE IS A REAL DECISION. The copy is sentence case; the reference is
          uppercase. Spanish uppercase changes no meaning here but it does change the
          page's voice. Applied as the reference does, through the `uppercase`
          utility rather than by rewriting the string, so deleting one class reverts
          it and the content module keeps its sentence-case copy.

          `leading-[0.85]` and `tracking-[-0.02em]` are the reference's values, and
          0.85 is what forces the deeper clip reserve; RevealText.jsx carries the
          arithmetic that keeps the descenders inside the mask.

          `trigger="ready"` gates the reveal on A1's signal rather than firing on
          mount, so the headline does not animate underneath the curtain. */}
        <RevealText
          as="h1"
          mode="word"
          trigger="ready"
          text={hero.title}
          stagger={0.14}
          duration={1.1}
          className="cem-enter mt-4 font-medium uppercase leading-[0.85] tracking-[-0.02em] text-cem-text [font-size:clamp(1.75rem,5.9vw,4.5rem)]"
        />

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