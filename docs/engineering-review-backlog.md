# Engineering Review — Backlog Findings

> Fecha: 2026-09-15 · Estado: evaluados, pendientes de planificación
> Fuente: revisión de ingeniería del estado post-Hito 2 (monorepo SPA Vite/React + Supabase hosted, `pnpm`, sin CI).
> Regla de entrada: cada ítem se implementa solo cuando su hito/feature BDD lo requiere — YAGNI activo.

## 1. TypeScript migration (classes/interfaces at minimum)

- **Evaluación**: el codebase es JS/JSX plano (131 módulos). Migrar a TS completo es un cambio de todo el árbol sin valor de usuario directo; el coste es alto justo antes de Hito 3 (colaboración). El mínimo viable pedido (classes/interfaces) solo tiene sentido en librerías de dominio: `src/lib/{transpose,annotations,songs,setlists}.js` son los candidatos naturales ya que concentran lógica pura con invariantes (tonalidades, anclas, versiones).
- **Decisión**: NO ahora. Re-evaluar al cierre de Hito 3 o si `docs/technical-spec.md` lo exige. Si se hace: JSDoc + `checkJs` primero (cero coste de build), luego tipos en `lib/` de dominio solamente.
- **No hacer**: convertir pages/components/hooks a TS sin necesidad; el contrato de repo es JSX.

## 2. Microservices split for 50+ concurrent users

- **Evaluación**: 50 usuarios concurrentes sobre Supabase hosted (Postgres + GoTrue + Realtime) no justifica microservicios — la PWA es client-heavy, casi todo el estado vive en el navegador e IndexedDB; la API es CRUD fino sobre RLS. Un split añadiría orquestación, operación y latencia sin concurrencia que lo demande.
- **Decisión**: NO. Mantener SPA + Supabase. Revisar solo si la medición muestra >~500 concurrentes reales o un hot path específico (p. ej. Realtime por setlist compartido en Hito 3 con cientos de suscriptores). En ese caso: subir recursos de Supabase / particionar Realtime, no microservicios.

## 3. Cloudflare R2 buckets implementation

- **Evaluación**: R2 (u Object Storage equivalente) aplica cuando existan archivos de usuario grandes: PDF scans (`pdf-scan-charts`, Hito 5), exports (`export-and-sharing`, Hito 6), imports URL (Hito 4). Hoy no hay assets binarios fuera del bundle. La tabla `outbox` y la capa offline no tocan almacenamiento de objetos.
- **Decisión**: DIFERIR al hito que introduzca binarios (Hito 4/5). Diseño a preparar entonces: bucket privado + presigned URLs vía edge function (o Supabase Storage, más integrado), políticas RLS como delimitador de autorización, sin claves en el cliente.

## 4. API rate limiting

- **Evaluación**: hoy toda la API es Supabase PostgREST — el rate limiting lo pone el plan de Supabase (gateway). La superficie expuesta que merece límites propios es la futura API pública (Hito 4: biblioteca pública, perfiles) y cualquier endpoint sin auth. No existe backend propio donde instalar límites.
- **Decisión**: DIFERIR a Hito 4 (primera superficie no autenticada/consultable). Implementación esperada: gateway/edge level (Cloudflare o Supabase platform limits) + validación en edge functions si se añaden; nunca en el cliente.

## 5. GitHub secret-keys usage

- **Evaluación**: hoy NO hay CI ni despliegue (no existe `.github/workflows` con jobs de build; el único workflow es el runner de lint-and-build de formato PR? — verificar). No se necesitan secrets de GitHub mientras no haya pipeline. Los secretos reales (Supabase URL/anon key) son públicos por diseño (PWA cliente); la service_role y claves de entorno viven en `.env.local` gitignored y `supabase/config.toml`.
- **Decisión**: ACCIÓN PENDIENTE solo cuando exista CI/CD (Hito 3+): usar GitHub Secrets para cualquier token de despliegue; GitGuardian ya corre y pasa (escaneo activo en PRs). Regla: jamás committed de service_role / factor de despliegue; rotar si se filtra.

## 6. Container/image builds

- **Evaluación**: la app es una SPA estática (Vite → `dist/`). Un container no aporta nada al despliegue actual (CDN/static hosting es lo apropiado). Contenedores solo tendrían sentido para un backend propio o edge functions autocontenidas (no existen hoy — todo es Supabase).
- **Decisión**: NO construir imágenes para la app. Si en Hito 5/6 aparece servicio auxiliar (import pipeline, worker), evaluar ahí: imagen liviana + registry + CI. Para el PWA: static hosting (Cloudflare Pages / Netlify / Supabase hosting) con build en CI.

