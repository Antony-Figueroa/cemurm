// ===========================================================================
// PLACEHOLDER FIXTURE — NOT A REAL PIECE OF MUSIC. DO NOT SHIP AS CONTENT.
// ===========================================================================
//
// Plan section 8.2 calls for "a verifiable public-domain piece" and then says the
// thing that matters: "Do not assert a licence without checking it." No such
// piece has been chosen, so this file asserts NOTHING — the chart below is
// invented placeholder text with no title, author, arranger, publisher or
// licence claim in any role state. Nothing here may be shown to a visitor as a
// real song or cited. It exists to make the three Stage Bus projections render
// and is replaced wholesale, by a verified piece plus its citation, before ship.
//
// The one non-obvious thing here is the `anotacion` line: a chord-pro `comment`,
// which OverlayView SKIPS ENTIRELY (OverlayView.jsx:60-63). That is the Stage Bus
// argument in one line of fixture — one source chart, three screens, and a
// personal annotation that exists in exactly one of them.
// ===========================================================================

// A minimal chord-pro body: what the pure parser (domain/chart/parser.js)
// actually consumes. No `[chord]` markers are needed here because OverlayView
// and the musician screen both read the parsed structure, not the raw text.
export const demoChart = {
  title: 'Pieza de demostración',
  key: 'C',
  position: { index: 2, total: 12 },
  body: [
    '{title: Pieza de demostración}',
    '{key: C}',
    '',
    '{section:verso}',
    'La luz cae despacio',
    'y el silencio sostiene',
    '{comment: anotacion personal, nunca se emite}',
    '',
    '{section:coro}',
    'Juntos cantamos mas fuerte',
    'y el pulso nos lleva',
  ].join('\n'),

  // The musician screen needs per-line chords, which the plain body above does
  // not carry. Kept beside the body so the two can never drift apart: same
  // section names, same two lines per section, same annotation.
  musicianLines: [
    { section: 'verso' },
    { chord: 'C', text: 'La luz cae despacio' },
    { chord: 'Am', text: 'y el silencio sostiene' },
    { annotation: 'anotacion personal, nunca se emite' },
    { section: 'coro' },
    { chord: 'F', text: 'Juntos cantamos mas fuerte' },
    { chord: 'C', text: 'y el pulso nos lleva' },
  ],
}

// The three Stage Bus projections, in the order the hero cycles through them.
// `screen` picks the renderer in Hero.jsx and `anchor` picks the frame crop.
//
// The three buttons that switch them form one single-select control, so the
// group needs a name for a screen reader. It lives here rather than in the JSX
// because it is copy, and copy lives in a content module.
export const rotationGroupLabel = 'Vista del escenario'

// The two prop shapes below were confirmed by reading the components, not
// assumed:
//
//   overlay -> OverlayView({ state }) reads state.active (must be exactly true,
//     anything else renders the English "Overlay inactive" placeholder),
//     state.mode === 'chords', state.title, state.body (chord-pro text),
//     state.song_index and state.song_total. It has NO lyrics-only mode: with
//     mode !== 'chords' it renders the header and nothing else. `key` is
//     deliberately absent because OverlayView renders it as the English literal
//     "Key {key}" (OverlayView.jsx:36) and the landing's copy contract is
//     Spanish-only.
//
//   signal -> SlideView({ slide }) switches on slide.kind. 'song-title' renders
//     slide.title, slide.artist and, when present, slide.key as the English
//     literal "Key {key}" (SlideView.jsx:39) — so `key` is omitted here too.
//     SlideView's 'blocked' branch paints its error in a dead accent
//     (SlideView.jsx:29) and must never be reached from the landing: one accent
//     only. Named here without the class literal because gate rule 02 greps
//     source COMMENTS for the dead accents — unlike rules 03 and 06, which
//     filter them out — so writing the token name costs exactly what using it
//     costs, and the ratchet has zero headroom.
export const roles = [
  {
    id: 'musicos',
    screen: 'musician',
    anchor: 'top',
    label: 'Musicos',
    blurb: 'Acordes sobre la letra, con tu tono.',
    // The musician's own tablet. Not a projector surface, so it paints on
    // cem.base rather than cem.stage.bg.
    tone: 'C',
  },
  {
    id: 'publico',
    screen: 'overlay',
    anchor: 'top',
    label: 'Publico',
    blurb: 'La letra sin anotaciones, para emitir.',
    state: {
      active: true,
      mode: 'chords',
      title: demoChart.title,
      body: demoChart.body,
      song_index: demoChart.position.index,
      song_total: demoChart.position.total,
    },
  },
  {
    id: 'senal',
    screen: 'signal',
    // SlideView centres its content within a `min-h-screen` box, so a top-anchored
    // crop of it renders blank. See DeviceFrame.jsx.
    anchor: 'center',
    label: 'Senal',
    blurb: 'Titulo y posicion, sin letra ni anotaciones.',
    slide: {
      kind: 'song-title',
      title: demoChart.title,
      artist: 'CEMURM',
    },
  },
]

export default roles