# Visual system — macOS-led redesign rules for CEMURM's interfaces

## 1. Objective

Produce one project skill that encodes the visual rules for **every CEMURM interface** — the
marketing landing, the authenticated app, and the live Stage Mode surface — so that visual
decisions are made against a written, checkable contract instead of per-PR taste.

The direction is **the macOS / Apple design language**, chosen deliberately by the maintainer on
2026-09-28, keeping CEMURM's existing color essence: a dark ramp plus **one** amber accent
(`#f59e0b` family).

## 2. Problem

The visual rules for this project currently exist in three places and none of them is enforced:

| Where | State |
|---|---|
| `docs/design-system.md` | 464 lines, written 2026-09-06, **orphaned** — never implemented, and it describes a "warm, organized music binder", not a macOS system |
| `odd/tasks/cemurm-brand-landing.md` §5–§6 | On branch `feat/cemurm-brand-landing` only. 18+ commits behind `main`. Not on `main` |
| `tailwind.config.js` | 11 tokens, **6 borrowed straight from Tailwind**; `cem.stage.dim` defined with **zero usages** — the system anticipated a technique nobody executed |

Result: every surface invents its own spacing, radius, and accent usage, and `docs/master-plan.md`
already lists the refactor debt this causes.

A second, sharper problem: the two candidate reference sets disagree with each other, and with the
written plan. That disagreement has to be resolved on paper **before** any code moves, or PR 4
becomes an argument instead of an implementation.

## 3. The references, and what they actually agree on

Analyzed 2026-09-28. All four are dark-first with **one accent at full saturation spent in exactly
three places — logo mark, primary CTA, active/selected state — and nowhere else.**

| Reference | Medium | Accent | Signature technique |
|---|---|---|---|
| "Bloco — The Culture Engine" | Dribbble mp4, 24 s, 1600×1200@60, video-only | Red/orange | Giant accent-colored wordmark cropped by the page edge to close the page |
| "pulse" | Dribbble png, 752×564 | White CTA, green only for price deltas | Restraint; native iOS controls, dark UI on a light neutral mockup stage |
| "fever" | Dribbble png, 752×564 | Acid yellow, aggressively | Emissive glow on the mascot; full-saturation accent on logo + CTA + selected calendar day |
| "ChatFleek" | Dribbble mp4, 14.6 s, 1600×1200@30, **has audio** | Violet | Translucent panel over an organic background — the macOS *material* concept in CSS |

"fever" is the closest match to what the maintainer described. "ChatFleek" is the closest match to
the material/glass language. "Bloco" contributes one closing-block technique. "pulse" contributes
restraint, and is the least useful of the four for this project.

**Audio caveat:** the ChatFleek reel carries a real audio track (mean −22.4 dBFS, peak −9.5 dBFS)
and there is no transcription tool in this environment, so its sound design was not analyzed. Only
the Bloco reel was video-only.

## 4. Deliberate supersessions

This unit **replaces** two rules in the existing plan. They are recorded here so the change is
visible and reviewable, not smuggled in:

| Old rule | Source | New rule | Why |
|---|---|---|---|
| `border-radius: 0` in page structure; no gradient in structure | `odd/tasks/cemurm-brand-landing.md` §5.3, §9.4 | Continuous radii with a scale tied to component size; gradient permitted **only** in the logo mark and the accent surface | Apple's shape language is radius-first. All four references are radius-heavy. The maintainer authorized "un estilo rediseñado y moderno" on 2026-09-28 |
| Amber at full saturation "only on the performance surface" | same, §5.1 | Amber at full saturation on **logo mark, primary CTA, and active/selected state** | That is where all four references spend the accent. "Performance surface" was a guess; this is observed |

The **rejection** of the SaaS card kit (§6.3) **survives**. Card grids are not banned — the four
references use cards heavily. What is banned is *decorative* card chrome: identical soft shadow on
every surface, one radius everywhere, gradient washes, and cards used to fill space that content
could fill.

## 5. Scope

**In scope**

- `skills/cemurm-visual-system/SKILL.md` — thin activation + hard rules + decision gates
- `skills/cemurm-visual-system/references/apple-macos-visual-language.md` — the evidence base
- `skills/cemurm-visual-system/references/toolchain-options.md` — libraries and agent skills
- `skills/cemurm-visual-system/assets/tokens.css` — the additive token layer, ready to copy
- Registration in `AGENTS.md` and the skill registry

**Out of scope for this unit**

- Any change to `src/`, `tailwind.config.js`, or `src/index.css` — this unit produces the contract,
  not the migration. The migration is PR 4 in the landing route.
- Any external skill installation. This unit *recommends*; installation is a separate human decision.
- Touching the landing's 13-section structure, hero spec, or copy rules. Unchanged.

## 6. Constraints

