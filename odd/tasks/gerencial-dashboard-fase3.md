# Gerencial Dashboard Fase 3 — datos reales sobre el template completo

Cablear el template gerencial ya importado (Fases 1–2, PR #383) a datos reales de
CEMURM sin recortar su esquema, estructura ni visual. Branch:
`feat/tw4-stack-foundation-pr3-admin`. Base: `feat/tw4-stack-foundation-pr2-typecheck`
(F1). Merge: decisión humana. Runner: `pnpm && pnpm test`.

## Specs

- **S1** (template completo): las 25 vistas y todas las rutas del template quedan
  montadas en `/admin` — dashboard, blog (5), notes, tickets (2), pages (3),
  icons, auth (4 + error/maintenance). No se elimina ninguna. La verificación
  contra la fuente (`/home/antony/Descargas/shadcndashboard-main/src`) da 0
  archivos faltantes en la copia importada.
- **S2** (acceso gerencial): `/admin` vive dentro de `RequireAuth` y
  `RequireGuardianConsent`; además, `RequireGerencial` exige `system_admin` en
  `public.user_roles` o una membresía activa en `org_memberships` con rol
  `org_owner`, `org_admin` o `branch_admin`. Sin acceso → `/`. Fail-closed: una
  lectura que falla no concede acceso.
- **S3** (dashboard real): el home `/admin` deja de usar arrays hardcodeados y
  lee conteos/listas de `src/data/repositories/` (`songs`, `setlists`, `gigs`,
  `rehearsals`, `bandmates`, `orgRepertoire`) para la organización activa del
  usuario. Se conserva la estructura de cards y grillas del template; sólo
  cambian labels y datos.
- **S4** (perfil real): `/admin/pages/user-profile` lee
  `profiles.getProfile` y `orgRepertoire.getMyOrganizations` en vez de datos
  demo.
- **S5** (tablas reales): `/admin/pages/tables` lista canciones y setlists
  reales del usuario con las mismas primitivas de tabla del template.
- **S6** (pantallas sin dominio): blog, notes, tickets, icons y el auth del
  template quedan como pantallas demo visuales. No fingen persistencia: no
  escriben en Supabase y muestran una marca de "demo" donde el template ya
  mostraba datos falsos. No se inventan tablas ni RPCs.
- **S7** (tema): `ThemeProvider` se monta en el subtree `/admin` para que el
  toggle del template tenga efecto; `defaultTheme="dark"` porque la paleta cem
  es un ramp oscuro.
- **S8** (músico intacto): `src/features/stage/**`, `projection/**`,
  `landing/**` y las rutas del músico no cambian. Gates: typecheck, lint, test,
  gherkin, build, visual.

## Tasks

- T1 — S2: guard `RequireGerencial` + montaje de `/admin` dentro de los guards.
- T2 — S7: `ThemeProvider` en el subtree admin.
- T3 — S3: home con métricas y listas reales.
- T4 — S4: user-profile real.
- T5 — S5: tables real.
- T6 — S6: marcar demo y aislar escrituras falsas.
- T7 — S8: docs + gates + evidencia.

## Log

- L1 (2026-10-20): pedido del usuario, verbatim: "si, quiero que se replique el
  esquema estructura y visual del dashboard que pase, TODO". Decisión de alcance
  elegida por el usuario: "Template completo en /admin: se quedan las 25 vistas
  del template (dashboard, blog, notes, tickets, pages, icons, auth). Se cablean
  a datos CEMURM donde exista equivalencia; las que no tengan dominio quedan como
  pantallas demo hasta definirlas."
- L2 (2026-10-20): conflicto detectado y resuelto. En el working tree hay un WIP
  sin commitear (`features/internal-operations-console.feature` +
  `openspec/changes/add-internal-operations-console/`) que propone un console
  staff en `/dashboard` con 5 secciones y excluye blog/tickets/notes. El usuario
  eligió el template completo en `/admin`; ese WIP no se toca en esta rama.
- L3 (2026-10-20): completitud contra la fuente verificada con `comm` sobre las
  listas de archivos de `src/views`, `src/layouts`, `src/components`,
  `src/routes`, `src/context`, `src/hooks`, `src/types` y `src/api`: 0 archivos
  de la fuente faltantes. Los 10 archivos extra de la copia son hooks CEMURM
  preexistentes (`useActiveOrgName`, `useBandmates`, `useGigs`, `useMidi`,
  `useModeration`, `useNotifications`, `usePlanningCenter`, `usePreferences`,
  `useSetlists`, `useSongs`).
