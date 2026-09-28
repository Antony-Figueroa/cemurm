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
- [ ] **T2** — Extract Apple HIG materials/color/type/layout/shape/motion/controls/dark-mode
      specifics with provenance into `references/apple-macos-visual-language.md`. *Delegated.*
- [ ] **T3** — Research component libraries, motion approaches, color tooling, and external agent
      skills with verified numbers into `references/toolchain-options.md`. *Delegated.*
- [ ] **T4** — Write `SKILL.md`: activation contract, hard rules, decision gates, execution steps,
      output contract. Body must stay 180–450 tokens; everything else goes to `references/`.
- [ ] **T5** — Write `assets/tokens.css`: the additive dark ramp + amber scale + radius scale +
      spacing scale as CSS custom properties.
- [ ] **T6** — Register the skill in `AGENTS.md` and refresh the skill registry.
- [ ] **T7** — Verify: skill body token count, frontmatter shape, section order, all internal
      reference links resolve, `assets/tokens.css` parses, no repo file outside `skills/` and
      `odd/tasks/` changed.

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
