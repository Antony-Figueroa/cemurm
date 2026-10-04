/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { landing } from '../../../content/landing.es.js'

// L8 — the layout families the thirteen sections are spread across.
//
// P0 GHOST WORDS GONE. R1's giant word behind five sections collided with body
//   copy and was clipped by the section edge, so it read as a layout artifact.
//   Removed, not repositioned: decoration that fights legibility is worse than
//   none. `cem-ghost` went from index.css with it.
//
// P1 VALUE CONTRAST. `cem.base`, `cem.surface` and `cem.elevated` are three steps
//   of one navy ramp, too close to separate sections at section scale. `block`
//   now picks between TWO values, `bg-cem-base` and `bg-cem-stage-bg` (true
//   black), alternating for a rhythm a reader can feel. `surface` and `elevated`
//   are demoted to NESTED fills, where their smaller difference reads as an edge.
//
// P1, USING A PERFORMANCE-SURFACE TOKEN HERE. `cem.stage.*` is reserved for the
//   projector and the landing is not one, so the reuse needs a reason: true black
//   is the darkest value available; the step from `cem.base` down to `cem.surface`
//   is too small to read across a full-bleed section; a new hue is forbidden and
//   so is a new token; `cem.stage.bg` is already in the palette, already part of
//   this brand's dark ramp, and is what the projector ships on.
//
// P2 MEASURE. Twelve sections, twelve compositions. Default alignment is left;
//   `align: 'right'` re-orients one so the eye resets, and `closing` is the single
//   centred band, which §4.3 permits where the composition earns it. The four
//   splits are uneven because `ratio` is data: 7/5, 4/8, 5/7, 8/4. P3 is Hero.jsx.
//
// §4.7: mobile collapse is declared per family; no two splits are adjacent; the
//   bento's cell array IS the body array, so an empty tile is not expressible; no
//   family uses a radius, so §4.4's lock still rests on R1's assignments, except
//   the closing CTA at `rounded-full`.
// NO MOTION. §9.1 gives scroll CSS to `el ciclo` alone; the hero owns §7.7's one.

/** Reference 7.5. Duplicated rather than shared because LandingHeader.jsx and
    Hero.jsx each carry a copy, and a focus ring that drifts is worse than a dup. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

/** Colour blocking. Two values only: navy and true black, see the P1 note above
    for why a performance-surface token does duty here. Built from a registry value,
    never a literal colour; unknown -> `base`. */
const BLOCKS = new Set(['base', 'stage-bg'])

// Col-span pairs for the splits, written out because Tailwind's JIT only emits a
// class it sees in source: a computed `col-span-${n}` emits nothing. First entry is
// the headline column.
const SPANS = {
  '7/5': ['md:col-span-7', 'md:col-span-5'],
  '5/7': ['md:col-span-5', 'md:col-span-7'],
  '4/8': ['md:col-span-4', 'md:col-span-8'],
  '8/4': ['md:col-span-8', 'md:col-span-4'],
}
const spans = (section) => SPANS[section.ratio] ?? SPANS['7/5']

const block = (section) => `bg-cem-${BLOCKS.has(section.block) ? section.block : 'base'}`

/** The eyebrow. §4.7 caps these at one per three sections; the registry carries
    four across thirteen. It KEEPS `uppercase` + wide tracking because that is the
    signature §4.7's pre-flight check counts — the restraint is in the REGISTRY. */
export function Eyebrow({ children }) {
  return (
    <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
      {children}
    </p>
  )
}

/** Every family's eyebrow + headline. One type scale, one place. */
function Head({ section, className = '', eyebrowClass = '' }) {
  return (
    <>
      {section.eyebrow && <Eyebrow className={eyebrowClass}>{section.eyebrow}</Eyebrow>}
      <h2
        className={`text-3xl font-semibold tracking-tighter leading-[1.05] text-cem-text md:text-5xl ${className}`}
      >
        {section.title}
      </h2>
    </>
  )
}

/**
 * Full-bleed: the page's WIDEST measure, `max-w-7xl` over a `max-w-[65ch]` body.
 * Two flags, no separate families: `narrow` drops to `max-w-4xl` and 58ch for a
 * single-measure editorial section, `centred` collapses to `max-w-3xl` for the
 * closing band. Three near-identical grids were three bodies to maintain for one
 * axis of difference, and §4.7 wants fewer shapes that each appear once.
 */
