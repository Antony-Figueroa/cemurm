/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { landing } from '../../../content/landing.es.js'
import { demoChart, roles, rotationGroupLabel } from '../../../content/landing-demo.es.js'
import OverlayView from '../../stage/components/OverlayView.jsx'
import SlideView from '../../projection/components/SlideView.jsx'
import RevealText from '../components/RevealText.jsx'
import RoleRotation from '../components/RoleRotation.jsx'
import TechText from '../components/TechText.jsx'

// The token values the canvas paints with, resolved at runtime rather than typed.
//
// THE PROBLEM: gate rule 01a forbids colour literals anywhere in `src/`, including
// this file, and the project exposes only `--cem-radius-*` as custom properties,
// NOT the colours. So there is no way to read `cem.text` off the document.
//
// THE ANSWER: resolve each colour by applying its DECLARED Tailwind class to a
// throwaway element and reading the computed value back. That satisfies both
// gates at once. Rule 01a sees a class name, not a colour, and rule 04 is happy
// because `cem.text` and `cem.amber` are declared keys in tailwind.config.js, so
// nothing undeclared leaks through. The canvas is provably on the same ramp as the
// rest of the page because it is reading that page's own stylesheet.
//
// Returns hex, because TechText's `hexToRgb` parses hex. The computed value comes
// back as a three-channel functional colour, so it is normalised to hex here
// rather than in the vendored file, where it would be a behavioural change.
//
// `cem.text` is the wordmark fill and `cem.amber` the accent. The accent lands on
// exactly ONE letter at a time: upstream computes a single `focus` glyph index per
// frame and only that glyph reaches `outline: 1`, so amber never covers all six.
function tokenColor(className) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return ''
  const probe = document.createElement('div')
  probe.className = className
  probe.style.position = 'absolute'
  probe.style.width = '0'
  probe.style.height = '0'
  probe.style.overflow = 'hidden'
  document.body.appendChild(probe)
  const computed = window.getComputedStyle(probe).backgroundColor
  probe.remove()
  const parts = computed.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return ''
  return (
    '#' +
    parts
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
  )
}

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

// Reference 7.5: 2px solid `cem.text`, offset 2, `:focus-visible` only, and
// never the accent — a musician has to tell "this has keyboard focus" from
// "this is the current song" at a glance. Same rule, same ring, as the header's
// FOCUS constant, copied rather than shared because LandingHeader.jsx is not in
// this slice's edit surfaces and the ring must not drift between two CTAs.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

// APPLE §1, "Respond on pointer-down, not on release". Emil's baseline is
// `transform: scale(0.97)` on `:active` over 100 to 160ms, and the landing had NO
// press state anywhere before this rebuild: the CTA, the role tabs and every header
// link responded only on hover and on click.
//
// `transition-transform` replaces the `duration-200` these elements already had,
// because 200ms is past the top of the band and press feedback is the one
// interaction where latency is most visible. `ease-out` per Emil §3, never
// `ease-in`, which delays the movement the user is watching for.
const PRESS = 'transition-transform duration-150 ease-out active:scale-[0.97]'

