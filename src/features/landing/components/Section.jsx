/* eslint-disable react/prop-types -- see FeedbackForm.jsx:1 for the convention. */

// L7 — this file used to BE the layout: one title-over-a-slot frame, worn by all
// thirteen sections, which is why the landing read as a blog. It is now a
// dispatcher. The registry names a family per section; this hands off to
// Layouts.jsx, which holds every layout decision.
//
// Everything a section carries — eyebrow, title, body, steps, block, ghost, flip
// — still resolves from the registry by `id`, so copy cannot bypass the content
// module. The only field a component owns is `children`, and only `bento` and the
// fallback use it.

import { landing } from '../../../content/landing.es.js'
import { FAMILIES, paragraphs } from './Layouts.jsx'

export default function Section({ id, children }) {
  const section = landing.sections.find((entry) => entry.id === id)

  // A hand-written id that is not in the registry renders nothing rather than an
  // untitled section. Landing.jsx only ever passes ids the registry itself
  // produces, so this guards a later edit, not a runtime path.
  if (!section) return null

  const family = FAMILIES[section.family]

  // An unknown family name is a registry bug, and falling through to the editorial
  // family is better than throwing: a typo degrades one section's layout instead
  // of blanking the page.
  if (!family) return FAMILIES.editorial(section, children ?? paragraphs(section))

  // `bento` and `indexList` need the paragraph/step arrays, not nodes, because
  // they derive their cell count from the content (§4.7 bento cell count rule).
  if (section.family === 'bento') {
    return FAMILIES.bento(section, section.body ?? [])
  }

  return family(section, children ?? paragraphs(section))
}