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

export default function Hero() {
  const hero = landing.sections.find((section) => section.id === 'hero')

  return (
    <section id="hero" className="px-4 py-16 md:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-wide text-cem-secondary">{hero.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-cem-text md:text-4xl">
          {hero.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-cem-secondary md:text-lg">{landing.tagline}</p>

        <div className="mt-12">
          <RoleRotation
            groupLabel={rotationGroupLabel}
            screens={roles.map((role) => ({ ...role, node: screenFor(role) }))}
          />
        </div>

        {/* Honest about what is on screen. The fixture is invented placeholder
            data and section 8.2 forbids asserting a licence nobody has checked,
            so this line says what it is instead of dressing it up. */}
        <p className="mt-8 text-center text-sm text-cem-secondary">
          Demostración con datos de ejemplo, no una pieza real.
        </p>
      </div>
    </section>
  )
}