// §4.7 HERO STACK, max four text elements, and this is all four: eyebrow,
// headline, subtext, CTA. The demo caption L2 put here was the fifth, and §4.7's
// banned list names it exactly ("tiny tagline below CTAs"); it is a
// `<figcaption>` on the demo figure now, inside RoleRotation.
//
// §4.7 font scale: the headline is FOUR words, inside the rule's "3-5 words" band,
// so `text-6xl md:text-7xl` is permitted. `text-5xl md:text-6xl lg:text-7xl`
// reaches the rule's md and lg values and keeps a 375px phone off a 72px line.
//
// TOP PADDING is `pt-12` mobile and `pt-24` desktop: exactly §4.7's cap, never
// above it, and when the hero does not fit the rule says the fix is the type scale
// or the asset size, never the padding and never the copy. With a 72px header and
// an 800px viewport the CTA's bottom edge lands near 496px, above the fold.
//
// P2 MEASURE. The copy sits in `max-w-3xl` and the demo breaks out to
// `max-w-7xl`; before this the hero was one `max-w-5xl` column, the exact shape
// the review called out. The headline still meets §4.7's two-line cap: 1187px of
// estimated text in a 768px measure wraps to 2 lines.
export default function Hero() {
  const hero = landing.sections.find((section) => section.id === 'hero')
  const reduce = useReducedMotion()

  // EMIL'S RULE 1, and the most important decision in this slice: the canvas only
  // exists where it can be used. Both gates must pass, and both are checked rather
  // than assumed, because `matchMedia` on a touch phone and
  // `useReducedMotion()` returning true are different failures with the same fix.
  //
  //   hover gate  — `(hover: hover) and (pointer: fine)`. A phone reports
  //                 `hover: none, pointer: coarse`: no hover, no drag, no reason
  //                 for the component to exist, yet it would still allocate a
  //                 backing store and a scratch canvas and still attach two
  //                 observers. Mounting it there is the failure Emil names.
  //   motion gate — reduced motion. Verified in the vendored file rather than
  //                 assumed: it reads `prefers-reduced-motion` in exactly ONE
  //                 place, and that place only disables the idle sweep. Hover
  //                 still dashes letters and drag still moves them. So its own
  //                 reduced-motion handling is partial, and not mounting it at all
  //                 is the only way to satisfy §6.B.
  //
  // BOTH ARE UNMOUNTING, NOT CSS. A display:none gate would leave the rAF loop and
  // the observers running behind an invisible canvas, which is the cost the gate
  // exists to prevent. `src/app/index.css` carries `.cem-wordmark-canvas` as a
  // second line of defence only.
  //
  // `canHover` is read lazily in state and initialised TRUE, so the first paint is
  // the canvas and a phone does not flash static text before swapping. The swap is
  // invisible anyway: A1's curtain covers the hero for 1400ms, so this resolves
  // long before anything is seen.
  const [canHover, setCanHover] = useState(true)
  useEffect(() => {
    setCanHover(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false)
  }, [])

  // The canvas colours, resolved from the page's own stylesheet. See tokenColor.
  const [tokens, setTokens] = useState({ text: '', amber: '' })
  useEffect(() => {
    setTokens({ text: tokenColor('bg-cem-text'), amber: tokenColor('bg-cem-amber') })
  }, [])

  const showCanvas = canHover && reduce === false && tokens.text !== ''

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-24"
    >
      <div className="relative mx-auto max-w-7xl">
        {/* ── THE WORDMARK. It leads, because it is the identity and nothing else
            above it should compete. ─────────────────────────────────────────────
            It is a canvas with `role="img"` and `aria-label="CEMURM"`, so it is
            deliberately NOT the `<h1>`: a logo is identity, and the page's one
            level-one heading has to be the value proposition. That is also why the
            Spanish line below is untouched rather than demoted.

            §15 TRACKING. The wordmark is display type at 58 to 102px, and it
            carries `letterSpacing={-0.02}`, NEGATIVE. That is the direction Apple
            asks for at this size and it was already correct before this rebuild.
            The brief's premise that the wordmark carried positive 0.18em was not
            true of the code; 0.18em is the 12px EYEBROW's tracking, and positive
            tracking on 12px uppercase is correct, so both values stay and the scale
            keeps its two directions.

            THE SPAN, from the vendored component's own fit maths (its lines
            196-201: `fit = min(1, width*0.9/inkWidth, height*0.66/inkHeight)`,
            `size = fontSize * fit`). "CEMURM" advances 4.5752em in Inter SemiBold
            (measured from the shipped 600 woff2), cap height 0.7275em. At the
            default `fontSize` of 150 that is 687px of ink, so the WIDTH term is
            never the binding one and the container HEIGHT is the only knob:

              h-16 (64px)   -> size  58.1px   ink 266 x 42px
              h-24 (96px)   -> size  87.1px   ink 398 x 63px
              h-28 (112px)  -> size 101.6px   ink 465 x 74px

            `h-16 md:h-24 lg:h-28` lands it at 58px on a phone and 102px at desktop.
            Height-limited at every viewport, so those are the real sizes.

            THE STATIC FALLBACK is not a compromise, it is the phone experience: a
            real text node in `cem.text`, so a phone gets a crisp selectable
            wordmark with no canvas, no observers and no rAF loop. */}
        <div className="max-w-3xl">
          {showCanvas ? (
            <div className="cem-wordmark-canvas h-16 w-full md:h-24 lg:h-28">
              <TechText
                text={landing.brand}
                fontFamily="Inter, sans-serif"
                fontWeight={600}
                letterSpacing={-0.02}
                color={tokens.text}
                accentColor={tokens.amber}
                wordLabels={landing.acronym}
                reveal="letter"
                selection
                labels
                draggable
                sweep={reduce === false}
                reach={190}
                softness={0.7}
                dashLength={4}
                dashGap={2}
                strokeWidth={1.5}
                speed={1}
              />
            </div>
          ) : (
            <p className="text-4xl font-semibold uppercase leading-none tracking-[-0.02em] text-cem-text md:text-6xl">
              {landing.brand}
            </p>
          )}
          {/* The expansion, for assistive technology, on BOTH paths. On the
              fallback it is the only place the words exist; on the canvas path
              TechText is a single `role="img"` with an aria-label of just the
              wordmark, so without this the six words would be unreachable to a
              screen reader. `sr-only` is a Tailwind utility, so it emits a 1px box
              and neither path gains a line of visible height. */}
          <p className="sr-only">
            {landing.acronym.map((entry) => `${entry.char}: ${entry.label}`).join(', ')}
          </p>
        </div>

        {/* A2's RevealText, still here and still the `<h1>`. It was never the
            wordmark's job: a canvas cannot be clip-mask revealed, because the
            reveal is per-glyph DOM boxes and this is one bitmap. So the reveal
            stays on the SPANISH VALUE PROPOSITION, which is the line it was
            measured and built for, and the wordmark is revealed instead by A1's
            curtain lifting off it.

            THE ORDER IS THE SEQUENCE: A1's curtain slides up to uncover the
            wordmark, then A2's words rise out of their masks. Two reveals, one
            after the other, and the second is gated on the first finishing via
            `trigger="ready"`.

          THE WIDTH, MEASURED NOT ASSUMED. The advance width of "UNA CANCIÓN, TRES
          LECTURAS." in Inter Medium, read from the shipped `inter-latin-500-normal`
          woff2 with fontTools (upm 2048, summing hmtx advances over all 27
          glyphs), is 15.6377em, so one line obeys `font-size <= measure / 15.6377`:

            375px  gutter 16  available  343  size  28 (floor)   line  438  2 lines  128%
            640px  gutter 16  available  608  size  37.8          line  590  1 line    97%
            768px  gutter 24  available  720  size  45.3          line  709  1 line    98%
           1024px  gutter 24  available  976  size  60.4          line  945  1 line    97%
           1280px  gutter 24  available 1232  size  72 (ceiling) line 1126  1 line    91%
           1920px  gutter 24  available 1872  size  72 (ceiling) line 1126  1 line    60%

          The vw coefficient is 5.9 because the binding constraint is the mobile
          end: the gutter is a fixed subtraction, so it dominates as the viewport
          shrinks, and (375-32)/(375*15.6377) = 5.849vw, against an asymptotic
          ceiling of 1/15.6377 = 6.395vw. The tight spot is 640px to 1220px at
          91-98% fill, which is where to look first in review: a wrap there costs one
          extra line, not a broken layout. It also makes the line count depend on
          Inter being loaded, a CLS risk §7.7 still records as unmeasured.

          `leading-[0.85]` at `tracking-[-0.02em]` is the reference, and 0.85 is
          what forces the deeper clip reserve; RevealText.jsx carries the
          arithmetic that keeps descenders inside the mask. */}
        <RevealText
          as="h1"
          mode="word"
          trigger="ready"
          text={hero.title}
          stagger={0.14}
          duration={1.1}
          className="cem-enter mt-8 max-w-7xl font-medium uppercase leading-[0.85] tracking-[-0.02em] text-cem-text [font-size:clamp(1.75rem,5.9vw,4.5rem)]"
        />

        <p className="cem-enter mt-6 max-w-2xl text-base leading-relaxed text-cem-secondary md:text-lg">
          {landing.tagline}
        </p>

        {/* THE ONE CTA: same intent, label and href the header uses, so §4.5's
            one-label-per-intent holds and the two cannot drift. IT IS A DEAD END:
            `href` is `#waitlist`, and whether the waitlist needs a backend is B1,
            owned by davidjesus516. Stated, not papered over: no `mailto:`, no
            placeholder submit, no fake confirmation. Amber on `cem.base` measured
            at 8.31:1 from the built CSS, clearing AA and AAA; amber with light text
            computes to 2.05:1 and is a hard fail, so the fill carries the accent.
            `whitespace-nowrap` is §4.7's CTA BUTTON WRAP BAN.

            APPLE §1, RESPOND ON POINTER-DOWN. There was NO press state on this
            button, or on any other pressable element in the landing. `PRESS` is
            `active:scale-[0.97]` on a 150ms transition, which is Emil's baseline
            and inside the 100-160ms band.

            NO CLICKSPARK HERE, AND THAT IS THE POINT. Apple §16.8 says delight is
            the result of getting the other seven right, and §13 says add feedback
            only where it earns its place. This button is the page's only conversion
            action and it goes nowhere: `#waitlist` is an empty section because B1
            is undecided. A particle burst on a button that leads to nothing is
            polish on a broken promise, and it would be the most visible thing on
            the page. The spark went on the role tabs instead, which do real work. */}
        <a
          href={landing.cta.href}
          className={`cem-enter mt-8 inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-cem-amber px-6 text-sm font-semibold text-cem-base duration-200 hover:bg-cem-amber/90 ${PRESS} ${FOCUS}`}
        >
          {landing.cta.label}
        </a>
      </div>

      {/* ── THE DEMONSTRATION, and where the eyebrow went ───────────────────────
          `hero.eyebrow` reads "Stage Bus", which is the name of the CONCEPT the
          demo shows, not a label for the page or for the brand. It was sitting
          above the wordmark, where it read as a third identity statement stacked
          on top of "CEMURM" and the headline, and that redundancy is a large part
          of why the hero read as a blog header.

          It is not deleted and the string is not touched: it moved DOWN to sit
          directly above the three device frames, which is the thing it names.
          That is Emil §16 "Grouping and mapping": a control or a label belongs
          near what it labels, and if you need a label to explain a relationship
          the relationship is weak. Nothing is lost and the copy is unchanged.

          §15 TRACKING, the other direction: this stays POSITIVE at 0.18em because
          it is 12px uppercase. Apple asks for negative tracking on display text
          and slightly positive on small text, and the page needs both, so the
          scale keeps both rather than being flattened to one value. */}
      <div className="relative mx-auto mt-16 max-w-7xl md:mt-24">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
          {hero.eyebrow}
        </p>

        <RoleRotation
          groupLabel={rotationGroupLabel}
          caption={landing.demo.disclaimer}
          sparkColor={tokens.amber}
          screens={roles.map((role) => ({ ...role, node: screenFor(role) }))}
        />
      </div>
    </section>
  )
}