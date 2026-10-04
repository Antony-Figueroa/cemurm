# Landing page — marketing surface for CEMURM

> Unit record for the marketing landing. Plan + team split + slice map.
> Branch: `feat/landing-page` · Base: `main` = `e849738` (2026-10-03)
> Owner of the UI: **Antony-Figueroa** · Backend/logic: **davidjesus516**

## 1. Objective

Ship a real marketing landing as a route in the app: 13 sections, dark ramp + one amber
accent, macOS/Apple visual language, under a measured performance budget.

## 2. Problem / why now

There is no marketing surface. `/` is `src/features/shell/pages/Home.jsx` — **13 lines**,
one heading, one paragraph, and it renders **inside `AppLayout`**, i.e. wrapped in the
signed-in nav chrome. That is a placeholder, not a landing.

Three constraints make this urgent and non-trivial:

- **The automated safety net for UI is two checks.** No `.jsx` is tested (there is no React
  renderer in the dependency tree) and **no `.jsx` is type-checked** — measured: `npx tsc
  --noEmit --listFiles | grep -c '\.jsx$'` is **0** against 54 `.jsx` files. So `pnpm lint`
  + `pnpm check:visual` are the only automated verification a landing page will ever get.
- **The visual gate was red on `main` for 3 days** (every push since `2026-09-30T02:28`, PR
  #199). PR **#278** pays the ratchets down and is green. **#278 must land first.**
- Ratchets `01b`/`02` are *ceilings*. New UI that adds Tailwind default-palette utilities or
  the four dead accents increases the debt #278 just paid down.

## 3. Upstream source, and one correction

The design plan lives on the **unmerged** branch `feat/cemurm-brand-landing`
(`odd/tasks/cemurm-brand-landing.md`, added in `dfb0fbc`). It is thorough: 13 sections, scope
in and out, design tokens, aesthetic direction, tech stack, and a performance budget with
numbers. Sections referenced below by § are from that document.

**Correction to the upstream plan:** its §7.1 cites `src/lib/supabase.js:3-8` as the Supabase
client. That path does not exist — the client is **`src/data/supabase.js:4-8`**, and that is
where the module-load throw lives. Anyone reading the plan and grepping `src/lib/` will find
nothing.

Where this record states a count, it was measured on 2026-10-03. Where it does not, the number is
inherited from the upstream plan and has **not** been re-verified.

## 4. Scope

### In scope (Antony — build directly)

1. The 13 sections as markup + Tailwind, on the additive token layer.
2. Header + footer, hero **Stage Bus** demo, all prose sections, responsive behaviour.
3. `lucide-react` replacing the emoji/glyph usage; `motion` **landing chunk only**.
4. Variable fonts (`@fontsource-variable/inter` + one variable mono): **872 kB → ~45 kB**.
   Today `src/app/main.jsx:3-6` imports four static Inter weights.
5. Route-level `React.lazy` + vendor chunk via `manualChunks`.
6. PWA manifest, theme-color, icons, real favicon (§7.5).

### Out of scope

| Deferred | Why |
|---|---|
| Refactor of the existing 132 source files (54 `.jsx` + 78 `.js` under `src/`) | gated on landing approval |
| Tailwind 4 migration | changes `shadow-*`/`ring`/`rounded-*` semantics used in 40+ files |
| Final mascot (Kutu) illustration art | an LLM cannot deliver final art |
| App UI strings in Spanish | needs i18n across every UI file |
| ToS, privacy policy, DMCA, contact email | all deferred, checkboxes unchecked — **so the CTA can only be a waitlist** (`docs/copyright-policy.md:231-239`) |
| Pricing tiers | do not exist; the page says "$0 during beta" |

## 5. Team split — the explicit part

**Antony-F Figueroa (UI).** All markup, Tailwind, tokens, motion, copy, responsive, the hero
demo, and **passing data into components**. He defines and freezes the prop shapes the
components accept, so the owner's backend work can land against them without a second design
pass. He does **not** implement logic, schema, or backend.

**davidjesus516 (owner — backend and functions).** Everything on the data path:

| # | Item | Status |
|---|---|---|
| B1 | Decide whether the waitlist CTA needs a **real backend** (table + RLS + migration `0034`) or an external/mailto target | **open — blocks the CTA only** |
| B2 | If B1 is real: migration, RLS policy, and the submit function | blocked by B1 |
| B3 | **Lazy Supabase client** (§7.1) — moving the `src/data/supabase.js` throw from module load to first authenticated use is a **contract change** | **needs the owner** |
| B4 | Any auth/route contract change the landing forces | needs the owner |

**Neither side blocks the other.** Every section except the CTA form renders with static
content, so the landing can be built and reviewed in full while B1–B4 are open. The CTA is
designed against a frozen prop shape and wired when B2 lands.

> B3 is the one that looks like UI work and is not. Making the client lazy changes when a
> missing-env error throws. That is a behaviour contract, so it belongs to the owner.

## 6. Open decision — route placement

Today `/` is `Home` inside `AppLayout` (nav chrome). A marketing landing must sit **outside**
`AppLayout`. The repo already has the pattern with its reasoning written into
`src/app/router.jsx`: `/external-display` and `/overlay/:token` are top-level route objects
outside `AppLayout` and outside the auth guards.

| Option | Consequence |
|---|---|
| **A — landing replaces `/`** | best SEO and the honest marketing root, but `Home` disappears and the nav's "Home" link must be retargeted. Touches signed-in UX |
| **B — landing at a new path, `/` stays** | zero risk to the app, nothing to retarget. Weaker as a marketing root |

Not decided. **Antony decides**, with the owner's nod, because option A changes signed-in
navigation.

## 7. Slices

Each slice is its own PR, ≤400 changed lines. `pnpm check:visual` must pass on every one.

| ID | Slice | Depends on |
|---|---|---|
| **L0** | This plan + team split | ✅ `e74667e` |
| **L1** | Token layer, route outside `AppLayout`, section scaffold, header + footer | ✅ landed |
| **L2** | Hero Stage Bus demo (the one memorable thing) | L1 |
| **L3** | Prose sections 3–5, 7–13 | L1 |
| **L4** | Section 6 (Stage Bus) + section 8 (capacities by role) | L1 |
| **L5** | Code splitting: `React.lazy` + vendor chunk + fonts + PWA | L1; **B3** for the Supabase client |
| **L6** | CTA wiring + perf verification against §7.7 | L1; **B1/B2** |

**L1 delivered less than this table promised.** It was scoped to include the additive token
layer; that part was **not built**, because adding keys to `tailwind.config.js` was outside the
allowed edit surfaces and because it is a visual decision that should be deliberate rather than
a side effect. See D1.

### Decisions L1 raised

**D1 — RESOLVED: the reference's §5.2 scale is adopted.** Committed in the same slice. L2–L4 can
now use real radii.

| token | px | class | §5.2 assigns it to | min height |
|---|---|---|---|---|
| `radius-xs` | 4 | `rounded-cem-xs` | tag, key badge, small chip | fixed |
| `radius-sm` | 8 | `rounded-cem-sm` | text input, icon button, segment, menu row | 32 |
| `radius-md` | 12 | `rounded-cem-md` | button, list row, toolbar control, tab item | 44 |
| `radius-lg` | 16 | `rounded-cem-lg` | card, panel, setlist block, dialog body | 88 |
| `radius-xl` | 22 | `rounded-cem-xl` | sheet, modal, popover, command surface | full-bleed on one edge |

**Named `cem-*` tokens, never Tailwind's default radius classes.** The defaults collide *in
meaning*: `rounded-md` is 6px where §5.2's `radius-md` is 12px, and §5.2 assigns that token to
buttons. `radius-xl` = 22px matches no Tailwind step at all (`rounded-3xl` is 24px). Verified in
the built CSS that the defaults are untouched — the trap stays visible.

§5.2 states outright that **Apple publishes no numeric radius**, so this scale is a
`[CEMURM DECISION]` and adopting it is legitimate. The scale in
`skills/cemurm-visual-system/assets/tokens.css` (4/6/10/14/20) is **not** adopted.

### What L2–L4 must not forget (all from §5)

1. **Same component class, same radius, always.** A per-instance radius is forbidden. Six named
   tokens exist so there is no excuse for a one-off value.
2. **The min heights above are a reviewer rule, not a token rule.** `border-radius` carries one
   number; "min height 44" is a relation between that number and the element's box, and no gate
   can see the relation. Check it by eye.
3. **A card's radius may not exceed a control on it by more than 4px.** A `radius-xl` sheet
   holding `radius-xs` badges reads as broken.
4. **Never exceed one third of the short edge.** `rounded-full` on a 44px control is a pill, not a
   button. Note there is **no `cem-full`** — reach for `rounded-full`.
5. **Horizontal row → capsule; vertical stack → rounded rectangle.** Verbatim Apple.
6. **Capsule is for the primary standalone action only.** "A screen with three capsules has no
   primary action."
7. **Tier 1 takes min-height 44; tier 3a takes 48.** Not a conflict — §7.4 deliberately raises
   every radius and min-height by 4px for a tablet clamped to a stand.
8. **Stage mode must not consume these tokens.** §5 rule 7 raises every token by 4px and caps
   `radius-xl` at 28px, so `rounded-cem-md` there would be wrong by 4px. The stage scale belongs
   in `references/tier-3-performance-surfaces.md` and is not encoded.

Two inconsistencies inside §5.2 itself, resolved in favour of the table:

- **Rule 1's formula cannot produce `radius-xs`.** It clamps a derived radius to `[8, 22]`, so
  4px never falls out of `0.28 × min(w,h)`. `radius-xs` is legitimate only via the table's
  "fixed" note.
- The formula's clamp ceiling of 22 and the table's `radius-xl` of 22 agree, but rule 7's 28px
  stage cap does not exist in the table. Stage owns it.

**D2 — "El ciclo del servicio" → "El ciclo del culto".** Upstream §8.1 titles the section "El ciclo
del servicio"; §8.3 bans `servicio` for a worship service because it is ambiguous for a church
audience and sanctions *culto* / *junta*. The two collide on exactly this section. The hard rule
won; it is one string in `landing.es.js:76` if the literal title is wanted instead.

**D3 — the `cue` ban cannot be enforced naively.** `grep cue` matches **"frecuentes"**. Any check
needs `\bcue\b` *and* must exclude comments, or it flags both that and the very comment that
documents the ban. Separately, upstream §8.3 claims `cue` has "zero occurrences across all 45
feature files" — true of `features/`, false of the repo: it is live in
`docs/propuestas/live-engine-sesion-en-vivo.md` and `docs/architecture-current.html`.

**D4 — no renderer means an invalid utility is undetectable.** A `.jsx` class that does not exist
emits no CSS, no build warning, no lint error and no gate hit, because the gate greps class
*names*. A `backdrop-saturate-180` was written and caught only by auditing every static class
against the built stylesheet (Tailwind's scale stops at 150). For a repo whose entire UI
verification is `lint` + `check:visual` + `build`, an invalid utility is indistinguishable from a
valid one. Consider a rule that greps each `className` token against the emitted CSS.

**D5 — the ratchets have ZERO headroom.** After #278, `01b` sits at 5/5 and `02` at 234/234. A
single use of `cem-rose`, `cem-emerald`, `cem-sky` or `cem-coral` in L2–L4 **fails** the gate
rather than warning. This constrains every later slice's colour choices.

**D6 — upstream §5.3/§9.4 contradict the skill.** The plan demands "Zero `border-radius` in the
page structure"; the skill's reference explicitly replaces that mandate and `AGENTS.md` names the
plan's §5–§6 as superseded for visual decisions. The skill wins. Worth correcting in the plan text
so the next reader does not "restore" zero radius.

## 8. Performance budget (§7.7) — acceptance criteria

| Metric | Today | Target |
|---|---|---|
| JS gzip, first visit (landing) | 234 kB | **≤ 120 kB** |
| Largest single chunk | 855 kB raw | ≤ 150 kB gzip |
| Font payload | 872 kB / 56 files | ≤ 45 kB / 2 files |
| LCP, 4G throttle, mid-tier Android | unmeasured | < 2.0 s |
| CLS from fonts | unmeasured | 0 |
| Non-user-triggered motion moments | — | 1 |

**Motion policy, load-bearing:** no animation library in the authenticated bundle. Not one.
CSS-native motion first (View Transitions, `animation-timeline: view()`, `@starting-style`),
all behind `@supports` guards for Firefox.

## 9. Micro-interaction guide

A decision procedure, not a catalog. Both source libraries ship their components as
**copy-paste source**, so a component costs zero bundle bytes — only the technology underneath it
costs anything. Decide the technology first, then pick the component.

### 9.1 The rule

| The interaction is | Use | Cost |
|---|---|---|
| section enters / leaves the viewport | `animation-timeline: view()` + `@supports` | 0 |
| element enters for the first time | `@starting-style` + a transition | 0 |
| route / page change | View Transitions API | 0 |
| press, hover, focus feedback | Tailwind transitions | 0 |
| **orchestrated state** (the hero's role rotation) | `motion` — landing chunk only | ~18 kB |
| scroll-jacking, parallax on a container, physics | **nothing** — refuses the brief | — |

The fifth row is the only one that costs, and §7.7 budgets **one** non-user-triggered motion
moment. Everything in rows 1–4 reacts to the user.

### 9.2 Per section

Only two sections need motion. Everything else is text, and text that competes with motion is text
nobody reads.

| Section | Needs | Technology |
|---|---|---|
| **hero** | role rotation, orchestrated | `motion`, landing chunk only |
| **el ciclo** (5) | sequence highlighting as it scrolls | `animation-timeline: view()` |
| all others | nothing | — |

The hero is the single memorable thing. Spend the budget there and nowhere else.

### 9.3 Hard constraints

- **Firefox has no scroll-driven animations.** Verified. Guard with `@supports` and let it degrade
  — degrading is correct, breaking is not.
- `prefers-reduced-motion` is already handled in `src/app/index.css`. New motion inherits it; do
  not override it.
- Ratchets `01b` (5/5) and `02` (234/234) have zero headroom. One dead accent or default-palette
  utility **fails** the gate. Choose colours before building.
- Verify every Tailwind class against the built CSS. An unknown utility emits nothing and trips no
  check — `backdrop-saturate-180` proved it (see D4).

### 9.4 Where to look, and what is verified

**Verified names** (extracted from Magic UI's raw HTML, so they exist): Shimmer, Marquee, Counter,
Ripple, Meteo, floating-3d-particles.

**Not verified:** the full React Bits and Magic UI catalogs. Both render client-side and expose no
component list in the HTML, so **treat any specific component name as unverified until you open its
page**. Do not copy a name from this file into code on my word.

Browse for examples: `60fps.design` (curated interaction details from top apps). Lifting a
*technique* from there is free; lifting a *component* still means checking its dependency cost.

**Out of scope, deliberately:** three.js via `threeui` (~150 kB, consumes the whole landing
budget), and `metalforge` shaders (churns against CSS-native-first).

`pnpm check:visual && pnpm lint && pnpm build`

`pnpm test` too, though it covers no UI. `pnpm typecheck` is **absent from CI** and covers
zero `.jsx` — do not present it as UI evidence. There is no test to write for a `.jsx`
component: the dependency tree has no renderer.

Before trusting any local result, confirm the toolchain is current — the main checkout's
`node_modules` was stale (Vite 5.4.21 / Vitest 3.2.7 against a lockfile demanding Vite 6.4.3
/ Vitest 5.0.2). `pnpm install --frozen-lockfile` first.

## 10. Progress

| ID | State | Evidence |
|---|---|---|
| L0 | done | `e74667e` |
| L1 | done | 289 added / 0 removed, 6 files |

**L1 verification** (run against the #278 base, where the gate is green):

```
pnpm check:visual   visual contract: OK  (10 rules checked, 0 failing)
pnpm lint           exit 0
pnpm test           307 passed (307), 9 files
pnpm build          exit 0
```

Gate WARNs are all pre-existing at their baseline and none moved: `01b` 5/5, `02` 234/234,
`05b` 13 report-only, `r1` 30 report-only, `r2` 17 report-only.

L1 consumed only existing tokens — `cem.base`, `cem.text`, `cem.secondary`, `cem.amber` — plus
alpha modifiers. **Zero new colour tokens**; `tailwind.config.js` was not touched. `cem-amber`
appears exactly twice: the wordmark and the primary CTA. The header hairline is
`border-cem-text/10`, derived from a token with an opacity modifier rather than hardcoded, which
also keeps it clear of rule 01b (`border-white/*`).

`pnpm typecheck` exits 0 and covers **none** of it — `grep -c '\.jsx$'` on the program is 0. Not
evidence. No `// @ts-check` was added to any `.jsx`, because it is inert there.

Bundle delta: **+3,514 B raw / +1,064 B gzip**. The landing is statically imported, so it lands in
the main chunk; that is what L5's `React.lazy` + `manualChunks` exists to undo. The §7.7 budget is a
whole-landing criterion and is **not** met.

Route is `/landing`, deliberately neutral, because §6 is undecided. It sits outside `AppLayout`
following the existing `/external-display` and `/overlay/:token` pattern.

**Token layer follow-up owed:** `src/app/index.css` also declares the five utilities as plain
rules (`.rounded-cem-md { border-radius: var(--cem-radius-md) }`) because Tailwind is JIT and
emits nothing for a token with zero usages. Once the first component uses these tokens Tailwind
will emit them as well and that hand-written block becomes redundant — delete it then.

**Blocked on:** B1–B4 with the owner for L5/L6. **L2–L4 are unblocked.**