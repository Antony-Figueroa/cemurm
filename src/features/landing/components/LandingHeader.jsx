import { landing } from '../../../content/landing.es.js'

// TIER 1. This is the page's functional-layer chrome, so it is the one element
// that gets the material: the sticky header floats above the content layer and
// "establishes a clear visual hierarchy between functional elements and
// content" (HIG › Materials › Liquid Glass).
//
// The reference's degradation ladder (1.6) is mandatory, and this is the only
// place it applies, so it is honoured inline. `backdrop-filter` is expensive —
// it re-reads and re-composites on every frame the element is visible, which for
// a sticky header is the whole scroll — so both fallbacks raise the fill to an
// opaque 95% rather than leaving text over an unreadable scrim: one for a
// platform that asks for reduced transparency (Apple's Reduce Transparency), one
// for a browser with no backdrop-filter at all. The hairline is
// `cem.text / 10`, which is the reference's 1px light border computed from a
// token instead of a literal.
//
// One deviation, and it is a correction rather than a preference. The
// reference's example writes `saturate(180%)`, a `[CEMURM DECISION]` value with
// no Apple provenance, but Tailwind's default `backdrop-saturate` scale stops
// at 150 — so `backdrop-saturate-180` emits NO rule at all and would have
// shipped as a silent no-op. 150 is the nearest step that exists.
const SURFACE =
  'border-b border-cem-text/10 bg-cem-base/70 backdrop-blur-xl backdrop-saturate-150 ' +
  '[@media(prefers-reduced-transparency:reduce)]:bg-cem-base/95 ' +
  '[@supports_not(backdrop-filter:blur(1px))]:bg-cem-base/95'

// Reference 7.5: 2px solid `cem.text`, offset 2, `:focus-visible` only, and
// never the accent — a musician has to be able to tell "this has keyboard focus"
// from "this is the current song" at a glance. `outline-none` is safe here only
// because the ring replaces it.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

// `duration-200` is the `motion-base` token exactly. Tailwind's default 150ms is
// not on the ramp, and a per-element choice would be a per-instance timing
// decision Apple explicitly refuses to make.
export default function LandingHeader() {
  return (
    <header className={`sticky top-0 z-20 ${SURFACE}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        {/* The wordmark, and the first of the three things full-saturation amber
            is allowed on. A `span` rather than a link: on a marketing page the
            logo is an identity, not a jump back to a top of page you are
            already at. */}
        <span className="order-1 text-lg font-semibold tracking-tight text-cem-amber">
          {landing.brand}
        </span>

        {/* The nav wraps to its own full-width row below the brand and the CTA,
            so every anchor stays reachable on a phone without a disclosure
            component that this slice has no budget for. The order utilities put
            it back between the brand and the CTA from `sm` up. */}
        <nav className="order-3 flex w-full flex-wrap items-center gap-x-6 sm:order-2 sm:w-auto">
          {landing.nav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`inline-flex min-h-12 items-center text-sm font-medium text-cem-secondary duration-200 hover:text-cem-text ${FOCUS}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* The primary action, and the second. Amber fill with `cem.base` text is the
            8.31:1 pairing the reference mandates; amber with light text computes
            to 2.05:1 and is a hard fail. `min-h-12` is the 48px hit target, not
            a style. */}
        <a
          href={landing.cta.href}
          className={`order-2 inline-flex min-h-12 items-center rounded-full bg-cem-amber px-5 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 sm:order-3 ${FOCUS}`}
        >
          {landing.cta.label}
        </a>
      </div>
    </header>
  )
}