1. **Tailwind stays 3.4.19.** Do not flip `checkJs`, do not bump Tailwind to 4.
2. **No animation library in the authenticated bundle.** Project rule, not preference.
3. Bundle budgets: landing ≤120 kB gzip, largest chunk ≤150 kB gzip.
4. **JSX, not TSX.** The codebase is plain JS. Tailwind only — no CSS modules, no styled-components.
5. The token layer is **additive**: `cem.emerald`, `cem.rose`, `cem.sky`, `cem.secondary`,
   `cem.elevated`, `cem.hover`, `cem.amber` must survive intact. Only `cem.coral` goes to zero.
6. **Do not touch** `docs/master-plan.md`, `supabase/migrations/`, or `scripts/smoke/` — uncommitted
   owner work-in-progress was present in the working tree when this unit started (the 0029→0033
   feedback-migration renumber and its smoke test). All commits in this unit use explicit pathspecs
   so that work cannot ride along.

## 7. Tasks

- [x] **T1** — Analyze the four references, extract the shared rule set. *Done, §3 above.*
- [x] **T2** — Extract Apple HIG materials/color/type/layout/shape/motion/controls/dark-mode
      specifics with provenance into `references/apple-macos-visual-language.md`. *Done, 978 lines.*
- [x] **T3** — Research component libraries, motion approaches, color tooling, and external agent
      skills with verified numbers into `references/toolchain-options.md`. *Done, 608 lines.*
- [x] **T4** — Write `SKILL.md`. *Done: 61 lines, 404 words of body, four tiers.*
- [x] **T5** — Write `assets/tokens.css`. *Done, 133 lines, 52 custom properties.*
- [x] **T6** — Register the skill in `AGENTS.md`. *Done, new "Visual system" section.* The
      `.atl/skill-registry.md` refresh is deferred: it scans only the global skill directories
      (`~/.agents/skills`, `~/.config/opencode/skills`, `~/.claude/skills`, `~/.codex/skills`) and
      does not index a project-local `skills/`, so a refresh would not pick this up. The
      `AGENTS.md` registration is what makes it discoverable in-repo.
- [x] **T7** — Verify. *Done, §13.*

## 8. Acceptance criteria

1. `SKILL.md` body is 180–450 tokens, frontmatter is single-line and quoted, sections are in the
   order Activation Contract → Hard Rules → Decision Gates → Execution Steps → Output Contract →
   References.
2. Every `references/` link in `SKILL.md` resolves to a file that exists.
3. Every numeric value in the references is either traced to a loaded source page or explicitly
   marked unverified. No invented HIG URLs, no invented licenses.
4. `assets/tokens.css` contains no hardcoded value that duplicates a pre-existing `cem-*` token, and
   introduces no token that removes one still in use.
5. `git status` shows no change outside `skills/cemurm-visual-system/` and `odd/tasks/`.
6. The four supersessions in §4 are stated in the skill, not only in this file.

## 9. Applicable checks

This unit adds no production code and no test surface.

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Run as a regression guard only — the unit must not change build behaviour, and `typecheck` is
absent from CI so it must be run locally. Additionally:

```bash
grep -roE 'cem-(coral|emerald|rose|sky|secondary|elevated|hover|amber)\b' src/ | wc -l
```

Must be **unchanged** from the pre-unit count, except `cem.coral` is not touched at all in this
unit. This is the check that replaces a visual baseline.

## 10. Route

| Task | Route | Trigger evidence |
|---|---|---|
| T1 | inline | 3 files read, already-understood, no research beyond the media itself |
| T2 | delegated | 8 HIG pages to load and compress; the knowledge must not land in the parent |
| T3 | delegated | 11 skill candidates to verify against GitHub plus 9 component libraries |
| T4, T5 | inline | thin, mechanical once T2/T3 land; the decisions are already made in §4 |
| T6, T7 | inline | bounded state and command checks |

## 11. Progress and next step

**Next step:** T2 and T3 are running. On return, write T4 and T5, then T6 and T7.

**Open risk:** the references are four iOS/marketing concepts, and none of them is a dense
data-entry product. CEMURM's tables, chord grids, and setlist editors are the real stress case and
the references say nothing about them. If T7 surfaces that gap, the honest fix is to say the skill
covers chrome and surfaces but not dense grids, rather than to invent guidance and present it as
Apple's.

## 12. Enforcement gate — what it blocks and the measured baseline

`scripts/check-visual-contract.sh` makes §8's contract checkable. Bash and grep only: no install
step, no test runner, no build. It runs in CI between `pnpm lint` and `pnpm test`, and locally via
`pnpm check:visual`. Every check prints `PASS` / `FAIL` / `WARN` with a count; a failure names the
file and line. Paths resolve from the script location, so it runs from any working directory.

