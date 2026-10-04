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
    {
      id: 'ciclo',
      eyebrow: 'El ciclo',
      title: 'El ciclo del culto.',
      // Section 8.1 row 5 and the placement rationale under it: this is
      // sequential, so it is numbered rather than written as prose — hence
      // `steps` instead of `body`.
      //
      // TWO TERMS TRANSLATED, and both deliberately. Upstream 8.1 writes the
      // sequence in English shorthand ("lifecycle", "performance"), but 8.3's
      // binding vocabulary is the list that may appear on the page, and neither
      // word is on it. `chart` and `concierto` are. So "Ciclo del chart" and
      // "Concierto" carry them, with the English kept only where 8.3 asks for
      // it — `plan freeze` is on the list verbatim.
      //
      // Every step was checked against BOTH the feature file and the repository
      // that implements it, per the L3a lesson that a feature states intent and
      // the code states behaviour:
      steps: [
        {
          // features/song-lifecycle.feature:10-32 ("Incomplete chart is flagged
          // as not ready", "Missing required metadata keeps a song from being
          // ready") and :51-55 ("Every chart edit creates a version entry").
          // Implementation: domain/chart/readiness.js computeReadiness, called
          // from songs.js:273, with readiness tracked per version at
          // songs.js:269-273 — not per song.
          term: 'Ciclo del chart',
          detail:
            'El chart nace en borrador y queda listo cuando tiene letra, acordes y tono ' +
            'acordado. Cada corrección deja una versión con autor, fecha y qué cambió.',
        },
        {
          // features/rehearsal-workflow.feature:10-15 (agenda built from a
          // setlist, each song keeping its agreed key), :72-76 ("Carried over:
          // needs work"), :78-82 (notes attach to the song, not to the chart).
          // Implementation: rehearsals.js createRehearsal, publishRehearsal,
          // markOutcome, recordRun, updateNote, changeSetlistItemKey.
          term: 'Ensayo',
          detail:
            'El ensayo se arma desde el setlist y cada canción conserva su tono acordado. ' +
            'Lo que queda sin pulir se arrastra al siguiente, con sus notas.',
        },
        {
          // features/published-plan-freeze.feature:10-13 (publishing snapshots
          // the plan), :15-19 ("Changed after publish"), :42-46 ("the draft is
          // never executed on stage"). Implementation: services.js:637
          // publishPlan, :655 getPublishedPlan, :669 listPlanVersions, over
          // migration 0021_plan_freeze.sql.
          term: 'plan freeze',
          detail:
            'Publicar congela el plan. Lo que edites después queda marcado como cambio ' +
            'posterior y nunca es lo que se ejecuta.',
        },
        {
          // features/live-performance-mode.feature:10-14 (full-screen setlist,
          // minimal controls), :70-75 (transpose during the performance),
          // :106-111 (works fully offline). The record half:
          // features/gigs-and-performance-history.feature:84-94 records skipped
          // songs and songs played outside the setlist separately.
          // Implementation: gigs.js:613 completeGig with validateCompletion:354.
          term: 'Concierto',
          detail:
            'En Stage Mode el setlist entero cabe en la tablet, con tu renderizado ' +
            'personal y sin conexión si hace falta. Al terminar queda registro de lo que ' +
            'se tocó y de lo que no.',
        },
        {
          // features/substitutions-and-coverage.feature:10-15 (unavailability
          // opens a request), :28-33 (the first confirmed accept covers it),
          // :39-45 (call sheet shows the agreed key G, the substitute's chords
          // render in A, the stored plan is unchanged), :106-110 (logged as
          // "Bass: Pedro (sub for Lucia)"). Implementation: substitutions.js
          // markUnavailable, sendSubstitutionRequest, respondSubstitution,
          // cancelSubstitution, reclaimAssignment, overruleSubstitution,
          // substitutionCandidates, instrumentTransposition, renderSemitones.
          term: 'Sustitución',
          detail:
            'Si alguien falta, la parte se cubre con un compañero que la recibe en su ' +
            'propio tono. El plan no se toca y la cobertura queda registrada.',
        },
        {
          // features/congregation-projection.feature:16-21 (the congregation
          // display shows lyrics and slide titles, "and it does not show chords,
          // keys, rehearsal notes, or controls") and :113-118 ("Personal
          // annotations never leak to the display", substitutions not rendered
          // either). Implementation, verified by reading the components rather
          // than trusting the feature: SlideView.jsx renders only the four slide
          // kinds and never a chord, a key or an annotation, and
          // OverlayView.jsx:60-63 drops every chord-pro `comment` section.
          // Implementation of the transport: projection.js buildDeck,
          // nextSlide, goTo, syncState.
          //
          // DELIBERATELY OMITTED: that feature file also specifies projection
          // rights blocking. It is not mentioned here, because asserting
          // anything about licensing is exactly what 8.2 forbids without a
          // verified source.
          term: 'Proyección',
          detail:
            'La proyección muestra la letra y el título de cada sección. Ni acordes, ni ' +
            'tonos, ni anotaciones personales, ni controles.',
        },
      ],
    },
    { id: 'stage-bus', eyebrow: 'Stage Bus', title: 'Stage Bus.' },
    {
      id: 'split',
      eyebrow: 'El modelo',
      title: 'El chart canónico y el renderizado personal.',
      // Section 8.1 row 7: "Why one shared arrangement serves N musicians
      // without forking." This closes the loop L3a's `problema` opened — that
      // section showed one agreed key with Juan rendering A and Pedro E; this
      // one explains the mechanism that makes it possible without anyone forking
      // the chart.
      //
      // features/personal-preferences-and-adaptations.feature:151-163 ("Setlist
      // fixes the agreed key for the band", "Toggle between agreed key and
      // personal key"), :183-194 (annotations and chord substitutions stored per
      // profile; the shared chart keeps the original), :196-201 ("Create version
      // from my changes" records the source it came from).
      // features/song-lifecycle.feature:51-79 (every chart edit creates a
      // version entry; rollback; diff; "Version history cannot be edited").
      // Implementation: domain/music/transpose.js `initialSemitones` (per-song
      // override beats the global offset), `capoLabel`, `transposeParsed`;
      // domain/music/annotations.js; and substitutions.js:542 `renderSemitones`
      // for the per-instrument render.
      body: [
        'Un chart, muchas manos. El chart canónico es uno solo y el setlist fija el ' +
          'tono acordado para todos. Cada dispositivo lo renderiza en el suyo: la ' +
          'transposición y el capo son tuyos, y nadie necesita una copia propia.',
        'Tus cambios también son tuyos. Una anotación o una sustitución de acorde se ' +
          'guardan en tu perfil y no le aparecen a nadie más. Si quieres compartirlas, ' +
          'promotes una versión nueva y queda registrada con su autor y el chart del que ' +
          'salió.',
        'Y nada se pierde en silencio. Cada edición deja una versión con autor, fecha y ' +
          'qué cambió, se puede volver a una anterior, y el historial no se edita ni se ' +
          'borra.',
      ],
    },
    { id: 'roles', eyebrow: 'Roles', title: 'Capacidades por rol.' },
    { id: 'organizacion', eyebrow: 'Organización', title: 'Institucional y multi-sede.' },
    {
      id: 'limites',
      eyebrow: 'Límites',
      title: 'Lo que no hacemos.',
      // Section 8.1 row 10: "The declared non-goals, each with its reason." Same
      // technique L3a used for `alcance`, and deliberately a DIFFERENT set: the
      // two non-goals already stated there (not a notation editor, not a gig
      // manager with calendar/ticketing/maps) are not repeated here.
      //
      // All three are lifted from a NON-GOALS block the suite already declares,
      // and each was checked against the implementation too.
      body: [
        // features/music-theory.feature:248-252 ("The system never guesses a
        // song's key" — the app shows "Key not declared" and offers "Declare
        // key" but does not infer from the chords) and :260 ("Harmonic function
        // is never auto-assigned"). Implementation: the missing base key is a
        // real readiness gate, not just a label —
        // domain/chart/readiness.js via songs.js:273, and
        // features/song-lifecycle.feature:28-32 is the scenario that proves it
        // ("Not ready: missing base key"). A church band will be tempted to
        // infer a key from a chord chart; refusing is the honest answer, because
        // a wrong key silently transposes the whole service.
        'No adivinamos el tono. Si un chart no lo declara, aparece como tono no ' +
          'declarado y la canción no queda lista hasta que alguien lo fije. ' +
          'Preferimos avisarte a suponer por ti y tocar medio tono abajo.',
        // features/practice-mode.feature:186-195 ("Audio playback, recording,
        // and shared practice are out of scope"): no playback engine, no backing
        // tracks, no audio file import, no slow-down or loop, no recording, no
        // shared practice session. Deliberately NOT claiming there is no
        // metronome: there is one — features/live-performance-mode.feature:84-94
        // and personal-preferences:237-240 put a tempo control in Stage Mode and
        // in practice mode. This paragraph is about audio, which is a different
        // thing from a click track.
        'No reproducimos audio. No hay motor de reproducción, ni pistas de ' +
          'acompañamiento, ni grabación de lo que ensayas. El ensayo guarda cómo va ' +
          'la canción, no cómo suena.',
        // features/community-moderation.feature "No automation, voting, legal
        // machinery, auto-ban, or cross-org moderation": no content-scanning bot,
        // no public voting, no built-in legal process — and, from the same file,
        // an appeal is reviewed by a different moderator, never the original
        // decider. Worth stating to an institutional buyer precisely because
        // minors are in scope (features/minors-and-guardian-consent.feature): the
        // consent ledger is a ledger, not an automation.
        'No moderamos en automático. No hay bot que revise contenido, ni votación ' +
          'pública: las decisiones las toman moderadores, y una revisión siempre la ' +
          'hace alguien que no tomó la decisión original.',
      ],
    },
    {
      id: 'offline',
      eyebrow: 'Datos',
      title: 'Offline y datos.',
      // Section 8.1 row 11: "What works without a connection and what does not."
      // docs/technical-spec.md:523 names offline-first with sync as this
      // product's DEFINING property, which is exactly why the last two paragraphs
      // are about what it refuses to do. A section that only listed strengths
      // would be the failure mode here: every one of the limits below is a
      // deliberate decision in code, and a visitor who finds one out after
      // subscribing has been told something false.
      //
      // The offline layer was read, not assumed: src/offline/queue.js,
      // src/offline/drainer.js, src/offline/cache.js and
      // src/domain/offline/drainFailure.js.
      body: [
        // features/live-performance-mode.feature:106-111 ("Performance mode
        // works fully offline": navigate between songs, lyrics and chords render,
        // transpose and tempo still work).
        // features/offline-access.feature:6-11 (browse repertoire, open any
        // cached song). features/congregation-projection.feature:123-127
        // (projection keeps running offline from cached slides).
        // Implementation: drainer.js:132 startOfflineSync drains on the `online`
        // event; cache.js owns the IDB read cache (DB_VERSION 3).
        'En el escenario, sin conexión, Stage Mode funciona entero: recorres el ' +
          'setlist, la letra y los acordes se ven, y la transposición y el tempo ' +
          'siguen respondiendo. La proyección también, desde las diapositivas guardadas.',
        // features/offline-access.feature:13-19 ("the setlist is saved locally
        // with a 'pending sync' flag... syncs to the server and the flag is
        // cleared"), :21-25 (proximity code still generated offline).
        // features/rehearsal-workflow.feature:117-122, features/gigs-and-
        // performance-history.feature:141-148 and substitutions-and-coverage
        // :133-138 all queue the same way. Implementation: queue.js
        // enqueueOp/pendingOps is a client-only FIFO outbox in IndexedDB keyed by
        // seq, and drainer.js:226 drainPending replays strictly in that order so
        // an op never lands before the one it depends on.
        'Lo que escribes sin conexión no se pierde: queda en el dispositivo con la ' +
          'marca de pendiente, y al volver la red se aplica en el mismo orden en que ' +
          'lo hiciste.',
        // THE HONEST HALF. Read from drainer.js, not inferred.
        // (a) Supersession: RECONCILE_OPS (drainer.js:91) reconciles only
        //     addSongToSetlist and removeSongToSetlist against the CURRENT server
        //     setlist, and a queued add whose song was removed elsewhere is
        //     DROPPED with a notice (drainer.js:202). A substitution accepted
        //     offline that someone else already took is likewise dropped
        //     (drainer.js:266).
        // (b) Quarantine: drainFailure.js:281 decides RETRY vs QUARANTINE. An op
        //     the server rejected for good — an RLS denial, a validation guard, a
        //     conflict — is set aside rather than retried forever, and
        //     quarantineNotice (drainFailure.js:293) tells the user to make the
        //     change again. Quarantined ops stay on the device; they are not
        //     deleted (queue.js:240).
        // (c) The queue can pause: drainer.js:279-293 breaks the loop on a
        //     transient or unclassifiable failure so seq order survives, which
        //     means one stuck op holds the ops behind it until it resolves.
        'Ahora lo que no te prometo. Si entre tu cambio y tu sincronización otra ' +
          'persona movió lo mismo, tu cambio se descarta y te decimos cuál fue; una ' +
          'sustitución que ya se cubre, también. Y si el servidor rechaza un cambio ' +
          'de plano, no lo reintentamos para siempre: lo apartamos y te pedimos que ' +
          'lo hagas de nuevo.',
        // drainer.js:5-6 states it outright: "the rest is last-write-wins. Upgrade
        // when offline-edit-conflict-policy lands." So two devices that edit the
        // same thing while both are offline do NOT merge — the later write wins
        // and the earlier one is gone, with no notice, because the server never
        // saw a conflict to report. That is the single most important thing a
        // visitor can be surprised by, and it is the one clause here with no
        // user-facing notice behind it.
        'El resto se resuelve con la última escritura gana. Solo las altas y bajas ' +
          'de canciones de un setlist se comparan con el servidor antes de aplicarse; ' +
          'en lo demás, si dos dispositivos escriben lo mismo sin conexión, uno pisa ' +
          'al otro y no te avisamos.',
      ],
    },
    { id: 'precios', eyebrow: 'Precios', title: 'Gratis durante la beta.' },
    { id: 'faq', eyebrow: 'Preguntas', title: 'Preguntas frecuentes.' },
    { id: 'waitlist', eyebrow: 'Acceso', title: 'Unirme a la lista de espera.' },
  ],
}

export default landing