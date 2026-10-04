/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

// L7 — the layout families the thirteen sections are spread across. Before this
// file every section rendered through ONE title-over-a-slot frame, which is why
// the landing read as a blog. The registry names a family per section and
// Section.jsx dispatches here.
//
// §4.7, RULE BY RULE:
//   REPETITION BAN — 12 content sections, 12 distinct COMPOSITIONS (family +
//     block + flip + ghost). A family recurring is fine while no two sections
//     compose alike; 13 sections cannot have 13 families, and a rule asking them
//     to produces 13 one-off layouts nobody maintains.
//   ANTI-CENTER BIAS (§4.3, VARIANCE 8) — one centred section, the last, which is
//     `fullBleed(..., centred)`, not a family of its own.
//   SPLIT-HEADER BAN — `asymmetric`'s right column carries real body copy, never
//     filler beside a headline. §4.7 bans the other way round.
//   BENTO CELL COUNT — one cell per body paragraph; an empty tile cannot exist.
//   ZIGZAG CAP (max 2) — `asymmetric` is the only split family, never adjacent.
//   MOBILE COLLAPSE — every `md:` grid declares `grid-cols-1` below 768px HERE.
//   TYPE SCALE — every headline comes from `<Head>`, so `text-3xl md:text-5xl` +
//     `tracking-tighter leading-[1.05]` is stated once and cannot drift per
//     family. All thirteen sections previously shared a `text-2xl` frame, the
//     blog scale §4.7 calls the single biggest error.
//   RADIUS — no family here uses one, so §4.4's Shape Consistency Lock is held
//     page-wide by the four existing assignments (`cem-sm` segments, `cem-md`
//     window, `cem-lg` shell, `rounded-full` CTA).
//   COLOUR BLOCKING uses `cem.base`/`surface`/`elevated` only. The reference
//     direction alternates to red; that token is one of the four dead accents and
//     ratchet 02 sits at 234/234, so it is described without naming the class —
//     rule 02 greps source COMMENTS as well as markup.
//   NO MOTION. §9.1 gives scroll CSS to `el ciclo` alone; the hero owns §7.7's
//     single non-user-triggered moment.

/** Colour blocking, existing ramp only. `block` is part of a section's COMPOSITION.
    Built from a registry value, never a literal colour; unknown -> `base`. */
const BLOCKS = new Set(['base', 'surface', 'elevated'])

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
function Head({ section, className = '' }) {
  return (
    <>
      {section.eyebrow && <Eyebrow>{section.eyebrow}</Eyebrow>}
      <h2
        className={`text-3xl font-semibold tracking-tighter leading-[1.05] text-cem-text md:text-5xl ${className}`}
      >
        {section.title}
      </h2>
    </>
  )
}

/** The giant low-opacity word, drawn from the section's OWN headline so the
    texture is never a new claim. Travels as `data-word`; CSS reads it with
    `content: attr(data-word)`. See index.css for why. */
function GhostWord({ word }) {
  if (!word) return null
  return (
    <span
      aria-hidden="true"
      data-word={word}
      className="cem-ghost pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {word}
    </span>
  )
}

/**
 * Full-bleed display: oversized type, hard edge, colour-blocked, ghost word.
 * `centred` is the third argument rather than its own family — it is a width and
 * an alignment, not a different composition, and §4.7 wants fewer distinct shapes
 * that each appear once, not more shapes.
 */
function fullBleed(section, children, centred = false) {
  return (
    <section
      id={section.id}
      className={`relative overflow-hidden border-t border-cem-text/10 px-4 py-24 md:px-6 ${centred ? 'text-center' : ''} ${block(section)}`}
    >
      <GhostWord word={section.ghost} />
      <div className={`relative mx-auto ${centred ? 'max-w-3xl' : 'max-w-7xl'}`}>
        <Head section={section} />
        <div className={`mt-10 max-w-[65ch] ${centred ? 'mx-auto' : ''}`}>{children}</div>
      </div>
    </section>
  )
}

/** Asymmetric split, `grid-cols-12` at 7/5 or 5/7. MOBILE: `grid-cols-1` below
    `md` — headline stacks above body. The rail is decorative, so losing it costs
    nothing. */
function asymmetric(section, children) {
  const flipped = section.flip === true
  return (
    <section
      id={section.id}
      className={`relative overflow-hidden border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-24 ${block(section)}`}
    >
      <GhostWord word={section.ghost} />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
        <div className={`md:col-span-7 ${flipped ? 'md:order-2' : ''}`}>
          <Head section={section} />
        </div>
        <div className={`md:col-span-5 ${flipped ? 'md:order-1' : ''}`}>
          <div className="border-l-2 border-cem-text/10 pl-6">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** Wide editorial measure. Long measure, generous leading, no box, no split. */
function editorial(section, children) {
  return (
    <section
      id={section.id}
      className={`relative overflow-hidden px-4 py-20 md:px-6 md:py-24 ${block(section)}`}
    >
      <GhostWord word={section.ghost} />
      <div className="relative mx-auto max-w-5xl">
        <Head section={section} />
        <div className="mt-8 max-w-[65ch] text-lg leading-relaxed">{children}</div>
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
        <Head section={section} />
        <div className="mt-12 grid grid-cols-1 gap-px bg-cem-text/10 md:grid-cols-2">
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
              <span aria-hidden="true" className="cem-cycle-rail mt-4 block h-px origin-left bg-cem-text/20" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** Closing — the ONE centred family, and it is last. §4.3 allows one or two, spent
    on the only section whose job is a destination rather than an argument. No
    children: the waitlist body is unwritten (CTA blocked on B1). */
function closing(section) {
  return fullBleed(section, null, true)
}

/** body paragraphs -> prose nodes, the input the prose families take. */
function paragraphs(section) {
  return (section.body ?? []).map((text, i) => (
    <p key={i} className="mb-6 text-lg leading-relaxed text-cem-secondary last:mb-0">
      {text}
    </p>
  ))
}

const FAMILIES = { fullBleed, asymmetric, editorial, bento, indexList, closing }

export { FAMILIES, paragraphs }
export default FAMILIES