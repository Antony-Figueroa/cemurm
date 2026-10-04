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

// §4.7 HERO STACK DISCIPLINE, max four text elements, and this is all four:
//   1. eyebrow   — `hero.eyebrow`, "Stage Bus"
//   2. headline  — `hero.title`, four words
//   3. subtext   — `landing.tagline`, five words
//   4. CTA       — `landing.cta`
// The demo caption L2 put in here is the fifth, and §4.7's banned list names it
// exactly: "tiny tagline below CTAs". It moved to a `<figcaption>` on the demo
// figure, inside RoleRotation, where it describes the asset rather than the page.
//
// §4.7 hero font scale: the headline is FOUR words, which is inside the rule's
// "3-5 words" band and therefore permits `text-6xl md:text-7xl`. It uses
// `text-5xl md:text-6xl lg:text-7xl`, which reaches the rule's md and lg values
// exactly and keeps a 375px phone from getting a 72px line. At `lg` (72px) in a
// `max-w-4xl` measure the four words wrap to TWO lines, which is §4.7's cap.
//
// TOP PADDING is `pt-12` mobile and `pt-24` desktop, i.e. exactly at §4.7's
// `pt-24` cap and never above it. The rule also says that when the hero does not
// fit, the fix is the type scale or the asset size, never the padding and never
// the copy — so nothing here buys space by moving down the page. Measured
// against a 72px-tall header plus an 800px viewport, the CTA's bottom edge lands
// near 540px, which is above the fold with room for the demo's top edge to show.
export default function Hero() {
  const hero = landing.sections.find((section) => section.id === 'hero')

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-20 md:pt-24"
    >
      {/* The oversized background word. Reuses R1's `.cem-ghost` verbatim, and the
          word is the hero's own eyebrow, so the texture repeats a word already on
          screen rather than asserting a new one. */}
      <span
        aria-hidden="true"
        data-word={landing.demo.ghostWord}
        className="cem-ghost pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        {landing.demo.ghostWord}
      </span>

      <div className="relative mx-auto max-w-5xl">
        <p className="cem-enter text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
          {hero.eyebrow}
        </p>

        <h1 className="cem-enter mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tighter text-cem-text md:text-6xl lg:text-7xl">
          {hero.title}
        </h1>

        <p className="cem-enter mt-5 max-w-2xl text-base leading-relaxed text-cem-secondary md:text-lg">
          {landing.tagline}
        </p>

        {/* THE ONE CTA, and the same intent, label and href the header already
            uses. §4.5 forbids two CTAs sharing an intent, and reusing the exact
            label is what compliance looks like here: `landing.cta` is the single
            source, so the two cannot drift.

            IT IS A DEAD END. `landing.cta.href` is `#waitlist`, and that section
            has an eyebrow and a title and nothing else, because whether the
            waitlist needs a backend is B1 and B1 belongs to davidjesus516. This
            is stated rather than papered over: no `mailto:`, no placeholder
            submit, no fake confirmation. Making the hero's primary action a dead
            end is the consequence of an undecided backend, not a design choice.

            Amber on `cem.base` is the pairing the reference mandates, measured at
            8.31:1 from the built CSS — AA and AAA both clear. Amber with light
            text computes to 2.05:1 and is a hard fail, so the fill carries the
            accent and the label stays dark. `whitespace-nowrap` is §4.7's CTA
            BUTTON WRAP BAN: the label must not break across lines at desktop. */}
        <a
          href={landing.cta.href}
          className={`cem-enter mt-8 inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-cem-amber px-6 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 ${FOCUS}`}
        >
          {landing.cta.label}
        </a>

        <div className="mt-12">
          <RoleRotation
            groupLabel={rotationGroupLabel}
            caption={landing.demo.disclaimer}
            screens={roles.map((role) => ({ ...role, node: screenFor(role) }))}
          />
        </div>
      </div>
    </section>
  )
}