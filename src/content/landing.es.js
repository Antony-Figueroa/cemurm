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

  // What the hero's device demo is, said next to the demo rather than in the
  // hero copy. Verbatim from the string L2 hard-coded in Hero.jsx: section 8.2
  // forbids asserting a licence nobody has checked, and this is the honest form
  // of that sentence. It moved into this module because a landing component
  // holding a copy literal is the thing L1 set out to remove, and it is now a
  // `<figcaption>` on the demo figure rather than a line of hero copy.
  demo: {
    disclaimer: 'Demostración con datos de ejemplo, no una pieza real.',
  },

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

  // The wordmark's expansion, shown one letter at a time as the hero canvas is
  // hovered or dragged. "Community-Centered MUsical Repertories Manager": the
  // capitalised letters spell CEMURM.
  //
  // IN ORDER, and the order is the order of the letters in the wordmark, because
  // that is how TechText indexes them. Index order matters more than it looks:
  // the two M glyphs stand for DIFFERENT words, MUsical and Manager, so a lookup
  // keyed on the character would label both of them "Musical". The `from` field is
  // kept so a reader can check the capitalisation against the expansion without
  // counting letters, and so correcting a word is a one-line change.
  //
  // This lives here rather than in a component because L1's rule is that every
  // string the landing renders resolves from this module, and a second
  // demo-content module would be the first place on the page where landing copy
  // lived outside it.
  acronym: [
    { char: 'C', from: 'Community', label: 'Comunidad' },
    { char: 'E', from: 'Centered', label: 'Centrado' },
    { char: 'M', from: 'MUsical', label: 'Musical' },
    { char: 'U', from: 'MUsical', label: 'Musical' },
    { char: 'R', from: 'Repertories', label: 'Repertorios' },
    { char: 'M', from: 'Manager', label: 'Gestor' },
  ],

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
      family: 'fullBleed',
      narrow: true,
      block: 'stage-bg',
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
      family: 'asymmetric',
      block: 'base',
      ratio: '7/5',
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
      family: 'indexList',
      block: 'stage-bg',
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
    {
      id: 'stage-bus',
      family: 'fullBleed',
      block: 'base',
      title: 'Stage Bus.',
      // Section 8.1 row 6: "Three roles defined, with the one-line definition the
      // coined term requires." Stage Bus is this repo's own name for one chart
      // feeding several differently-projected views, so the FIRST paragraph is the
      // definition itself. A coined term that is never defined is unreadable to
      // anyone outside the team, and this is the only place on the page that can
      // do it.
      //
      // The definition is written to match what the CODE does, not a marketing
      // gloss of it, and it was assembled by reading the surfaces the hero
      // already renders:
      //  · musicos   — the performer's own view: the personal key, capo and
      //    transposition. domain/music/transpose.js `initialSemitones`
      //    (per-song override beats the global offset) and `capoLabel`
      //    ("Capo 2 · sounds D"), driven by data/repositories/preferences.js.
      //  · publico   — the audience/stream view: features/stage/components/
      //    OverlayView.jsx, which at :60-63 SKIPS every chord-pro `comment`
      //    section, so a personal annotation is structurally incapable of
      //    reaching it. That is the strongest single fact in this section.
      //  · senal     — the signal/broadcast view: features/projection/components/
      //    SlideView.jsx, whose own header states it NEVER renders chords, keys,
      //    section keys or annotations.
      //
      // The hero (L2) already rotates these three inside device frames. This
      // section explains the idea and deliberately does NOT repeat the demo: no
      // second frame, no second rotation, no second motion moment.
      body: [
        // THE DEFINITION. One sentence, first, because the term is coined.
        'Stage Bus es una sola fuente —el chart canónico y el setlist— que alimenta ' +
          'varias vistas al mismo tiempo, cada una mostrando lo que esa persona ' +
          'necesita y nada más.',
        // Why one source and not one file per person. This is the same argument
        // L3a's `problema` made from the problem side and L3c's `split` made from
        // the model side; here it is stated from the capability side, which is why
        // it is about what each view DROPS rather than about keys.
        'Cada vista recorta lo que no le corresponde, y el recorte no es una copia: ' +
          'es el mismo chart, filtrado en el momento de emitirse.',
        // The consequence that makes the term worth having: a change lands once
        // and every view follows, so there is nothing to re-publish per screen.
        // Grounded in the same two components plus the offline path — the views
        // read the cached chart, so a stage with no connection still gets all
        // three (features/live-performance-mode.feature:106-111 and
        // features/congregation-projection.feature:123-127, both of which L3c
        // cites; implementation src/offline/cache.js, DB_VERSION 3).
        'Y si cambia el chart, cambian las tres a la vez. No hay que reemitir nada, ' +
          'ni sincronizar una copia por pantalla.',
        // The privacy half, which is the reason this capability is named at all.
        // features/congregation-projection.feature:113-118 ("Personal annotations
        // never leak to the display" and substitutions are not rendered either),
        // and features/minors-and-guardian-consent.feature:30-34.
        // Implementation: the guarantee is STRUCTURAL, not a filter — OverlayView
        // returns null for comment sections and SlideView never reads them, so
        // there is no setting that can leak them.
        'Lo que un músico escribe para sí mismo no sale de su pantalla. No es que lo ' +
          'escondamos: las vistas de emisión ni siquiera lo leen.',
      ],
    },
    {
      id: 'split',
      family: 'asymmetric',
      block: 'stage-bg',
      ratio: '4/8',
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
    {
      id: 'roles',
      family: 'bento',
      block: 'base',
      title: 'Capacidades por rol.',
      // Section 8.1 row 8: "Director de sistema / director de orquesta / músico /
      // instructor". Each capability below was checked against the implementation,
      // not just the feature file, because features/*.feature has now promised
      // behaviour the code does not have four times (MusicXML, ABC, the offline
      // reconnect path, org/branch RLS). Two of the four terms needed correcting
      // against the schema — see the `director de orquesta` and `instructor`
      // paragraphs, which say less than the plan's row does.
      body: [
        // Director de sistema. The role EXISTS: 0001_init.sql:61 `system_admin`
        // in the role enum, and it is enforced through
        // private.session_has_system_role (0016:43-51), which gates four things:
        // :81 and :104 (org lifecycle / the org tables), and :370 and :418 (the
        // promote/demote RPCs, so only a system admin can move a song to or from
        // the system repertoire). It also appoints moderators — 0015:224 reads
        // user_roles where role = 'system_admin'.
        'El director de sistema administra el repertorio del sistema: quién aporta ' +
          'qué, y qué biblioteca ve todo el mundo. También es quien nombra a los ' +
          'moderadores de la comunidad.',
        // "Director de orquesta" is a TERM, NOT A ROLE, and the schema says so.
        // Grepping migrations and src/ for orchestra|conductor|music_director
        // returns nothing but a comment about import-queue orchestration. The
        // capability is real; it is attached to setlist OWNERSHIP, not to a role.
        // Evidence: 0001_init.sql:546 creates setlists with
        // `created_by uuid NOT NULL -- setlist owner/director`, and 0002's
        // setlists_insert_owner / setlists_select_member policies scope it. For
        // the service plan the equivalent is leader_id: 0018_service_planning.sql
        // :113-136 gates insert/update/delete on leader_id = auth.uid(), which is
        // what features/service-planning.feature:98-102 ("Plan is read-only for
        // members until published") describes. So the Spanish term is kept —
        // it is the job, and section 8.3 says vocabulary is reused exactly — but
        // the copy attributes the powers to owning the setlist or leading the
        // culto, which is what is actually enforced.
        'Quien arma el setlist dirige: ordena las canciones, fija el tono acordado y ' +
          'publica el plan del culto. Publicar es lo que lo convierte en el plan ' +
          'que todos ejecutan; antes de eso, los demás solo pueden verlo.',
        // Músico. The performer level. Role enum 0001:66
        // ('org_member','performer','substitute'). Real capabilities, all in
        // code: Stage Mode reads the cached setlist and applies the personal
        // transpose and capo (domain/music/transpose.js initialSemitones,
        // capoLabel; live-performance-mode.feature:70-82), transpose and tempo
        // work offline (:106-111), and the performer's own annotations stay on
        // their profile (personal-preferences-and-adaptations.feature:183-187,
        // implementation domain/music/annotations.js). The performer also takes a
        // substitution and receives it in their own key
        // (substitutions-and-coverage.feature:39-45, implementation
        // data/repositories/substitutions.js renderSemitones at :542).
        'El músico ve su parte en su tono, con su capo y su tempo, funciona sin ' +
          'conexión y escribe sus propias anotaciones para sí mismo. Si cubre una ' +
          'parte que falta, la recibe en su propia tonalidad.',
        // INSTRUCTOR: specified, NOT implemented, except for one narrow thing.
        // This is the paragraph that had to shrink.
        //
        // What the features specify: education-courses-and-exercises.feature (18,
        // 26) and education-teaching-assignments.feature (27, 48, 55, 83, 91, 103)
        // describe courses, exercises, hand-outs, completion tracking and streaks.
        // What exists: NOTHING. Measured 2026-10-03 — there is no
        // src/features/education/ directory, no repository under
        // src/data/repositories/ for courses, exercises or assignments, and NO
        // migration creates a course, exercise, enrollment or streak table
        // (0001 has 48 CREATE TABLE statements and none of them is one).
        //
        // What instructor CAN do today, verified in policies: add songs at their
        // own branch (0016:145-161 songs_insert_scoped, whose comment reads
        // "instructor can add at own branch"), and update a promoted song of their
        // own source org (0016:166-179 songs_update_source_org, whose role list is
        // exactly 'instructor','branch_admin','org_admin','org_owner'). That is
        // two powers, both about repertoire. The only instructor reference in the
        // app is a label: src/features/orgs/pages/Organizations.jsx:17,20 lists
        // 'instructor' in ELEVATED_ROLES.
        //
        // So: say the two real ones, and say plainly that the teaching surface is
        // not here yet. Section 8.1's row lists instructor as a role with
        // capabilities, and writing the specified-but-absent ones would be the
        // fifth feature-file promise the landing would be repeating.
        'El instructor hoy añade canciones a su sede y mantiene las que su ' +
          'organización aportó al repertorio del sistema. La parte de enseñar —cursos, ' +
          'trabajos, seguir el avance de un alumno— todavía no está construida, y no ' +
          'queremos prometerla antes de que exista.',
      ],
    },
    {
      id: 'organizacion',
      family: 'asymmetric',
      block: 'base',
      ratio: '5/7',
      flip: true,
      title: 'Institucional y multi-sede.',
      // Section 8.1 row 9: "system → org → branch, roles, minors with guardian
      // consent". This is the most reputationally sensitive section on the page,
      // because part of it describes how children are handled, so every clause
      // below names BOTH a feature scenario and the migration or repository that
      // enforces it. Three of the four were verified this way rather than taken
      // from the feature file, and the fourth — branch visibility — is where the
      // feature file and AGENTS.md turn out to disagree. See the note on the
      // visibility paragraph.
      body: [
        // features/organizational-repertoire-model.feature:7-13 ("System
        // repertoire as the unified catalog") and :33-39 ("System-level song
        // available across all branches").
        // Implementation: migration 0016_org_repertoire_model.sql, policy
        // `songs_select_system` (lines 122-125) — `using (auth.uid() is not null
        // and org_id is null)`, so a system-level song is readable by EVERY
        // authenticated user, and the repository is
        // data/repositories/orgRepertoire.js.
        // NOTE ON AGENTS.md: its caution that "implemented RLS is owner-scoped
        // only" is STALE for songs. 0016 replaced the owner-only policies of
        // 0002 with four scoped ones, and songs_select_system is readable by any
        // authenticated session by design. What remains a design target is
        // docs/database-schema-v2.md §3.1's full visibility MATRIX, not this
        // clause. Stating the level model without claiming cross-org read access
        // is what keeps this honest.
        'Cuatro niveles: el repertorio del sistema, la organización, la sede y la ' +
          'canción de una persona. Una canción del sistema se puede usar en cualquier ' +
          'sede sin copiarla, y la organización que la aporta conserva la edición.',
        // features/organizational-repertoire-model.feature:31-45 ("Organization
        // with multiple branches", "Branch-specific repertoire addition").
        // Implementation: policy `songs_select_branch` (0016:136-143), gated on
        // private.user_branch_ids(auth.uid()), and `songs_select_org`
        // (0016:127-134) on private.is_org_member.
        'Una sede ve su propio material y el de su organización. Lo de otra sede no ' +
          'aparece hasta que alguien lo comparte, y compartirlo es una decisión ' +
          'consciente, no un efecto secundario.',
        // The minors half, and the reason this paragraph is written in the past and
        // conditional rather than as a promise.
        //
        // features/minors-and-guardian-consent.feature:10-19 (age gate; account
        // stays inactive until consent) and :20-24 (the ledger stores the
        // guardian's identity, the date and the text they saw).
        // Implementation, read in the migrations rather than the feature file:
        //  · 0031_guardian_consent_email.sql closed a REAL defect here — 0017 line
        //    88 shipped `status text not null default 'active'`, so consent was
        //    SELF-ASSERTED: the account holder typed a guardian's name and the row
        //    came out active, unlocking the account on the spot. 0031 changed the
        //    default to 'pending' and made the confirm path the only writer of
        //    consented_at.
        //  · The consent record is supervision evidence: guardian identity, date,
        //    and the exact wording shown, per 0031's header and
        //    private.record_guardian_consent (0017:259-313).
        //  · Only the GUARDIAN can close a pending request, through a one-shot
        //    emailed capability — supabase/functions/send-guardian-consent and the
        //    login-less confirm RPC (0031), rendered by
        //    features/auth/pages/GuardianConfirm.jsx, which refuses to auto-submit
        //    so a mail scanner or prefetcher cannot spend a child's consent.
        'Un menor de edad no abre una cuenta como adulto. El consentimiento de su ' +
          'tutor o tutora se pide a un adulto, por correo, con un enlace de un solo ' +
          'uso: hasta que ese adulto responde, la cuenta permanece cerrada y el ' +
          'consentimiento queda registrado con la fecha y el texto que leyó.',
        // The public-surface half, and the part that is genuinely enforced rather
        // than merely designed.
        //
        // features/minors-and-guardian-consent.feature:30-34 (publishing to the
        // public library is blocked without guardian approval) and :40-44 (minors
        // never appear in public profiles or suggested lists).
        // Implementation: migration 0029_fail_closed_minors.sql — the publish gate
        // at lines 175-188 requires an ACTIVE consent row carrying
        // public_sharing_approved, and `profiles_select_search` (lines 102-105) is
        // recreated to exclude not-verified-adults. 0029 also made an UNKNOWN date
        // of birth fail CLOSED: it is excluded from public search and blocked from
        // publishing, deliberately ordered after the minor branch so a known minor
        // still gets the guardian message.
        // THAT is the difference between this and the feature file: the feature
        // promises exclusion by minority, and the migration additionally refuses to
        // expose a profile it cannot verify as an adult. The stricter rule is the
        // one shipped, so it is the one written.
        'Ni la comunidad pública ni la biblioteca ven a un menor sin que su tutor o ' +
          'tutora lo autorice. Tampoco vemos perfiles cuya edad no podamos verificar: ' +
          'si no la conocemos, no la exponemos.',
      ],
    },
    {
      id: 'limites',
      family: 'fullBleed',
      block: 'stage-bg',
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
      family: 'asymmetric',
      block: 'base',
      ratio: '8/4',
      align: 'right',
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
    {
      id: 'precios',
      family: 'fullBleed',
      block: 'stage-bg',
      centred: true,
      title: 'Gratis durante la beta.',
      // Section 8.1 row 12 and plan section 4's out-of-scope table say the same
      // thing: there are no pricing tiers, because no pricing model exists, so
      // the page says "$0 during beta" and stops.
      //
      // Section 8.3 forbids invented tiers, and the same list forbids a
      // future-price hint dressed as a fact. So: one paragraph, no comparison, no
      // "contact us", no tier preview, and — deliberately — NO date for when the
      // beta ends, because nobody has decided one and a guessed deadline is the
      // easiest invented number on a pricing page to get wrong.
      //
      // Implementation backing the beta itself: package.json declares no billing
      // or payment dependency at all, and docs/technical-spec.md:523 rates the $0
      // backend cost (Supabase + storage + Vercel) as the reason offline-first
      // carries no store or tooling overhead. The product is free because there is
      // nothing to charge for yet, not because a plan was chosen.
      body: [
        'CEMURM es gratis durante la beta. No hay planes ni niveles: no hemos ' +
          'definido un precio, y preferimos decirlo así antes que anunciar uno que ' +
          'todavía no existe.',
      ],
    },
    // Section 8.1 row 13 asks for "6 real questions from a system director". We do
    // not have them. Section 8.3 forbids inventing content, so this frame stays
    // EMPTY on purpose — an empty section is a smaller sin than six invented
    // questions a real director would recognise as invented. Fill it when the
    // questions exist. Deliberately no `body` here.
    { id: 'faq', title: 'Preguntas frecuentes.', family: 'closing', block: 'base' },
    { id: 'waitlist', title: 'Unirme a la lista de espera.', family: 'closing', block: 'stage-bg', cta: true },
  ],
}

export default landing