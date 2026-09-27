# Proposal: OnSong export must reach `agreed_key`

> Change: `fix-onsong-agreed-key`
> Finding: C of the 10 specification discrepancies in `odd/tasks/cemurm-brand-landing.md` §14.1
> Status: proposed. Reproduced. No open product decision.

## Intent

`features/external-integrations.feature` requires the OnSong export to contain *"the songs in
order with their charts and **agreed keys**"*. The exporter cannot produce a key that is not
written on the chart. The data exists — the setlist item's agreed key is already in the database
— but nothing carries it into the export.

This is a reachability bug, not a missing feature.

## Problem

`src/lib/exporters/onsong.js` has **zero** references to `agreed_key`. `flattenSetlist()`
copies the song and its versions onto flat objects and never copies the setlist item's
`agreed_key`, so by the time the serializer runs the value is gone. `supabase/seed.sql:104`
writes it, so the column is populated and correct — it simply never reaches the output.

Two distinct keys are in play and the exporter currently emits only one:

| Key | Source | Meaning |
|---|---|---|
| chart key | `song_versions.base_key` | the key the chart is written in |
| **agreed key** | `setlist_items.agreed_key` | what the band agreed to sing it in |

For a player those can differ, and the agreed key is the one that matters on the night.

## Scope

### In scope

- `flattenSetlist()` (or its equivalent) carries `agreed_key` from the setlist item onto the
  flattened object.
- `serializeOnSong()` emits it, in a form OnSong understands.
- The decision for a song with **no** agreed key: fall back to the chart key, and say so.
- Delta spec for the `external-integrations` capability, with the scenario traced to
  `features/external-integrations.feature`.

### Out of scope

- Findings A, B, D, E and F–J. Each gets its own change.
- The Planning Center exporter (`exportSetlistToPlan`), which has the same gap. Separate change;
  it is a different format with a different consumer.
- Any change to how a setlist item's agreed key is *set*. That flow works.
- ChordPro export to `.cho` beyond what this change already does.

## Capabilities

### New capabilities

None.

### Modified capabilities

- `external-integrations` (delta spec against the existing feature file; the repository has no
  `openspec/specs/external-integrations/` yet, so this change creates it)

## Approach

Two things have to be decided, and only the first is a real question.

**1. Representation.** OnSong's `.cho` format has no first-class "agreed key" field. Options:

- emit the agreed key as the chart key — i.e. transpose the exported chart. This is what a
  player actually wants, but it is a transformation, not a label.
- emit it as a directive or comment alongside the chart key.
- emit both and let the import decide.

The trade-off is fidelity versus effort. Transposing is the most useful and the most work, and
it changes what the file *is*. Emitting alongside is cheap and leaves the interpretation to
OnSong, which may not support it.

**2. Fallback when `agreed_key` is NULL.** Recommend the chart key, silently. A setlist where
nobody agreed on a key is normal, and a file missing a key is worse than one carrying the
chart's.

Recommendation: **emit alongside first** (cheap, reversible, and it makes the data visible in
the file so a human can check it), then decide transposition as a follow-up with real usage
data. That is also what YAGNI points at — `docs/engineering-review-backlog.md:5`.

## Affected areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/exporters/onsong.js` | Modified | carry and emit `agreed_key` |
| `src/lib/exporters/onsong.test.js` | Modified | the characterization suite pins the current output; a real fix inverts it |
| `src/lib/setlists.js` | Possibly | if the query that feeds `flattenSetlist` does not select the column |
| `openspec/specs/external-integrations/spec.md` | New | capability spec, agreed-key requirement only |

## Verification

- `pnpm test` — the OnSong characterization suite is the gate. It currently asserts the output
  **without** the agreed key, so a real fix inverts that assertion; the diff in the test file is
  the proof the behaviour actually changed.
- `pnpm typecheck && pnpm lint && pnpm build`.
- Manual: a setlist whose item has an `agreed_key` different from the chart key, exported and
  reopened. The seed sets `agreed_key` on the demo setlist item, so the fixture exists.

## Rollback

One module, one test file, one new spec. No schema, no migration, no persisted state. Low risk.

## Frozen decisions

1. **The Gherkin is not edited to match the exporter.** `features/external-integrations.feature`
   is the product source of truth. This change conforms to it.
2. **The bug-pinning test is inverted, not deleted.** `exporters/onsong.test.js` is what made
   this finding reproducible. Deleting it to go green is the failure mode the delivery
   agreement forbids.
3. **A NULL `agreed_key` falls back to the chart key**, not to an error and not to an empty
   field. A setlist where nothing was agreed is an ordinary state.
4. **Planning Center is a separate change.** It has the same gap and a different format; folding
   it in would make this PR untestable against one consumer.
