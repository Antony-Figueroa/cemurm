import { landing } from '../../../content/landing.es.js'

// TIER 1, but a content-layer surface, and the distinction matters: a footer is
// not chrome, so it gets no material and no shadow. Elevation in dark mode is
// carried by lightness (reference 5.4), and a lighter fill here would read as a
// panel for no reason. The boundary is the 1px hairline alone — `cem.text / 10`,
// the same separator value the header uses, so the page has one separator token
// and not two.
//
// NO CTA HERE. The single full-saturation amber action lives in the header, and
// "at most one full-saturation amber surface on screen at a time" is the rule
// that keeps the wordmark and the primary button legible as the only two things
// that matter. A sticky header plus an amber footer CTA would put two on screen
// together at the bottom of the scroll. The waitlist block is the `waitlist`
// section immediately above this element, which is where the CTA belongs.
export default function LandingFooter() {
  return (
    <footer className="border-t border-cem-text/10 px-4 py-10 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cem-secondary">{landing.footer.note}</p>
        <p className="text-sm text-cem-secondary">{landing.footer.license}</p>
      </div>
    </footer>
  )
}