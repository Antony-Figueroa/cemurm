/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

// L8 — this file used to BE the layout: one title-over-a-slot frame, worn by all
// thirteen sections, which is why the landing read as a blog. It is now a
// dispatcher. Everything a section carries still resolves from the registry by
// `id`, so copy cannot bypass the content module.

import { landing } from '../../../content/landing.es.js'
import { FAMILIES, paragraphs } from './Layouts.jsx'

export default function Section({ id, children }) {
  const section = landing.sections.find((entry) => entry.id === id)

  // A hand-written id that is not in the registry renders nothing rather than an
  // untitled section. Landing.jsx only ever passes ids the registry itself
  // produces, so this guards a later edit, not a runtime path.
  if (!section) return null

  // One call serves every family. The families that need the raw arrays read
  // `section.body` / `section.steps` themselves and ignore the second argument,
  // which JavaScript allows; `bento` in particular has to derive its cell count
  // from the content (§4.7) rather than receive pre-built nodes. An unknown
  // family name falls back to fullBleed rather than throwing, because a typo
  // should degrade one section instead of blanking the page.
  const family = FAMILIES[section.family] ?? FAMILIES.fullBleed
  return family(
    section,
    children ?? paragraphs(section),
    section.centred === true,
    section.narrow === true,
  )
}