function fullBleed(section, children, centred = false, narrow = false) {
  return (
    <section
      id={section.id}
      className={`border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-28 ${centred ? 'text-center' : ''} ${block(section)}`}
    >
      <div className={`mx-auto ${centred ? 'max-w-3xl' : narrow ? 'max-w-4xl' : 'max-w-7xl'}`}>
        <Head section={section} className={centred ? 'mx-auto' : narrow ? '' : 'max-w-4xl'} />
        <div
          className={`mt-10 text-lg leading-relaxed text-cem-secondary ${
            centred ? 'mx-auto max-w-[65ch]' : narrow ? 'max-w-[58ch]' : 'max-w-[65ch]'
          }`}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

/**
 * Asymmetric split, `ratio` picking one of four uneven col-span pairs.
 * MOBILE: `grid-cols-1` below `md`; only the decorative rule is lost.
 * `align: 'right'` is the P2 INVERTER: narrow body left, wide headline flush
 * right. A flag and not a family, because it is the same grid with a different
 * text alignment, and one section doing it resets the eye where all of them
 * would just be a right-aligned page.
 */
function asymmetric(section, children) {
  const [head, body] = spans(section)
  const flipped = section.flip === true
  const right = section.align === 'right'
  return (
    <section
      id={section.id}
      className={`border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-28 ${block(section)}`}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
        <div className={`${head} ${flipped ? 'md:order-2' : ''}`}>
          <Head
            section={section}
            className={right ? 'md:text-right' : ''}
            eyebrowClass={right ? 'md:text-right' : ''}
          />
        </div>
        <div className={`${body} ${flipped ? 'md:order-1' : ''}`}>
          <div className="border-l-2 border-cem-text/15 pl-6 text-lg leading-relaxed text-cem-secondary">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Bento. One cell per body paragraph — derived from content, so an empty tile is
    not expressible (§4.7). `roles`: 4 paragraphs, 4 cells, first spans full
    width. MOBILE: `grid-cols-1`. */
function bento(section) {
  const cells = section.body ?? []
  return (
    <section
      id={section.id}
      className={`border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-24 ${block(section)}`}
    >
      <div className="mx-auto max-w-7xl">
        <Head section={section} className="max-w-3xl" />
        <div className="mt-12 grid grid-cols-1 gap-px bg-cem-text/15 md:grid-cols-2">
          {cells.map((cell, i) => (
            <div key={i} className={`bg-cem-elevated p-8 ${i === 0 ? 'md:col-span-2' : ''}`}>
              <p className="text-lg leading-relaxed text-cem-secondary">{cell}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Numbered index list — the one family for a genuinely ordered thing, hence
    `ciclo` (§8.1 row 5: the cycle "is a sequence"). Takes the registry's `steps`;
    the scroll rail is `.cem-cycle-rail` in index.css. */
function indexList(section) {
  return (
    <section
      id={section.id}
      className={`px-4 py-20 md:px-6 md:py-24 ${block(section)}`}
    >
      <div className="mx-auto max-w-5xl">
        <Head section={section} />
        <ol className="mt-12">
          {(section.steps ?? []).map((step, i) => (
            <li key={step.term} className="group pb-6">
              <div className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="text-sm font-semibold tabular-nums text-cem-secondary transition-colors duration-200 group-hover:text-cem-amber"
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-semibold text-cem-text transition-colors duration-200 group-hover:text-cem-amber">
                  {step.term}
                </h3>
              </div>
              <p className="mt-2 pl-8 text-lg leading-relaxed text-cem-secondary">
                {step.detail}
              </p>
              <span aria-hidden="true" className="cem-cycle-rail mt-4 block h-px origin-left bg-cem-text/25" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** The closing band: COMPACT, centred, last. It replaces two full-height voids.
    `faq` and `waitlist` have no body, the six real questions do not exist and B1
    (does the waitlist need a backend) is undecided, so they get short padding and
    the CTA instead of empty height. That CTA is `landing.cta`, the same object the
    header and hero render: one label for one intent (§4.5). It is a dead end,
    because `#waitlist` resolves here with no form behind it: B1's consequence. */
function closing(section) {
  return (
    <section
      id={section.id}
      className={`border-t border-cem-text/10 px-4 py-14 text-center md:px-6 md:py-16 ${block(section)}`}
    >
      <div className="mx-auto max-w-2xl">
        {section.eyebrow && (
          <div className="flex justify-center">
            <Eyebrow>{section.eyebrow}</Eyebrow>
          </div>
        )}
        <h2 className="text-2xl font-semibold tracking-tighter leading-[1.1] text-cem-text md:text-4xl">
          {section.title}
        </h2>
        {section.cta && (
          <a
            href={landing.cta.href}
            className={`mt-8 inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-cem-amber px-6 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 ${FOCUS}`}
          >
            {landing.cta.label}
          </a>
        )}
      </div>
    </section>
  )
}

/** body paragraphs -> prose nodes, the input the prose families take. */
function paragraphs(section) {
  return (section.body ?? []).map((text, i) => (
    <p key={i} className="mb-6 text-lg leading-relaxed text-cem-secondary last:mb-0">
      {text}
    </p>
  ))
}

const FAMILIES = { fullBleed, asymmetric, bento, indexList, closing }

export { FAMILIES, paragraphs }
export default FAMILIES