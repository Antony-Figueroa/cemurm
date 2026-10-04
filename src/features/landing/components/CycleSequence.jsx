/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

// Plan section 8.1 row 5, rendered the way the plan insists it must be:
// "Numbered — it genuinely is a sequence." So this is an <ol>, not the prose
// block `body` renders.
//
// FROZEN PROP SHAPE — { steps }
//   steps: Array<{ term: string, detail: string }>, in the order they happen.
//          `term` is the canonical product name, reused exactly rather than
//          translated (section 8.3 lists the vocabulary that is not invented),
//          and `detail` is the Spanish sentence around it. Both are copy, so both
//          arrive from the content module; this component holds no strings.
//
// WHY THE ACCENT IS ON HOVER AND NOT ON THE SCROLL POSITION. The obvious design
// is amber on whichever step is currently on screen. Pure CSS cannot do it:
// `animation-timeline` animates declared properties, and the only way to name
// amber in this stylesheet is a colour literal, which gate rule 01a forbids in
// src/ — keyframes included. A Tailwind class is the only legal source of the
// accent, and a scroll timeline cannot toggle one. So the split is deliberate:
// the SCROLL carries progression (the rail fills) and the POINTER carries the
// accent (the term turns amber on hover). At most one step is amber at any
// moment, which is what rule 2 of the visual system actually asks for — one
// accent, not a row of them. Nothing here is focusable, so there is no
// focus-within variant to write.
//
// The rail's motion is declared in src/app/index.css, not here: it is one
// `@keyframes` plus one `@supports`, and keeping it in CSS is what makes it
// zero-cost and JavaScript-free.
export default function CycleSequence({ steps }) {
  return (
    <ol className="mt-8 max-w-2xl">
      {steps.map((step, index) => (
        <li key={step.term} className="group pb-6">
          <div className="flex items-baseline gap-3">
            {/* The number is decorative: <ol> already announces "item N of 6",
                so rendering it as text too would read it twice. */}
            <span
              aria-hidden="true"
              className="text-sm font-semibold tabular-nums text-cem-secondary transition-colors duration-200 group-hover:text-cem-amber"
            >
              {index + 1}
            </span>
            {/* text-xl is the reference's `heading` role at 20px, and its
                built-in 1.75rem leading is 1.4 against the role's 1.3 — the
                nearest real step, no arbitrary line height. */}
            <h3 className="text-xl font-semibold text-cem-text transition-colors duration-200 group-hover:text-cem-amber">
              {step.term}
            </h3>
          </div>

          <p className="mt-2 pl-8 text-lg leading-snug text-cem-secondary">{step.detail}</p>

          {/* `h-px` and no radius: reference 5.5 makes a separator a 1px
              hairline with no corner treatment. `origin-left` is what makes
              scaleX grow from the leading edge, so the fill reads left to right. */}
          <span
            aria-hidden="true"
            className="cem-cycle-rail mt-4 block h-px origin-left bg-cem-text/20"
          />
        </li>
      ))}
    </ol>
  )
}