## 7. La vista de grados no renderiza ningún numeral

> Añadido 2026-09-28. **Defecto medido, no hipótesis**: leído en la app corriendo, no deducido.

- **Evaluación**: con la vista de grados activada el renderizador pinta el **acorde concreto** atenuado y **ningún numeral**, para todos los acordes, tanto a offset +2 como a offset 0. `resolveDegree('C major', 'G')` devuelve `null`, y `G` en Do mayor es grado 5 sin ambigüedad posible. La fila del catálogo está presente y correcta (`Major` = `{0,2,4,5,7,9,11}`, `integer[]`) y `authenticated` tiene SELECT sobre `scale_catalog`, **así que los datos no son el bloqueo**. La causa raíz **no está pineada** y no se adivina aquí.
- **Dos mecanismos, medidos por separado**:
  1. `buildDegreeMap` keyea el mapa por el acorde **concreto** (`Dm`) mientras el renderizador busca el **traspuesto** (`Em`). Con cualquier offset distinto de cero el lookup no puede pegar. Esto explica el fallo a offset no-cero y **no** el de offset cero.
  2. El fallo a offset cero es independiente y sigue sin explicar.
- **Consecuencia sobre `fix-degree-quality-derivation` (#217)**: `qualityForDegree` está aguas abajo de un mapa que nunca se puebla, así que **arreglarlo no cambia nada observable en la app**. El escenario *"Degree quality derives from the scale"* no puede pasar en la app corriendo diga lo que diga el fix. #217 es correcto y útil a nivel de módulo, pero **no es demostrable en browser** hasta que esto se arregle.
- **Decisión**: planificar. Cumple la regla de entrada del backlog — `features/music-theory.feature:65,72` lo requieren, así que no es YAGNI. Orden: primero el mecanismo (1), que es el barato y el que explica la mitad del fallo; después la causa del offset cero, que es la que hay que **investigar de verdad** porque no está identificada. Los fixtures de `test/music-theory-fixtures` (#226) dejan el caso listo para verificar sin inventar datos.
- **Trampa de verificación**: la cuenta demo del seed trae `transpose_offset = 2, capo = 1` en `user_preferences`, así que cualquiera que entre como `demo@cemurm.app` está siempre en offset no-cero. Eso es lo que ocultó el mecanismo (1) de las primeras lecturas. Cualquiera que mida esto tiene que ponerlo en 0 explícitamente y **restaurarlo después**.

## 8. Numeración de migrations: 0029 está reclamado dos veces

> Añadido 2026-09-28. Encontrado al numerar `0032_overlay_access_token.sql`.

- **Evaluación**: `0029` está tomado por dos cambios **sin relación**: `0029_feedback.sql` en los cuatro branches de `m2-feedback` (`feat/m2-feedback-data{,-v2}`, `feat/m2-feedback-ui{,-v2}`) y `0029_fail_closed_minors.sql` en los branches de guardian (`origin/fix/fail-closed-minors`, `origin/feat/guardian-consent-db`, `origin/feat/guardian-email`). `0030` y `0031` también están ocupados. El AGENTS.md advierte de esta carrera y ya se materializó.
- **Por qué importa**: `supabase db reset` ejecuta los `.sql` **por orden de nombre**, así que dos archivos con el mismo prefijo de versión tienen un **orden relativo arbitrario**, y el ledger de migraciones se keyea por ese número. Si ambos aterrizan, uno puede no aplicarse o aplicarse en el orden que no le toca.
- **Defecto secundario en la misma área**: `0029_feedback.sql` (#190) llega **sin smoke test**, siendo la única migration desde 0022 que no lo trae. La convención se sostiene sin excepción desde ahí.
- **Decisión**: planificar. Renumerar una de las dos antes de que aterrice, y agregar el smoke que falta. No es urgente mientras ninguna de las dos haya aterrizado; es urgente en cuanto la primera lo haga.
- **Relacionado**: `supabase_migrations.schema_migrations` está **vacía** en la base local aunque el schema refleja las 27 migrations de `main` (verificado objeto por objeto, 0019→0028, sin drift). El CLI no puede responder qué está aplicado porque no hay ledger. No bloquea nada del flujo actual (`db reset` + smoke), pero cualquier herramienta que pregunte "qué falta" recibe una respuesta falsa.

## 9. El ruleset bloquea los pushes al upstream — requiere una cuenta con `admin`

> Añadido 2026-09-28. **Bloquea toda la cola de landing.** Los 23 PRs abiertos entran por fork
> mientras esto siga así. No es una molestia: es un commit que no se puede subir.

- **Evaluación**: el ruleset se llama `PR`, id `24085467`, `target: branch`, `conditions.ref_name`
  `include: ["~ALL"]`, `enforcement: active`, `bypass_actors: []`. Exige
  **`GitGuardian Security Checks`** con **`do_not_enforce_on_create: false`**. Un commit recién
  pusheado **no tiene check todavía**, así que no puede satisfacer el requisito y el push se
  rechaza. Medido: un push a `feat/m2-feedback-data-v2` volvió
  `push declined due to repository rule violations`, y el permiso `push` de esa cuenta es `true` —
  sólo `admin` es `false`, así que **no es un problema de permisos**.
- **El escáner sí funciona.** `GitGuardian Security Checks` aparece `completed/success` en los
  commits de los PRs #185, #182 y #181, con el nombre exacto que el ruleset exige. O sea el requisito
  es satisfacible **en un pull request**. Lo que no es satisfacible es en un push.
- **El repositorio NO está congelado, y esto primero se afirmó mal**: se afirmó que
  nadie había pusheado desde que el ruleset existe, **muestreando** seis branches. Falso. Enumerando todos los
  refs hay commits **posteriores** al ruleset: `17:41 docs/minor-compliance-debt-plan`,
  `17:40 feat/guardian-consent-db`, `17:35 feat/jsdoc-libs-v2-base`, `17:27 docs/resend-guardian-consent`,
  `17:26 feat/jsdoc-libs-s11-core-misc`, `17:23 feat/guardian-email`. El mecanismo por el que esos
  pushes pasan y el mío no **no está determinado** y no se especula aquí: `bypass_actors` está
  vacío, lo que significaría que nadie lo saltea, incluidos owner y admins, y sin embargo esos seis
  commits aterrizaron.
- **Corrección a una receta dada antes**: `do_not_enforce_on_create: true` **no** desbloquea esto.
  Sólo deja de exigir el check en la *creación* de branch. Un commit nuevo no tiene check de ninguna
  de las dos formas, así que los pushes a branches existentes siguen rechazados. Para los pushes hay
  dos salidas y **ninguna** es el ajuste de un solo booleano.
- **Decisión — requiere una cuenta con `admin`**, y es la primera recomendación de prioridad de todo
  este backlog:
  1. **Mover el requisito de `target: branch` a `target: pull_request`** (recomendado). Los pushes
     vuelven a funcionar y **cada PR sigue pasando por el escáner**, que es lo que la regla quería
     conseguir. Es la opción que preserva la intención de seguridad.
  2. Quitar `required_status_checks` del ruleset de ramas. Más laxa: deja de exigir escaneo.
  - Antes de cualquiera de las dos, conviene reconciliar por qué los seis pushes de arriba pasaron:
    si la causa es que el owner tiene un bypass efectivo que la API no reporta, el arreglo correcto es
    **declararlo explícitamente** en `bypass_actors`, que es auditable, en vez de dejarlo implícito.
- **Nota de proceso**: la primera vez que se redactó este diagnóstico se generalizó desde una muestra
  de seis branches y se afirmó que el repo estaba congelado. Era falso, y la forma de evitarlo es la
  misma que en el resto del trabajo: **enumerar, no muestrear.**

---

## Estado de entrada

Este backlog se creó a partir de hallazgos de revisión de ingeniería post-Hito 2 (2026-09-15, tras merge de PR #88–#99). Ningún ítem bloquea el desarrollo actual; todos son candidatos a planificarse en su hito correspondiente según `docs/mvp-scope.md`. Prioridad sugerida: #5 (solo si entra CI), #4 (Hito 4), #3 (Hito 4/5), #1 (post-Hito 3), #2 y #6 (no hacer — re-evaluar con datos).

**Los ítems 7 y 8 son de otra clase**: no son decisiones estratégicas sino **defectos medidos** el
2026-09-28, agregados durante la serie de hallazgos de music-theory y la verificación en browser que
los acompaña. Ambos cumplen la regla de entrada igual que los demás (el Gherkin los requiere), y su
prioridad real es más alta que la de los ítems de Hito 4: **#7 hace que un escenario BDD especificado
no pueda pasar en la app, y #8 puede romper un `supabase db reset`.** #7 tiene fixtures listos para
verificar sin inventar datos en `test/music-theory-fixtures` (#226).
