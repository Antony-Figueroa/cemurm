/* eslint-disable react/prop-types -- the shape is { onSubmit } and it is
   optional; there are no propTypes anywhere in src/ (see FeedbackForm.jsx:1). */

import { useState } from 'react'
import { landing } from '../../../content/landing.es.js'
import VideoBG from './VideoBG.jsx'
import MaskedHeading from './MaskedHeading.jsx'
import GlassIcon from './GlassIcon.jsx'
import SpecularButton from './SpecularButton.jsx'
import ClickSpark from './ClickSpark.jsx'

// Closing section — the page's last conversion point. Same treatment as Registro (email +
// specular CTA + click-spark + feedback), but behind a second video background and the
// masked-heading reveal. The video is the visitor's ambient media choice and is NOT killed by
// reduced motion; what IS killed is the synthetic parallax on the parent, of which there is
// none here, so nothing to kill.

// One amber primary CTA on screen at a time; this section's CTA is the ghost outline variant on
// a dark surface, not a second amber pill. It submits the form it sits in: there is no href, so
// the visitor's typed address reaches the same handler the Enter key reaches.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cem-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-cem-base'

export default function CtaFinal({ onSubmit }) {
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
      id="cta-final"
      className="relative overflow-hidden px-4 py-20 md:px-6 md:py-28 bg-cem-base"
    >
      {/* Second video background — placeholder until you connect the real file. */}
      <div className="absolute inset-0 -z-10">
        <VideoBG src="" overlay />
        {/* Extra dark gradient at the bottom so the headline area is the brightest part. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cem-base/90 via-cem-base/40 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Subtle gradient with alpha classes over the video, no raw colour function (gate 01a). */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-tr from-cem-amber/8 via-transparent to-cem-secondary/6"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        {/* Eyebrow + headline + subtitle. */}
        <div className="mb-6">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cem-secondary">
            {landing.ctaFinal.eyebrow}
          </p>
          <MaskedHeading
            as="h2"
            text={landing.ctaFinal.title}
            stagger={0.12}
            duration={1.1}
            className="text-3xl font-semibold tracking-tighter leading-[1.05] text-cem-text md:text-5xl"
          />
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-cem-secondary">
            {landing.ctaFinal.subtitle}
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
              className={`flex-1 rounded-cem-md border border-cem-text/15 bg-cem-base/80 py-3 pl-12 pr-4 text-sm text-cem-text placeholder:text-cem-secondary/60 backdrop-blur-sm focus:border-cem-amber/50 focus:outline-none ${FOCUS}`}
              aria-label={landing.registro.input.label}
            />
          </div>

          {/* Ghost outline submit. No href: this button sits inside its own form, so it must
               submit it rather than navigate away and drop what the visitor typed. */}
          <SpecularButton
            type="submit"
            label={landing.ctaFinal.cta.label}
            ghost
            onPress={handlePress}
          />

          {/* Spark on press. */}
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

        {/* Feedback. Both pills are neutral for the same reason Registro documents: the token
            layer has no error or success colour, so icon and wording carry the meaning. */}
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
