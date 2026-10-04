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
  // `body` is optional and is the reason a prose section needs no component
  // change: Section resolves eyebrow, title AND body from here by id, so adding
  // copy cannot bypass the content module. Filled in slices L3a onward; a
  // section with no `body` still renders as a title over its slot.
  //
  // Every claim below is grounded in features/*.feature, which is the product
  // source of truth (713 scenarios). The feature each paragraph comes from is
  // named in a trailing comment, because a marketing claim that contradicts a
  // scenario is a bug in the copy, not a matter of taste.
  sections: [
    { id: 'hero', eyebrow: 'Stage Bus', title: 'Una canción, tres lecturas.' },
    {
      id: 'problema',
      eyebrow: 'El problema',
      title: 'Una hoja no alcanza en el escenario.',
      // features/personal-preferences-and-adaptations.feature ("Setlist fixes the
      // agreed key for the band": one agreed key, Juan renders A, Pedro renders
      // E) · features/song-lifecycle.feature ("Incomplete chart is flagged as
      // not ready", "Setlist picker shows readiness") · the same file's
      // "Every chart edit creates a version entry" plus "Personal chord
      // substitution" staying personal until promoted.
      body: [
        'Una hoja lleva un solo tono. En el setlist el tono acordado es uno y cada ' +
          'músico ve el chart canónico renderizado en el suyo, así que la misma pieza ' +
          'necesita una hoja distinta por mano. El setlist no: es el mismo item.',
        'La hoja tampoco sabe si está lista. El readiness se calcula por versión, y ' +
          'si faltan la letra, el coro o el tono acordado, el selector del setlist lo ' +
          'avisa antes de que alguien lo descubra en el escenario.',
        'Y una hoja no tiene historia. Cada cambio en un chart deja una versión con ' +
          'editor, fecha y qué cambió, y una sustitución personal se queda en tu ' +
          'dispositivo hasta que tú decides promoverla.',
      ],
    },
    {
      id: 'alcance',
      eyebrow: 'Definición',
      title: 'Qué es y qué no.',
      // "El cuaderno digital de música" is upstream 8.1 row 4's own one-liner.
      // The two non-goals are upstream 8.1 row 4's own, and each is lifted from a
      // non-goal the suite already declares rather than invented:
      // features/music-notation.feature frames notation as import-and-VIEW, and
      // src/domain/chart/parser.js scopes itself to chord-pro; and
      // features/gigs-and-performance-history.feature has a NON-GOALS block at
      // lines 151-165 naming, verbatim, no calendar sync, no recurring series, no
      // ticket/RSVP/attendees, and venue data stopping at name, location and type.
      body: [
        'CEMURM es el cuaderno digital de la música: el chart, la letra, el setlist, ' +
          'el ensayo y el registro de lo que efectivamente se tocó. El repertorio vive ' +
          'aquí y se actualiza desde aquí.',
        'No es un editor de notación. Leemos y escribimos charts; la partitura no es ' +
          'la fuente ni el resultado.',
        'No es una app de gestión de concierto. No hay sincronización con calendario, ' +
          'ni series recurrentes, ni entradas, RSVP ni lista de asistentes, ni ' +
          'ubicación en un mapa. Del concierto nos interesa la música.',
      ],
    },
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