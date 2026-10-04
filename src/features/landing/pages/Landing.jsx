import { landing } from '../../../content/landing.es.js'
import Hero from '../components/Hero.jsx'
import LandingFooter from '../components/LandingFooter.jsx'
import LandingHeader from '../components/LandingHeader.jsx'
import Section from '../components/Section.jsx'

// The marketing surface. Thirteen sections, two shapes: the hero is its own
// layout (section 8.2 — the Stage Bus demo is not a title over a slot) and the
// other twelve render through the Section frame, which resolves its own eyebrow
// and title from the registry.
//
// The registry is the structure. This component maps it and imports no copy of
// its own, which is why a section cannot be added without also naming it, or
// renamed without editing the component that renders it. `hero` is split out
// rather than special-cased inside the map so there is no `id === 'hero'`
// condition here for the next section to copy.
export default function Landing() {
  const sections = landing.sections.filter((section) => section.id !== 'hero')

  return (
    <div className="flex min-h-screen flex-col bg-cem-base">
      <LandingHeader />

      <main className="flex-1">
        <Hero />
        {sections.map((section) => (
          <Section key={section.id} id={section.id} />
        ))}
      </main>

      <LandingFooter />
    </div>
  )
}