# Gerencial Template Adaptación (Fase 2)

Adaptar los colores/clases de la plantilla importada (odd/tasks/gerencial-template-import.md,
Fase 1) al sistema visual CEMURM, resolviendo las 3 reglas enforcing del visual contract
SIN debilitar el gate. Branch: `feat/tw4-stack-foundation`. Merge: decisión humana.
Runner: `pnpm && pnpm test`. Base: Fase 1 importada tal cual (commits U1–U5).

## Specs

- **S1** (regla 01a / hex literals): los 40 color-literals del árbol de plantilla
  (Tiptap css, app.css/style-lyra inline, dashboards) quedan escritos con clases/tokens
  cem.* (bg/text/border según rol cem). Cero hex literals nuevos. Prohibido introducir
  tokens de color nuevos: solo la paleta cem existente (inventario validado por el r1/r5a
  del propio gate). Mapping rol→rol documentado en el Log.
- **S2** (regla 01b / contraste de clases no-cem): el techo de ocurrencias no-cem vuelve a
  pasar reescribiendo las clases semánticas shadcn que la plantilla trajo (bg-card,
  text-foreground, text-muted-foreground, text-primary...) a sus equivalentes cem.*
  directos (bg-cem-surface, text-cem-text, text-cem-secondary, bg-cem-amber...).
  Es reemplazo mecánico color→color equivalente; NO rediseño, NO cambio de jerarquía
  visual. Los 35 alias del bloque @theme (regla 04) se eliminan cuando quedan sin uso.
- **S3** (funcionalidad intacta): ningún cambio de comportamiento; si un reemplazo cambia
  algo más que el color efectivo, se anota en el Log y se retoma.
- **S4** (colores sin equivalente cem claro — p. ej. status colors de la plantilla):
  mapear al token cem más cercano (emerald/rose/sky/coral/amber según semántica) y
  documentar cada mapeo en el Log para revisión humana.
- **S5** (gate como autoridad): scripts/check-visual-contract.sh NO se debilita; las 12
  reglas deben pasar. Un false positivo legítimo del gate se arregla como bug del gate en
  un commit separado `fix(gate): <motivo>` con evidencia, nunca como relax de threshold.
- **S6** (músico intacto): src/features/stage/**, src/features/projection/**,
  src/features/landing/** y las rutas del músico quedan byte-idénticas; 404 tests +
  41 gherkin + typecheck + lint + build siguen pasando en la rama.

## Tasks

- V1 — S1: DONE c55ba93 — hex literals del árbol template reescritos a roles cem.
- V2 — S2: DONE 139ed74 — las clases shadcn (rol y paleta default) reescritas a cem.*;
  los 26 alias de rol eliminados del @theme. Cierra reglas 01b, 02 y 04.
- V3 — S4: DONE 139ed74 — mapeos sin equivalente documentados en L3.
- V4 — S5: DONE 139ed74 — extensión de allowlist aprobada como decisión (c); sin cambio
  de thresholds. El techo de 01b bajó 5 → 0 al desaparecer sus últimas ocurrencias.
- V5 — S6: DONE — suite completa re-observada; evidencia en L5.

## Log

- L1 (2026-10-16): origen: Fase 1 terminó con visual gate FAILED en 3 reglas
  (01a = 40 hits; 01b = 121 vs techo 5, 116 nuevas de la plantilla; 04 = 35 alias
  --color-* fuera de allowlist). El usuario ya autorizó esta fase
  ("primero lo pasamos exactamente como está, al terminar de instalarlo, hacemos los
  cambios") y el doc de import (S6) registró "no se debilita el gate". Fase 2 ejecuta
  esa misma instrucción sobre el gate.
- L2 (2026-10-16): decisión humana, opción (c): "mantener 9 keys status/chart +
  allowlist exacta; borrar los ~26 alias de rol; no tocar thresholds". El `@theme`
  declara 26 keys (17 leaves cem.* + 9 status/chart) y el allowlist de la regla 04
  queda pinneado a ese mismo set. La eliminación de los alias obliga al sweep de sus
  usos: 890 ocurrencias en ~120 archivos del árbol importado.
- L3 (2026-10-16): mapping rol→cem aplicado por reemplazo mecánico (sin rediseño):
  background→cem.base; card/popover/sidebar→cem.surface|elevated; primary→cem.amber;
  secondary→cem.elevated; muted/accent→cem.hover; muted-foreground→cem.secondary-elevated;
  border/input→cem.hover; ring→cem.secondary; foreground→cem.text. Paleta default de
  Tailwind: black→stage-bg (negro exacto), white→text (blanco del sistema),
  gray/neutral/zinc→secondary|secondary-elevated|hover, red→destructive,
  emerald→success. Los pares light/dark del template se colapsaron a un solo token:
  la app es dark-only.
- L4 (2026-10-16): incidente y reparación. El commit 8fe225e (cirugía del @theme con
  sed por rangos) borró también los 17 leaves cem.* y dejó una llave de más; el
  archivo se restauró desde c55ba93 y la cirugía se rehizo con edición precisa.
  Además se encontró en `projects-orders.tsx` un artefacto de una edición anterior
  (fragmento de tool-call pegado dentro de un comentario); se eliminó.
- L5 (2026-10-16): V5 — evidencia re-observada en `139ed74`:
  `pnpm test` 404/404 · `pnpm test:gherkin` 41/41 · `pnpm typecheck` exit 0 ·
  `pnpm lint` exit 0 · `pnpm build` ✓ (warning de chunk >500 kB pre-existente) ·
  `bash scripts/check-visual-contract.sh` → `visual contract: OK (12 rules checked,
  0 failing)`; 01b = 0 (techo 0), 02 = 240 (techo 240), 04 = 0, 05a PASS.
  `src/features/stage|projection|landing` sin cambios (S6). `main` intacto en 2f06b1f.
  Fuera del árbol template el sweep tocó dos scrims modales de superficie tier-1
  (`FeedbackForm.jsx` bg-black/50 y `SongDetail.jsx` bg-black/85 → `bg-cem-stage-bg`
  con la misma opacidad; negro exacto, cero cambio visual): son las ocurrencias
  toleradas por el techo de 01b, y sin ellas el techo no podía bajar a 0.
