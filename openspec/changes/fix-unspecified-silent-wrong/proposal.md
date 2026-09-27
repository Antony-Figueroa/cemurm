# Proposal: Plausibly valid input renders a silently wrong chord, and each case needs a decision

> Change: `fix-unspecified-silent-wrong`
> Findings: **3 of the 7** unspecified "sharp edges" (`odd/tasks/music-theory-discrepancies.md:61-66`).
> That list is **unlettered** — the A–J lettering covers the 10 discrepancies, not these seven.
> Status: proposed. All three reproduced. **Each one needs a product decision**, stated below and
> not pre-empted. Depends on finding **B**; the dependency is not folded in.
>
> **Path note:** `main` has `src/lib/transpose.js` and `src/lib/annotations.js`; after M0a they
> become `src/domain/music/transpose.js` and `src/domain/annotations/annotations.js`. The M0a
> destination of `annotations.js` is **not** in `odd/tasks/music-theory-discrepancies.md:178-185`
> and is **confirmed at apply time**, as is every test path below — no `src/domain/` and no test
> file exists on `main`, because the suite arrives with M0b (#171).

## Intent

Three inputs a musician can plausibly produce, where the app renders *something* and never says the
result is wrong. No feature file names any of them — and unlike the sibling
`fix-unspecified-crashes`, none can be fixed by reading the existing spec.

## Problem

### 1. A lowercase chord passes through untransposed

```
transposeChord('am', 3) → "am"
```

`CHORD_RE = /^([A-G][#b]?)(.*)/` at `src/lib/transpose.js:79` is **case-sensitive**. A lowercase
token does not match, `m` is `null`, and `:91` returns the input unchanged. This is a real input,
not a synthetic one: the ChordPro parser takes the chord token **verbatim**, with no case
normalisation and no validation (`src/lib/chordpro/parser.js:35`:
`line.slice(i + 1, end).trim()`), so a chart containing `[am]` survives parsing and renders
half-transposed:

```
parsed chords: ["am","G"]  →  transposed +3: ["am","A#"]
```

`am` stays put while its neighbour moves. The musician asked for +3 and got one chord out of two.

**The decision.** A lowercase chord is plausibly valid: the parser accepts it, the musician reads
`am` as A minor, and nothing in the product says chord tokens are case-sensitive. Normalise in the
parser (out — `features/music-theory.feature:62` makes the stored chart content canonical and a
display decision must never rewrite it); normalise in `transposeChord` (display-only, storage stays
verbatim, but a token the chart still says `am` renders as `Cm`); or reject with a visible signal
(teaches the author nothing about the rest of the chart). Nothing here picks for the maintainer.

### 2. The unicode flat is read as a modifier

```
transposeKey('B♭', 2)   → "C#♭"
transposeKey('B♭m', 2)  → "C#♭m"
transposeKey('Bbm', 2)  → "Cm"
```

The unicode flat `♭` (U+266D) is in neither `NOTES_SHARP` (`:42`) nor `NOTES_FLAT` (`:43`). The key
regex at `:106` is `^([A-G][#b]?)(.*)$`, so it matches `B` as the note and captures `♭` as the
**modifier** `m[2]`, which `:111` re-appends verbatim. The tonic is transposed and the accidental is
not — the same half-transposed shape as finding 1, and a worse one, because the result is not a
chord any musician would write.

**The decision.** `♭` is not a keyboard typo, but it is exactly what a paste from a web page or a
ChordPro file authored in a Unicode-flat tool produces — so this is a paste-handling question, not
a nonsense-input question, and it does not belong with `fix-unspecified-crashes`. Fold U+266D and
U+266F into the regexes and the note tables (accept, with the consequence that stored and rendered
spellings can differ); reject a key containing one (breaks a real paste); or normalise at parse
time (touches stored content, so it must clear `features/music-theory.feature:62` first).

### 3. The same substitution works or does nothing depending on the chart's key

```
applySubstitution('Bb', 0, map, 'C')  → "Bb"     ← nothing applied
applySubstitution('Bb', 0, map, 'Bb') → "A"      ← same substitution, different base key
```

`src/lib/annotations.js:82-89`, in full:

```js
export function applySubstitution(token, semitones, substitutions, baseKey) {
  if (!token || !substitutions || !Object.keys(substitutions).length) return token
  const preferFlat = preferFlatForKey(baseKey)
  const concrete = transposeChord(token, -semitones, preferFlat)
  const target = substitutions[concrete]
  return target ? transposeChord(target, semitones, preferFlat) : token
}
```

The lookup key is `concrete` — the rendered token **reverse-transposed using the base key's flat
preference**. So whether an anchor written `"Bb"` matches depends on whether the chart's key
happens to be a flat key. Traced:

```
preferFlatForKey('C')  = false
preferFlatForKey('Bb') = true
concrete on a C chart  = "A#"   → in map? false
concrete on a Bb chart = "Bb"   → in map? true
```

On a C-major chart the reverse transpose re-spells `Bb` as `A#`, the lookup misses, and `:87`
returns the token **unchanged and with no signal of any kind**. The musician's personal
substitution silently does nothing, and the only visible result is that their arrangement is
ignored. The module's own docstring at `:71-73` claims the opposite — *"Consistent flat preference
keeps Bb-chart round-trips enharmonically stable"* — true for flat charts, false for sharp ones.
`baseKey` reaches this function from the parsed chart key at three confirmed sites:
`src/components/notation/ChordProRenderer.jsx:40` (default `baseKey = ''` at `:66`, and
`preferFlatForKey('')` is `false`), fed by `src/pages/SongDetail.jsx:977`,
`src/pages/Practice.jsx:209` and `src/pages/SubstitutionAssignment.jsx:59`.

**Why the Gherkin never caught it.** Neither scenario that specifies this names a key.
`features/personal-preferences-and-adaptations.feature:189-195` gives `"Bm -> Dmaj7"` on
"Canción W" and requires *"the substitution moves correctly when Pedro transposes the song"*;
`features/substitutions-and-coverage.feature:67-71` gives the same substitution and requires *"his
view renders Dmaj7 where the chart says Bm"*. Neither states the song's key, so a C chart and a
B♭ chart are **equally conforming readings** — and the code picks between them through
`preferFlatForKey`. The requirement is specified; the spelling of the match is not.

**The decision, genuinely open.** Three candidates, three blast radii:

1. **Look up both spellings** — on a miss, retry the enharmonic equivalent. The whole change is
   inside `annotations.js`, no stored row is touched, and annotations written before the fix start
   working. Cost: two enharmonically equal anchors (`"Bb"` and `"A#"`) now both match and one
   silently wins. `Object.keys` order is not an acceptable tie-break.
2. **Normalise the anchor to the base key's preference at write time** — the annotation is stored
   in the chart's own spelling, so lookup ambiguity never arises. Cost: a migration, or a read-time
   re-key of existing `personal_annotations` rows, and the stored anchor stops being what the
   musician typed. It is also the only option that needs finding **B**, below.
3. **Normalise in the parser** — the anchor folds to one canonical spelling at parse. Cost: the
   parser does not know the key at that point, and it pushes a display concern into stored content,
   which `features/music-theory.feature:62` forbids.

**Recommendation: option 1**, as the only one that repairs existing stored annotations with no
migration and no rewrite. The tradeoff stated plainly: it accepts a rarer silent *wrong* hit in
exchange for eliminating the common silent *miss*, so whoever implements it **must** also state
the tie-break for the enharmonic collision or the change is not ready. This is a recommendation,
not a decision, and the maintainer owns it.

**Dependency on finding B.** `preferFlatForKey` (`src/lib/transpose.js:134-136`) is the exact
function `fix-key-spelling-preference` is about, and B's rule — derive flatness from the key's own
spelling instead of `FLAT_KEYS`' six hardcoded names — is a **prerequisite** for a correct fix
here: while `preferFlatForKey('Cb')` is `false`, a C♭ chart reverse-transposes sharp-spelled and
reproduces this same silent miss for the flattest major key there is. B is **not** folded in —
different function, different call sites (`transposeKey` and the section-wide `preferFlat` at
`:179` for B, `applySubstitution` for this change), and a change with two rules cannot be tested
against one feature file. B is also **not sufficient**: for a C-major chart `preferFlatForKey('C')`
is `false` before and after, so `applySubstitution('Bb', 0, map, 'C')` returns `"Bb"` identically
once B lands. B is necessary; the decision above is what fixes the reported behaviour.

## Scope

### In scope

- The three defects, each gated on the decision that change records, and the decisions themselves
  written into Frozen decisions **once the maintainer makes them** — not assumed by the implementer.
- New Gherkin pinning the chosen answer for each, and the missing key in the two existing
  substitution scenarios.
- Delta specs for `music-theory` (case and unicode-accidental requirements) and
  `substitutions-and-coverage` (anchor matching, this change's own spec).

### Out of scope

- **Finding B itself** — `fix-key-spelling-preference`, referenced as a prerequisite, not
  implemented here. The substitution fix is only durable once B is in.
- **`fix-unspecified-crashes`**, the sibling half of the same list: those inputs are invalid under
  every reading. Different question, one PR each.
- The `buildSubstitutionMap` guard. It was claimed to be defeated and that claim is **refuted**
  there, against seven malformed shapes; there is nothing to fix in `annotations.js:55-64`.
- Findings A, C, D, E, F, G, H, I, J, and `src/lib/spotify.js`'s own key table, which keeps its
  own spelling rule so neither change hard-codes the other's preference.
- Stored chart content, which `features/music-theory.feature:62` makes canonical — the reason
  option 3 is out of scope rather than deprioritised. A migration for existing
  `personal_annotations` rows, unless option 2 is the one taken.
## Capabilities

### New capabilities

None.

### Modified capabilities

- `substitutions-and-coverage` (new capability spec — the repository has no
  `openspec/specs/substitutions-and-coverage/` today, so **this change creates it**. Its entire
  content is the anchor-matching requirement, which is what finding 3 leaves unspecified.)
- `music-theory` (new capability spec — the repository has no `openspec/specs/music-theory/` today;
  `fix-key-spelling-preference` and `fix-parser-sectional-key` also create it, so **one** owns the
  file and this appends the case and unicode-accidental requirements only. Owner at apply time.)

## Approach

One principle across all three: **an input the product accepts must not produce output that is
wrong without saying so.**

- Findings 1 and 2 share a mechanism — a case-sensitive `[A-G]` and a table with no U+266D — so
  they are fixed together, while each keeps its own decision, because the answer for one does not
  imply the answer for the other.
- Finding 3 is not a validation bug and must not be fixed as one. A "did the substitution apply?"
  signal in the renderer hides the defect one layer up; the miss is in the **lookup key**, and the
  honest fix changes the key.
- Every scenario is written **after** its decision, and the two existing substitution scenarios
  gain the key they were missing. A spec that names the key would have caught this; a spec that
  names only the substitution cannot.

## Affected areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/transpose.js` | Modified | `CHORD_RE` at `:79` (case), the key regex at `:106` and the note tables at `:42-43` (unicode accidental) |
| `src/lib/annotations.js` | Modified | `applySubstitution` `:82-88` — the `concrete` lookup key at `:85`, and the docstring claim at `:71-73` |
| `src/lib/chordpro/parser.js` | Possibly | the token is stored verbatim at `:35`; parser-level normalisation is option 3, out of scope |
| `src/components/notation/ChordProRenderer.jsx` | Confirmed | the one `applySubstitution` render call at `:40`; `baseKey` defaults to `''` at `:66` |
| `SongDetail.jsx` `:977`, `Practice.jsx` `:209`, `SubstitutionAssignment.jsx` `:59` | Confirmed | each passes `baseKey={parsed?.key}` into that render |
| `src/domain/music/transpose.test.js` | New test | case and unicode-accidental inputs — confirmed at apply time |
| `annotations.test.js` | Modified | the enharmonic lookup — post-M0a path **confirmed at apply time**; absent from the M0a table |
| `features/music-theory.feature` | Modified | the case-sensitivity and unicode-accidental scenarios |
| `personal-preferences-and-adaptations.feature`, `substitutions-and-coverage.feature` | Modified | the key is missing from `:189-195` and `:67-71` |
| `openspec/specs/substitutions-and-coverage/spec.md` | New | capability spec |
| `openspec/specs/music-theory/spec.md` | Modified | append to a sibling's spec |

## Verification

- `pnpm test` — `transpose.test.js` and `annotations.test.js` are the gate. Finding 3 is the one
  that matters: a test asserting `applySubstitution('Bb', 0, {Bb:'A'}, 'C')` returns `"A"` under
  the chosen decision **fails today**, and its red-to-green diff is the evidence. Green while the
  `"Bb"` output remains means the fix did nothing.
- `pnpm typecheck && pnpm lint && pnpm build`. Typecheck is **not in CI** (`AGENTS.md`) — run it
  locally and do not present a green CI as covering it.
- Manual, for all three, because each is a rendering claim: a chart containing `[am]` transposed
  +3; a key of `B♭m` transposed +2; and a personal `"Bb" -> "A"` substitution on a **C-major**
  chart — the case no unit test can be talked out of.

## Rollback

Two modules, three pages that only pass `baseKey`, two feature files, one new spec, and — only if
option 2 is taken — a migration for existing annotation rows. Without that migration this is
display-side and fully revertible.

## Frozen decisions

1. **The Gherkin is not edited to match the code.**
   `personal-preferences-and-adaptations.feature:189-195` and
   `substitutions-and-coverage.feature:67-71` are conformed to, not weakened; the missing key is
   **added**, which can only make the requirement stricter.
2. **A bug-pinning assertion inverts rather than gets deleted.** The flat-key round trip pinned at
   `annotations.js:149` is the artifact that made finding 3 reproducible. A real fix changes it to
   assert the spec; rewriting it to accept anything is the failure mode the delivery agreement
   forbids.
3. **Nothing lands before M0b (#171).** The characterization suite is the only regression net this
   repository has, and the substitution fix rewrites an assertion inside it.
4. **Finding 3's decision is open and is not taken here.** Enharmonic double lookup, write-time
   normalisation, or parser normalisation. This change recommends the first and states the
   tie-break it still needs; the maintainer picks. An implementation that does not first record the
   decision has smuggled it in.
5. **Finding B is a dependency, not part of this change.** `preferFlatForKey` is B's function and
   its fix; this references it and does not edit it. B is also **not sufficient** — the C-major case
   is identical before and after — so the decision in point 4 is what actually fixes the reported
   behaviour.
6. **Stored chart content is never rewritten.** `features/music-theory.feature:62` makes the
   concrete ChordPro text canonical. That constrains the decision rather than merely informing it.
7. **Not merged with `fix-unspecified-crashes`,** the sibling half of the same list. The split is
   *whether a product decision is required*: those inputs are invalid under every reading, so they
   fix cleanly and ship first. These three cannot ship without an answer.
