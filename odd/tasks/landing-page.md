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
| **L0** | This plan + team split | — |
| **L1** | Additive token layer, route outside `AppLayout`, section scaffold, header + footer | **#278 merged** |
| **L2** | Hero Stage Bus demo (the one memorable thing) | L1 |
| **L3** | Prose sections 3–5, 7–13 | L1 |
| **L4** | Section 6 (Stage Bus) + section 8 (capacities by role) | L1 |
| **L5** | Code splitting: `React.lazy` + vendor chunk + fonts + PWA | L1; **B3** for the Supabase client |
| **L6** | CTA wiring + perf verification against §7.7 | L1; **B1/B2** |

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

## 9. Applicable checks

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
| L0 | in progress | this file |

**Blocked on:** #278 merged (visual gate green) for L1+; B1–B4 with the owner for L5/L6.