Each rule is `enforcing` (any count above 0 fails), `ratchet` (current count tolerated, exceeding
the ceiling fails), or `report` (counted, never fails). The mode is one declaration per rule in the
`RULE MODES` block, next to its ceiling, so whether a rule can fail is readable in one place.

| Rule | Mode | Baseline | Why that mode |
|---|---|---|---|
| 01a raw colour literals in `src/` (`#hex`, `rgb()`, `hsl()`, `oklch()`, …) | enforcing | **0** | Correct count today, so it can be a hard zero |
| 01b Tailwind default-palette utilities in `src/` (`bg-black`, `text-white/70`, …) | ratchet | **82** in 5 files | Real token bypass, but 82 uses exist today |
| 02 the four dead accents in `src/` | ratchet | **252** in 35 files | Correct in principle, false today — see below |
| 03 chrome-free projector surface | enforcing | **0** unexcused, **1** allowlisted | Correct count is 0 once one exception is named |
| 04 token palette may not grow | enforcing | **0** undeclared of **16** keys | Adding a fifth accent must be reviewable |
| r1 `StageMode.jsx` chrome | report | **30** `rounded*`, **2** `shadow*` | Legitimate on a touch surface; tracked, not blocked |
| r2 declared token count | report | **16** | Makes palette growth visible in the log |

**Correction to the task brief.** The brief stated all four dead accents have **0** usages. That
figure came from grepping `cem.rose` (the JS object form). In JSX the tokens are used as Tailwind
classes, and `cem-rose` has **177** uses, `cem-emerald` **68**, `cem-sky` **7** — **252** across
35 files. A gate written against the brief's pattern would have reported 0 and passed while 252
violations stood, which is the exact false confidence a gate must not create. The pattern now
matches both forms. §6 constraint 5 also requires these tokens survive intact, so their usages
cannot reach 0 without a deliberate decision to change that constraint — which is why rule 02 is a
ratchet and not a zero: the existing 252 stand, and no new use is admitted.

**Rule 03's one exception** is `rounded-full` on the `N / M` position chip,
`src/features/stage/components/OverlayView.jsx:38`. A bounded data-bearing counter, not decorative
furniture, and it carries no shadow, gradient, or backdrop filter — the three things that actually
degrade through a projector and an H.264 encode. It is a named, commented allowlist entry that
prints on every run, not a loosened rule.

**Deliberate violations were introduced and reverted to confirm each rule can fail.** Verified
2026-09-28: a hex literal (01a), a `bg-slate-800` (01b), a `cem-coral` class (02), a
`className="rounded-xl shadow-2xl"` and a class name in a variable (03), a flat `cem.indigo` and a
nested `cem.stage.alert.bg` (04). Each produced `FAIL` with a file and line and exit 1; each
reverted to `PASS` and exit 0. Comment prose in the overlay files was confirmed **not** to trip
rule 03, since those files are about being chrome-free and will document the rule inline.

**Deviation from §5 and §8.5.** This unit's scope said no change outside
`skills/cemurm-visual-system/` and `odd/tasks/`, but an enforcement gate cannot live there: it adds
`scripts/check-visual-contract.sh`, one CI step, and one `package.json` script (`check:visual`,
not on the critical path — CI invokes the script directly). No file under `src/`,
`tailwind.config.js`, `docs/master-plan.md`, `supabase/migrations/`, or `scripts/smoke/` was
changed; the overlay and config edits above were temporary probes, each reverted and
byte-compared against a backup.

**Promotion path.** When a ratchet or report count reaches 0, set that rule to `enforcing` and
delete its ceiling. Rule 02 reaching 0 also requires revisiting §6 constraint 5.

## 13. Verification evidence, and what the unit found

All numbers below were measured on `feat/visual-system-macos`, not taken from a worker's report.
Three of my own earlier measurements were wrong and are corrected here.

### Deliverables

| File | Lines |
|---|---|
| `skills/cemurm-visual-system/SKILL.md` | 61 |
| `skills/cemurm-visual-system/assets/tokens.css` | 133 |
| `skills/cemurm-visual-system/references/apple-macos-visual-language.md` | 978 |
| `skills/cemurm-visual-system/references/tier-3-performance-surfaces.md` | 544 |
| `skills/cemurm-visual-system/references/toolchain-options.md` | 608 |
| `scripts/check-visual-contract.sh` | 449 |

`SKILL.md` sections are in the style-guide order; all four `references/`/`assets/` links resolve.
`SKILL.md` body is 404 words, inside the 180–450 target.

### The gate was made to fail on purpose

| Injected | Result | Exit |
|---|---|---|
| `rounded-xl shadow-2xl` into `Overlay.jsx` | `FAIL 03` | 1 |
| `const BRAND = "#ff0000"` into `src/` | `FAIL 01a` | 1 |
| both reverted | `OK (7 rules, 0 failing)` | 0 |

