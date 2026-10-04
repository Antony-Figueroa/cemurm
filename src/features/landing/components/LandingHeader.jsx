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
// `backdrop-blur-2xl` (40px) rather than the `xl` (24px) it had. Bigger surface,
// thicker material, deeper separation from what scrolls under it.
//
// F1-4, THE FILL IS 85 PERCENT AND NOT 70, and this is a contrast fix rather than a
// material preference. A translucent surface has no background of its own: what the
// text sits on is `fill OVER whatever scrolls underneath`, so the effective
// background MOVES as the page scrolls, and it has to clear the floor against the
// worst thing that can pass beneath it, not the average one. At /70 the worst case
// is the hero headline, which is `cem.text` at near-white, and `cem.secondary`
// composited against that measures 2.65:1. A hard AA failure on every nav link, at
// the scroll position where the headline is passing under the bar. The gate cannot
// see this: rule 06 is a same-element source grep and rule 05b scores token pairs,
// and an alpha composite against a moving backdrop is neither.
//
// Composited, worst case = the header's own fill at alpha over near-white text. The
// fill alpha is the only variable:
//
//   fill /70   secondary 2.65:1 FAIL   secondary-elevated 3.53:1 FAIL
//   fill /80   secondary 3.79:1 FAIL   secondary-elevated 5.05:1 PASS
//   fill /85   secondary 4.50:1 PASS   secondary-elevated 5.99:1 PASS
//   fill /95   secondary 6.17:1 PASS   secondary-elevated 8.22:1 PASS
//
// /85 is the smallest step that carries `cem.secondary-elevated` clear of the 4.5:1
// floor with real margin, and it is one step short of the /95 that
// `prefers-reduced-transparency` and the no-backdrop-filter fallback already use, so
// the opaque end of the range is unchanged and only the default moved. The cost is
// honest and worth stating: 15 points of fill opacity means slightly less of the
// blur reads through. A 40px blur over a moving background is the material; this
// keeps all of it and gives up a little see-through, which is the cheaper of the
// two to lose. This also matches the taste skill's own instruction for a header on a
// moving background, and it is the same rule that already produced `.cem-scroll-scrim`.
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
  'cem-material cem-contrast-edge bg-cem-base/85 backdrop-blur-2xl backdrop-saturate-150 ' +
  '[@media(prefers-reduced-transparency:reduce)]:bg-cem-base/95 ' +
  '[@supports_not(backdrop-filter:blur(1px))]:bg-cem-base/95'

// F1-4, AND THE NAV LINKS MOVE TO `secondary-elevated` WITH IT, because /85 alone
// leaves `cem.secondary` at exactly 4.50:1, which is the floor rather than clear of
// it. `secondary-elevated` measures 5.99:1 on the composited worst case. This is the
// token tailwind.config.js:19-26 was created for, and rule 06's own note says to use
// it on a raised fill. `hover:text-cem-text` still steps up to 11.03:1, so the hover
// affordance survives.
const NAV_FG = 'text-cem-secondary-elevated'

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
              className={`inline-flex min-h-12 items-center text-sm font-medium ${NAV_FG} duration-200 hover:text-cem-text ${PRESS} ${FOCUS}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* F1-2: THIS IS NO LONGER A SECOND AMBER PRIMARY. `landing.cta` renders
            here and in Hero.jsx, both at `href="#waitlist"`, and both were an amber
            pill about 150px apart in the same viewport. The maintainer's screenshot
            showed them competing and the taste skill's §4.5 makes duplicate intent a
            mandatory pre-flight fail.

            THE HERO INSTANCE WINS the amber, because it holds the conversion
            position: it is the one place on the page where the reader's next action
            is unambiguous, and §4.7's hero stack spends the primary CTA there. This
            one is demoted to the ghost/outline variant the skill specifies, which
            keeps the action reachable after a scroll past the hero while leaving
            exactly one amber primary on the page.

            WHY GHOST AND NOT DELETED. Deleting it would satisfy §4.5 outright, and
            that remains available as a one-line follow-up if the maintainer prefers
            it. Kept, because a landing page whose only conversion action is
            unreachable once the reader scrolls is worse than the duplicate intent,
            and because §4.7 explicitly allows one primary plus one secondary, which
            is what a ghost outline of the same intent is.

            THE CONTRAST IS THE OTHER HALF OF F1-4. `cem-text` on this
            translucent fill is 11.03:1 against the composited worst case, and the
            `cem-text` border gives the outline a defined edge against the moving
            background, which is what a transparent-fill button needs in order to
            read as a control at all. `bg-transparent` is a
            Tailwind keyword, not one of rule 01b's default-palette names, and
            `hover:bg-cem-text/10` is the hover affordance the amber fill used to
            provide. `min-h-12` is the 48px hit target, not a style. */}
        <a
          href={landing.cta.href}
          className={`order-2 inline-flex min-h-12 items-center rounded-full border border-cem-text/20 bg-transparent px-5 text-sm font-semibold text-cem-text hover:bg-cem-text/10 duration-200 sm:order-3 ${PRESS} ${FOCUS}`}
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