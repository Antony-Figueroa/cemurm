/* eslint-disable react/prop-types -- the shape is { onSubmit } and it is
   optional; there are no propTypes anywhere in src/ (see FeedbackForm.jsx:1). */

import { useState } from 'react'
import { landing } from '../../../content/landing.es.js'
import GlassIcon from './GlassIcon.jsx'
import SpecularButton from './SpecularButton.jsx'
import ClickSpark from './ClickSpark.jsx'

// Dark section with subtle gradient (alpha classes), same treatment as the other sections.
// No solid block, no raw colour function (gate 01a).

// The form is a single email field + a specular CTA. The button is the amber primary; the
// field is a glass tile with a system colour icon (sky, the "communication" colour in the set)
// and a label that is the content module's input.label. The CTA fires on press and the feedback
// (success / error) comes from the content module's registro.input success/error strings.

// Spark on press — mounted only where a real pointer exists and motion is not reduced, same
// gate as the repo's existing ClickSpark call sites. Spark color is cem.amber, resolved from the
// token class, never a literal.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

export default function Registro({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)
  const [sparkPos, setSparkPos] = useState({ x: 0, y: 0 })

  const canSpark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches !== false &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError(true)
      setSubmitted(false)
      return
    }
    setError(false)
    setSubmitted(true)
    if (onSubmit) onSubmit(email)
    // Reset after a beat so the visitor can register another address if they want.
    setTimeout(() => {
      setSubmitted(false)
      setEmail('')
    }, 3500)
  }

  const handlePress = (e) => {
    if (canSpark && e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      setSparkPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
  }

  return (
    <section
      id="registro"
      className="border-t border-cem-text/10 px-4 py-20 md:px-6 md:py-28 bg-cem-base overflow-hidden"
    >
      {/* Background — subtle gradient with alpha classes, no raw colour function (gate 01a). */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-tl from-cem-secondary/8 via-transparent to-cem-amber/6" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl">
        {/* Eyebrow + title + subtitle. */}
        <div className="mb-6 text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
            {landing.registro.eyebrow}
          </p>
          <h2 className="text-3xl font-semibold tracking-tighter leading-[1.05] text-cem-text md:text-5xl">
            {landing.registro.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-cem-secondary">
            {landing.registro.subtitle}
          </p>
        </div>

        {/* Form. */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          noValidate
        >
          <div className="relative flex w-full flex-1 flex-col items-stretch gap-2 sm:flex-row">
            <GlassIcon kind="chart" color="sky" />
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={landing.registro.input.placeholder}
              className={`flex-1 rounded-cem-md border border-cem-text/15 bg-cem-surface/80 py-3 pl-12 pr-4 text-sm text-cem-text placeholder:text-cem-secondary/60 backdrop-blur-sm focus:border-cem-amber/50 focus:outline-none ${FOCUS}`}
              aria-label={landing.registro.input.label}
            />
          </div>

          <SpecularButton
            type="submit"
            label={landing.registro.input.button}
            onPress={handlePress}
          />

          {/* Spark on press. Mounted only where a real pointer exists and motion is not
              reduced. Spark color is cem.amber, resolved from the token class, never a
              literal. */}
          {canSpark && (
            <ClickSpark
              sparkColor="bg-cem-amber"
              sparkSize={9}
              sparkRadius={16}
              sparkCount={7}
              duration={380}
              extraScale={1.1}
              style={{ position: 'fixed', left: sparkPos.x, top: sparkPos.y, pointerEvents: 'none', zIndex: 9999 }}
            />
          )}
        </form>

        {/* Feedback — a simple in-line message rather than a toast, because this section is the
            page's registration point and the visitor's attention is here. The same strings the
            content module carries.
            NEUTRAL, NOT HUED. The token layer defines no error colour and no success colour, and
            cem.amber is reserved for the wordmark, the primary CTA and the selected state, so
            both pills stay neutral and are separated by their icon and their wording. That also
            keeps colour from being the only cue (WCAG 1.4.1). The two pills differ by surface:
            the notice is a light wash, the error is a solid elevated block. */}
        <div className="mt-4 text-center text-sm">
          {submitted && !error && (
            <span className="inline-flex items-center gap-2 rounded-full bg-cem-text/15 px-4 py-2 text-cem-text">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {landing.registro.input.success}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-2 rounded-full bg-cem-elevated/60 px-4 py-2 text-cem-text">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {landing.registro.input.error}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
