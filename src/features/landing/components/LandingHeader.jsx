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
//
// §12 "Material weight encodes hierarchy" and this surface is the LARGEST
// translucent element on the page, so it takes the strongest blur available:
// `backdrop-blur-2xl` (40px) rather than the `xl` (24px) it had, against the same
// 70 percent fill. Bigger surface, thicker material, deeper separation from what
// scrolls under it.
//
// `cem-material` carries the §12 "materialize, don't just fade" entry: blur radius
// and scale animate together on load. It is `@starting-style` plus a transition,
// declared in src/app/index.css, so it costs zero bytes and no JavaScript.
//
// §12 "Scroll edge effects, not hard dividers": `border-b border-cem-text/10` was
// exactly the 1px border the rule names, so it is gone. The scrim below is painted
// from `.cem-scroll-scrim` and fades the incoming content into the material.
// `.cem-contrast-edge` re-introduces a border ONLY under `prefers-contrast: more`,
// where a defined contrasting edge is what §14 asks for and translucency cannot
// carry it.
const SURFACE =
  'cem-material cem-contrast-edge bg-cem-base/70 backdrop-blur-2xl backdrop-saturate-150 ' +
  '[@media(prefers-reduced-transparency:reduce)]:bg-cem-base/95 ' +
  '[@supports_not(backdrop-filter:blur(1px))]:bg-cem-base/95'

// APPLE §1, "Respond on pointer-down, not on release". Emil's baseline is
// `transform: scale(0.97)` on `:active` on the 100-160ms band, and it was MISSING
// on every pressable element in the landing. `transition-transform` rather than the
// existing `duration-200`, because 200ms is past the 160ms top of the band for
// press feedback and this is the one interaction where latency is most visible.
// `active:scale-[0.97]` is Tailwind's arbitrary-value form of scale(0.97); the
// value is inline in the class name and therefore emitted, unlike a computed one.
const PRESS = 'transition-transform duration-150 ease-out active:scale-[0.97]'

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
            already at.

            §15, TRACKING IS SIZE-SPECIFIC. This is `text-lg` at 18px, which sits
            in the band where Apple says small text wants slightly POSITIVE
            tracking for legibility, and this was `tracking-tight`, which is
            negative. Negative tracking at 18px is a display treatment applied at a
            size that does not want it, so it is now neutral. That is also what
            the letters themselves prefer: CEMURM is all capitals with wide
            letterforms, so negative tracking on top of that closes the gaps for no
            gain. The two directions are NOT flattened: the hero eyebrow at 12px
            keeps positive 0.18em, the display wordmark keeps negative, and body
            copy stays at zero. */}
        <span className="order-1 text-lg font-semibold tracking-normal text-cem-amber">
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
              className={`inline-flex min-h-12 items-center text-sm font-medium text-cem-secondary duration-200 hover:text-cem-text ${PRESS} ${FOCUS}`}
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
          className={`order-2 inline-flex min-h-12 items-center rounded-full bg-cem-amber px-5 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 sm:order-3 ${PRESS} ${FOCUS}`}
        >
          {landing.cta.label}
        </a>
      </div>

      {/* §12, the scroll edge. `absolute` against the header's own box, so it sits
          exactly below the material and travels with it as the page scrolls. It is
          `pointer-events: none` and carries no id, so it can never intercept a
          click meant for the nav beneath it. Hidden entirely under
          `prefers-reduced-transparency: reduce` and `prefers-contrast: more`,
          where there is nothing to fade into. */}
      <div
        className="cem-scroll-scrim bg-gradient-to-b from-cem-base/70 to-cem-base/0"
        aria-hidden="true"
      />
    </header>
  )
}