`Overlay.jsx` verified byte-identical to `HEAD` afterwards. A gate that has never been seen to fail
is not a gate, so this is recorded rather than assumed.

### Corrections to figures I stated earlier in this session

1. **The four accents are not dead.** I grepped `cem.rose` — the JS object form — and got 0. JSX
   emits hyphenated Tailwind classes. Real counts: `cem-rose` **177**, `cem-emerald` **68**,
   `cem-sky` **7**, across 35 files. `cem-coral` **0** is the only genuinely dead token. A gate
   written to my original spec would have printed `0` and gone green over 252 standing violations.
2. **`cem.stage.*` is 100% unused.** I annotated the token layer as "already in production and
   proven against a real projector". Both halves were false. `grep -rn "cem-stage" src/` → 0. The
   projector surface runs on Tailwind's *default* palette: `StageMode.jsx` has 42
   `bg/text/border-black|white` utilities, `OverlayView.jsx` has 7. Adopting the namespace is a
   class-name rename with no intended colour change, and nothing is legibility-tested.
3. **The glyph count is disputed three ways** — plan says 14, one grep says 15, the extracting
   worker says 43. None is verified; none is repeated as fact anywhere in the deliverables.

### Findings recorded, deliberately not fixed here

Per the standing rule that a red test is fixed in the source but a *finding* gets reported rather
than smuggled into an unrelated unit, these are left for their own slices:

| Finding | Evidence |
|---|---|
| `cem.secondary` fails contrast in production | **2.96:1** on `cem.hover` `#475569`, **4.04:1** on `cem.elevated` `#334155`. Both under the 4.5 AA text floor |
| Text on an amber fill is unreadable | `#f8fafc` on `#f59e0b` = **2.05:1**. An amber button needs dark text: `#0f172a` = 8.31:1 |
| The landing plan contradicts itself | §9.5 wants `emerald/rose/sky` gone from the config; §9.13 wants their usage counts identical. With 252 usages these cannot both hold |
| Stage Mode has three radii for one button | `StageMode.jsx:399,432,452,460,656,767` (4 px) vs `:514,526,552,697,743,755,794` (6 px) vs `:641,669` (8 px) — the 8 px outliers are Prev/Next, the most important controls |
| Both Stage Mode elevation cues are inert | `shadow-xl` at `:474` and `:683` are `rgb(0 0 0 / 0.1)` over `bg-black`, compositing to `#000000`. Zero visible delta |
| No `focus:` or `active:` states anywhere | Zero in all of `src/`, against `docs/ux-spec.md:250` |
| `prefers-reduced-motion` required but absent | `docs/ux-spec.md:253` requires it; absent from `src/`. `assets/tokens.css` now provides it |
| Three conflicting song-change budgets | 150 ms / 90 ms / 80 ms in the docs |

### The negative results that shape the design

- **Apple publishes no numeric corner radius, spacing scale, elevation ladder, or motion duration.**
  Only two corner *styles* exist (`circular` / `continuous`); "squircle" does not appear on the
  HIG. Every such token is a project decision, tagged as one.
- **`corner-shape` is unavailable on Safari iOS and Firefox Android** (verified against
  `@mdn/browser-compat-data`; Chrome 139, `safari_ios: NO`, `firefox_android: NO`). The macOS squircle
  cannot ship natively. `backdrop-filter`, which carries the same visual language, is available
  everywhere (Safari iOS 18, Firefox Android 103). `animation-timeline` is **not** on Firefox
  Android and needs a guard.
- **The macOS agent-skill ecosystem is not trustworthy**: five candidates totalling 2,529 stars,
  two unlicensed, one archived, one seven months stale, against 178,684 stars for the best generic
  skill. Three orders of magnitude. It is thin because the good guidance is Apple's own prose, which
  is why this project encodes it directly with citations.
- **Legibility at distance cannot be sourced from WCAG.** WCAG 2.2 scopes itself to content that
  "does not emit light" and its 24 px threshold is a contrast threshold, not a distance one. §6 of
  the tier-3 reference is therefore a labelled open question with six ranked candidate sources and
  interim rules. No invented numbers. WCAG *did* supply one usable fact: the red-on-black
  protanopia rationale, which is why `cem.rose` is barred from the projector surface.

### Budget, measured

`pnpm build` → one chunk, `232,032 B` gzip. That is **82 kB over** the 150 kB ceiling in §9.13, and
the 120 kB landing ceiling is unreachable until code splitting happens. This unit does not attempt
it; the contract it produces is the prerequisite, not the fix.

### Still open

The dense-grid gap named in §11 held. All four references and the Apple HIG cover chrome and
surfaces; none covers a dense editable data grid at 40 rows. The skill covers tier 1, 2, 3a and
3b and says so rather than inventing guidance and attributing it to Apple.
