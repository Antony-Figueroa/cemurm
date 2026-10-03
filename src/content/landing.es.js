// Marketing copy for the landing surface (odd/tasks/landing-page.md, slice L1).
//
// Every string a landing component renders resolves from this module — the
// components hold no copy literals of their own. A later slice adds
// `landing.en.js` plus a `useLocale()` hook; no i18n library, and no change to
// any app file. A `sections[].id` is the anchor target the header nav and the
// primary CTA link to, so an id is structure rather than copy and stays ASCII.
//
// VOCABULARY is reused exactly (odd/tasks/cemurm-brand-landing.md 8.3), never
// invented: repertorio, chart, chart canónico, renderizado personal, setlist,
// tono acordado, transposición, capo, sección, grado, readiness, anotación,
// colaborador, compañero, ensayo, concierto, registro, organización, sede,
// bloque, hoja de ruta, plan freeze, sustitución, parte, colección,
// biblioteca pública, consentimiento de tutor, Stage Mode, vista de práctica,
// vista de audiencia, overlay, Stage Bus.
//
// THREE RULES ARE LOAD-BEARING ENOUGH TO RESTATE HERE:
//
//   1. `servicio` never means a worship service. It is ambiguous for a church
//      audience, so the section the upstream plan titles "El ciclo del
//      servicio" is "El ciclo del culto" here. `culto` and `junta` are the
//      sanctioned words.
//   2. No tier, number or institutional proof point appears below. None is
//      verified yet, so the only price claim is the beta one the plan already
//      owns, and there is no user count, no customer and no licence claim about
//      code this page cannot show.
//   3. `repertorio` is singular, and `Repertorios` belongs to the brand name
//      alone — so the brand string below is bare.
//
// `cue` is a banned word. It appears nowhere in `src/` — but that is NOT the
// same as nowhere in the project: `docs/propuestas/live-engine-sesion-en-vivo.md`
// and `docs/architecture-current.html` both still contain it. Upstream 8.3 claims
// "zero occurrences across all 45 feature files", which is true of features/ and
// false of the repository, so the ban is unwritten for `docs/`.

export const landing = {
  brand: 'CEMURM',

  // Rendered by the hero in L2. Kept here now so the structure is one file the
  // day a second locale exists, and it asserts nothing checkable.
  tagline: 'El cuaderno digital de música.',

  // Labels only: the href is built as `#${item.id}` by the header, so a nav
  // label can never point at a section that does not exist.
  nav: [
    { id: 'problema', label: 'El problema' },
    { id: 'stage-bus', label: 'Stage Bus' },
    { id: 'precios', label: 'Precios' },
    { id: 'faq', label: 'FAQ' },
  ],

  // A CTA says exactly what happens. Not "Enviar".
  cta: {
    label: 'Unirme a la lista de espera',
    href: '#waitlist',
  },

  footer: {
    note: 'CEMURM está en beta. El acceso se abre por lista de espera.',
    // LICENSE is MIT, verified at the repository root.
    license: 'Licencia MIT.',
  },

  // The 13-section registry that carries the page structure. Thirteen is the
  // count upstream 8.1 draws, resolved for a scaffold where the header and the
  // footer are chrome components rather than registry entries: the hero demo,
  // the eleven titled sections, and the closing waitlist block that sits
  // immediately above the footer.
  //
  // L1 fills no children. L2 fills `hero` with the Stage Bus demo, L3 the
  // prose sections, L4 `stage-bus` and `roles`.
  sections: [
    { id: 'hero', eyebrow: 'Stage Bus', title: 'Una canción, tres lecturas.' },
    { id: 'problema', eyebrow: 'El problema', title: 'Una hoja no alcanza en el escenario.' },
    { id: 'alcance', eyebrow: 'Definición', title: 'Qué es y qué no.' },
    { id: 'ciclo', eyebrow: 'El ciclo', title: 'El ciclo del culto.' },
    { id: 'stage-bus', eyebrow: 'Stage Bus', title: 'Stage Bus.' },
    { id: 'split', eyebrow: 'El modelo', title: 'El chart canónico y el renderizado personal.' },
    { id: 'roles', eyebrow: 'Roles', title: 'Capacidades por rol.' },
    { id: 'organizacion', eyebrow: 'Organización', title: 'Institucional y multi-sede.' },
    { id: 'limites', eyebrow: 'Límites', title: 'Lo que no hacemos.' },
    { id: 'offline', eyebrow: 'Datos', title: 'Offline y datos.' },
    { id: 'precios', eyebrow: 'Precios', title: 'Gratis durante la beta.' },
    { id: 'faq', eyebrow: 'Preguntas', title: 'Preguntas frecuentes.' },
    { id: 'waitlist', eyebrow: 'Acceso', title: 'Unirme a la lista de espera.' },
  ],
}

export default landing