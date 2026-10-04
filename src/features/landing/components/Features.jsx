import { motion, useReducedMotion } from 'motion/react'
import { landing } from '../../../content/landing.es.js'
import GlassIcon from './GlassIcon.jsx'

// Dark section with subtle gradient (alpha classes), same treatment as the other sections.
// No solid block, no raw colour function (gate 01a).

// BENTO. One card per body paragraph, derived from content, so an empty tile is not
// expressible. The grid is 2-col on md+ with the first card spanning full width (the same
// rhythm the existing L8 bento uses), and 1-col on mobile. Each card is glass-icon (colour
// from the system set, amber default) + headline + one line, with a glow layer (bg-cem-amber/10)
// on hover that fires amber (the one accent) and never a second colour. The glow is a layer
// behind the card, not a box-shadow with rgba (gate 01a).

// ANIMATED LIST. The steps are an ordered list with staggered clip reveal on scroll entry
// (IntersectionObserver with once:true), critically damped spring per Apple default, reduced
// motion collapses to plain text.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

const COLORS = ['amber', 'emerald', 'sky', 'rose', 'coral', 'violet']

export default function Features() {
  const reduce = useReducedMotion()

  return (
    <section
      id="features"
      className="border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-28 bg-cem-base overflow-hidden"
    >
      {/* Background — subtle gradient with alpha classes, no raw colour function (gate 01a). */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cem-amber/10 via-transparent to-cem-secondary/8" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        {/* Eyebrow + title. */}
        <div className="mb-6 max-w-3xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
            {landing.features.eyebrow}
          </p>
          <h2 className="text-3xl font-semibold tracking-tighter leading-[1.05] text-cem-text md:text-5xl">
            {landing.features.title}
          </h2>
        </div>

        {/* BENTO GRID. */}
        <div className="mt-12 grid grid-cols-1 gap-px bg-cem-text/15 md:grid-cols-2">
          {landing.features.cards.map((card, index) => {
            const color = COLORS[index % COLORS.length]
            const isFirst = index === 0

            return (
              <motion.div
                key={card.id}
                className={`relative bg-cem-elevated p-8 ${isFirst ? 'md:col-span-2' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Hover glow layer — bg-cem-amber/10 behind the card, not a box-shadow with
                    rgba (gate 01a). The card has a relative parent so the glow sits behind. */}
                <div className="absolute -inset-1 rounded-cem-lg bg-cem-amber/0 transition-colors duration-200 hover:bg-cem-amber/10" aria-hidden="true" />

                {/* Glass icon + eyebrow + headline + body. */}
                <div className="relative z-10 flex items-start gap-4">
                  <GlassIcon kind={card.icon} color={color} />
                  <div>
                    {card.eyebrow && (
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-cem-secondary">
                        {card.eyebrow}
                      </p>
                    )}
                    <h3 className="text-lg font-semibold text-cem-text">{card.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-cem-secondary">
                      {card.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ANIMATED LIST — the ordered steps. */}
        <div className="mt-16 max-w-2xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
            Cómo funciona
          </p>
          <ol className="space-y-6">
            {landing.features.steps.map((step, index) => (
              <li key={index} className="group">
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className="text-sm font-semibold tabular-nums text-cem-secondary transition-colors duration-200 group-hover:text-cem-amber"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <motion.p
                    className="text-lg leading-relaxed text-cem-secondary"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : index * 80, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {step}
                  </motion.p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-2 block h-px origin-left bg-cem-text/20"
                  style={{ transition: 'opacity 200ms ease' }}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
