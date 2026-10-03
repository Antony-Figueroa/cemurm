import { landing } from '../../../content/landing.es.js'
import LandingFooter from '../components/LandingFooter.jsx'
import LandingHeader from '../components/LandingHeader.jsx'
import Section from '../components/Section.jsx'

// The marketing surface, and nothing else. Slice L1 is the scaffold: shell,
// header, footer, and thirteen section frames the registry drives. The hero
// Stage Bus demo (L2), the prose bodies (L3) and the Stage Bus / roles sections
// (L4) fill in later, so nothing on this page is placeheld copy pretending to be
// content.
//
// The registry is the structure. This component maps it and imports no copy of
// its own, which is why a section cannot be added without also naming it, or
// renamed without editing the component that renders it.
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-cem-base">
      <LandingHeader />

      <main className="flex-1">
        {landing.sections.map((section) => (
          <Section key={section.id} id={section.id} />
        ))}
      </main>

      <LandingFooter />
    </div>
  )
}