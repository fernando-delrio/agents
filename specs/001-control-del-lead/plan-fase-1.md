# Fase 1 — Núcleo en GitHub · Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usar superpowers:subagent-driven-development (recomendado)
> o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas
> (`- [ ]`) para el seguimiento.

**Objetivo:** que una lead configure un repositorio de GitHub (nuevo o existente) con una
entrevista, y que desde ese momento cada pull request pase por puertas que no se pueden saltar, se
apruebe según su nivel de riesgo, pida excepciones a la lead cuando haga falta y deje un informe
auditable al integrarse.

**Arquitectura:** un paquete Node en TypeScript (`cli/`) con dos usos. En el equipo de la lead
hace la entrevista y genera los archivos (`lead-flow init`, `cambiar`, `generar`, `proteger`). En
la CI, una acción compuesta (`acciones/puertas/`) lo usa para ejecutar las puertas
(`lead-flow puerta <nombre>`). Todo lo decidido vive en `.lead/politica.yml` del proyecto; el
catálogo de opciones vive en este repositorio (`catalogo/`).

**Stack técnico:** Node ≥ 20, TypeScript estricto (ESM), `@inquirer/prompts`, `yaml`, Vitest,
ESLint con la plantilla de readfirst. En CI: GitHub Actions, gitleaks, Semgrep, `npm audit`,
`pip-audit` y `gh`.

**Diseño:** `specs/001-control-del-lead/diseno.md` (aprobado el 2026-11-10). Este plan se
argumenta desde él; quien ejecute lee los dos.

## Restricciones globales

- Nombre provisional del paquete y del comando: `lead-flow` (el definitivo lo elige Fernando; se
  cambia en un solo sitio: `cli/package.json` y la constante `PRODUCT_NAME`).
- Node ≥ 20; `"type": "module"`; TypeScript `strict: true`.
- Dependencias de producción: solo `@inquirer/prompts` y `yaml`. Cualquier otra exige decisión de
  Fernando.
- Norma readfirst (skill `readfirst:code-style`) en todo el código: sin `else`, ternarios ni
  `switch`; guardas con `return` temprano; un nivel de bloques; funciones ≤ 20 líneas y ≤ 3
  parámetros; sin booleanos como parámetro; sin números ni textos mágicos; sin mutar; `export const`
  con arrow functions; genéricos con nombre (`<Value>`); errores **solo** con `attempt()` de
  `cli/src/core/attempt.ts` (plantilla `templates/attempt.ts` de readfirst). Lint: plantilla
  `templates/eslint.config.js` de readfirst sin las partes de React.
- Nombres de código en inglés. Textos para personas, comentarios, claves de `politica.yml` y
  catálogo en castellano.
- Git es de Fernando: cada paso «Commit» es un comando que ejecuta él; ningún agente hace add,
  commit ni push.
- Las tareas de CI que leen datos de la pull request y deciden (integridad, aprobación, informe,
  excepciones) corren con `pull_request_target` o eventos de base (`issue_comment`, `schedule`) y
  **nunca** hacen checkout ni ejecutan código de la rama de la pull request. Las que ejecutan
  código (pruebas, lint, herramientas) corren con `pull_request`.
- Sin IA en la fase 1: nada llama a un modelo.
- Modo aviso: si el plan de GitHub no permite hacer cumplir las reglas, todo lo que se muestra o
  se informa dice «modo aviso: no se bloquea». Nunca se afirma un bloqueo que no existe.
- Los informes cuentan hechos; ningún texto generado contiene «garantiza», «sin fallos» ni
  «100 %» (lo comprueba un test, Tarea 15).
- Una herramienta que falla o no se puede descargar deja la puerta en `no_verificado`, que cuenta
  como fallo: el flujo falla cerrado.

## Foco de revisión

1. **`politica.yml` editado a mano con un error** (clave mal escrita, tipo equivocado): mensaje en
   castellano que nombra la clave y el valor esperado, nunca una traza. → Tarea 2,
   `rejects a misspelled key naming it`.
2. **Un programador cambia el workflow o `.lead/` dentro de su pull request para saltarse las
   puertas**: la integridad lo detecta desde la versión de la rama base y exige a la lead. →
   Tarea 11, `flags workflow changes made in the pull request`.
3. **Repositorio existente con `AGENTS.md` o `CODEOWNERS` escritos a mano**: el generador para,
   enseña la diferencia y no escribe nada. → Tarea 8, `stops on a hand-written file without markers`.
4. **Permiso temporal en el límite de la fecha** («hasta 2026-11-14» revisado a las 23:30 de Madrid,
   que ya es día 14 en UTC por la tarde y día 15 en UTC a la 01:00): caduca al terminar ese día en
   la zona horaria de la política. → Tarea 12, `keeps a temporary permit valid until the end of its day`.
5. **La herramienta de una puerta no responde** (sin red, registro de Semgrep caído): la puerta
   queda en `no_verificado` y bloquea. → Tarea 11, `reports no_verificado when the tool fails`.

---

## Mapa de archivos

```
.claude-plugin/marketplace.json     ← apunta a ./plugin
plugin/                             ← el kit equipo-solo actual, movido sin cambios
cli/
  package.json · tsconfig.json · eslint.config.js · vitest.config.ts
  src/
    index.ts                        ← entrada: reparte subcomandos (tabla)
    core/attempt.ts · core/errors.ts · core/constants.ts
    policy/schema.ts                ← tipos y validación de politica.yml
    policy/store.ts                 ← leer y guardar
    decisions/records.ts            ← .lead/decisiones/NNNN-<tema>.md
    catalog/load.ts                 ← leer y ordenar catalogo/
    interview/questions.ts · interview/run.ts · interview/prompter.ts
    generate/blocks.ts              ← bloques delimitados y conflictos
    generate/outputs/*.ts           ← un archivo por salida
    gates/evidence.ts               ← formato JSON de evidencia
    gates/integrity.ts · gates/dependencies.ts · gates/tools.ts
    review/risk.ts · review/approval.ts
    exceptions/commands.ts · exceptions/apply.ts
    reports/build.ts · reports/chain.ts
    digest/build.ts
    protect/plan.ts · protect/rulesets.ts
    github/client.ts                ← única puerta a la API de GitHub
  test/…                            ← espejo de src/
catalogo/<tema>/<stack>.yml
acciones/puertas/action.yml         ← acción compuesta que ejecuta las puertas
plantillas/workflows/*.yml          ← lo que copia el generador
ejemplos/fastapi-nuevo/ · ejemplos/node-existente/
```

## Tipos compartidos (los fija la Tarea 2; el resto los usa tal cual)

```ts
export type RiskLevel = 'bajo' | 'medio' | 'alto'
export type Approver = 'automatica' | 'companero' | 'qa' | 'delegado' | 'lead'
export type ClientReportFrequency = 'siempre' | 'sprint' | 'peticion'
export type EnforcementMode = 'bloqueo' | 'aviso'
export type GateStatus = 'ok' | 'fallo' | 'no_verificado'

export type TemporaryPermit = { dependencia: string; ticket: number; caduca: string; aprobado_por: string }
export type Delegation = { tema: string; persona: string }

export type Policy = {
  version: 1
  proyecto: { nombre: string; tipo: 'nuevo' | 'existente'; zona_horaria: string }
  equipo: { lead: string; scrum_master: string; qa: string[]; delegados: Delegation[] }
  stack: { lenguajes: string[]; frameworks: string[]; comandos: { pruebas: string; lint: string; build: string } }
  seguridad: { autenticacion: string; requisitos: string[] }
  dependencias: { ecosistema: 'npm' | 'pip'; permitidas: string[]; prohibidas: string[]; licencias_permitidas: string[] }
  ramas: { principal: string; patron: string }
  riesgo: { alto: string[]; bajo: string[]; muestreo_1_de: number }
  aprobacion: Record<RiskLevel, Approver>
  permisos_temporales: TemporaryPermit[]
  informes: { cliente: ClientReportFrequency }
  parte: { hora_utc: string; espera_revision_horas: number; sin_movimiento_dias: number }
  github: { modo: EnforcementMode }
}

export type Review = { usuario: string; estado: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'; fecha: string }

export type GateEvidence = {
  puerta: string; estado: GateStatus; resumen: string
  herramienta: string; version: string; fecha: string; detalles: unknown[]
}
```

Los tipos que solo usa una tarea (`ApplyContext`, `ChainEntry`, `RepositoryInfo`, `Ruleset`,
`PullRequestSummary`…) los define quien implementa esa tarea, en su propio archivo.

Valores por defecto (`cli/src/core/constants.ts`): `ramas.patron = 'ticket/<numero>-<resumen>'`,
`riesgo.muestreo_1_de = 10`, `parte.hora_utc = '07:00'`, `parte.espera_revision_horas = 24`,
`parte.sin_movimiento_dias = 3`, `CATALOG_STALE_DAYS = 183`, `MANAGED_BLOCK_START = 'lead-flow:inicio'`,
`MANAGED_BLOCK_END = 'lead-flow:fin'`, `EVIDENCE_DIR = 'lead-flow-evidencias'`,
`REPORTS_BRANCH = 'informes'`, `DIGEST_LABEL = 'parte'`.

---

## Bloque A — Configurar un proyecto (Tareas 1-10)

### Tarea 1: Mover el plugin y preparar el paquete `cli/`

**Archivos:**
- Mover: `agents/`, `evals/`, `doc/FLUJO.md`, `AGENTS.template.md`, `CLAUDE.template.md`, `.claude-plugin/plugin.json` → bajo `plugin/` (misma estructura relativa).
- Modificar: `.claude-plugin/marketplace.json` (`"source": "./plugin"`), `README.es.md` (rutas).
- Crear: `cli/package.json`, `cli/tsconfig.json`, `cli/eslint.config.js`, `cli/vitest.config.ts`, `cli/src/core/attempt.ts`, `cli/src/core/errors.ts`, `cli/src/core/constants.ts`, `cli/test/core/attempt.test.ts`.

**Interfaces:**
- Produce: `attempt<Value>(promise: Promise<Value>): Promise<Outcome<Value>>`, `attemptSync<Value>(callback: () => Value): Outcome<Value>` (copiadas de la plantilla readfirst); `class LeadFlowError extends Error { code: string }` en `errors.ts`; las constantes listadas arriba.
- Scripts de `cli/package.json`: `build` (`tsc`), `test` (`vitest run`), `lint` (`eslint .`); `bin: { "lead-flow": "dist/index.js" }`.

- [ ] **Paso 1:** mover el plugin y actualizar `marketplace.json`.
- [ ] **Paso 2:** verificar: `claude plugin validate plugin` y `claude plugin validate .` → `✔ Validation passed` en los dos.
- [ ] **Paso 3:** test `attempt returns the error instead of throwing` y `attemptSync returns the value`; ejecutar `cd cli && npm test` → falla (no existe).
- [ ] **Paso 4:** crear el paquete y `attempt.ts`; `npm install`; `npm test && npm run lint && npm run build` → todo en verde.
- [ ] **Paso 5 (Fernando):** `git add .claude-plugin plugin cli README.es.md` · `git commit -m "chore: mueve el plugin a plugin/ y prepara el paquete cli"`

### Tarea 2: Esquema de la política

**Archivos:** Crear `cli/src/policy/schema.ts`, `cli/src/policy/store.ts`, `cli/test/policy/schema.test.ts`, `cli/test/policy/store.test.ts`, `cli/test/fixtures/politica-valida.yml`.

**Interfaces:**
- Produce: los tipos compartidos de arriba; `validatePolicy(raw: unknown): Policy` (lanza `LeadFlowError` con `code: 'POLITICA_INVALIDA'`); `loadPolicy(directory: string): Promise<Policy>`; `savePolicy(directory: string, policy: Policy): Promise<void>`; `POLICY_PATH = '.lead/politica.yml'`.

- [ ] **Paso 1:** tests:
  - `accepts the valid fixture`;
  - `rejects a misspelled key naming it` → con `aprovacion:` el mensaje contiene `"aprovacion"` y `"aprobacion"`;
  - `rejects an unknown approver listing the allowed ones` → mensaje contiene `automatica, companero, qa, delegado, lead`;
  - `round-trips through save and load` (directorio temporal) → el objeto leído es igual al guardado.
- [ ] **Paso 2:** `npm test -- policy` → FALLA.
- [ ] **Paso 3:** validación a mano con una tabla de claves esperadas por sección (sin librería de esquemas); `yaml` para leer y escribir; el error sugiere la clave más parecida por distancia de edición.
- [ ] **Paso 4:** `npm test -- policy` → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): esquema y lectura de la política del proyecto`.

### Tarea 3: Registro de decisiones

**Archivos:** Crear `cli/src/decisions/records.ts`, `cli/test/decisions/records.test.ts`.

**Interfaces:**
- Consume: `LeadFlowError`.
- Produce: `type Decision = { tema: string; contexto: string; opciones: string[]; decision: string; porque: string; autor: string; fecha: string }`; `writeDecision(directory: string, decision: Decision): Promise<string>` (devuelve la ruta creada); `listDecisions(directory: string): Promise<Decision[]>`.

- [ ] **Paso 1:** tests:
  - `numbers records consecutively` → la primera es `.lead/decisiones/0001-autenticacion.md`, la siguiente `0002-…`;
  - `never overwrites an existing record`;
  - `writes the sections contexto, opciones vistas, decision, porque, fecha and autor`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar; el tema pasa a kebab-case sin tildes para el nombre del archivo.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): registro de decisiones de la lead`.

### Tarea 4: Lectura del catálogo

**Archivos:** Crear `cli/src/catalog/load.ts`, `cli/test/catalog/load.test.ts`, `cli/test/fixtures/catalogo/autenticacion/python-fastapi.yml`.

**Interfaces:**
- Produce: `type CatalogOption = { id: string; nombre: string; implica: string; pros: string[]; contras: string[]; docs: string; revisado: string }`; `type CatalogEntry = { tema: string; stack: string; pregunta: string; opciones: CatalogOption[] }`; `loadCatalogEntry(root: string, tema: string, stack: string): Promise<CatalogEntry | null>`; `orderOptions(options: CatalogOption[]): CatalogOption[]`; `isStale(option: CatalogOption, today: string): boolean`.

- [ ] **Paso 1:** tests:
  - `orders options alphabetically by nombre, ignoring accents`;
  - `never marks an option as recommended` → ninguna opción resultante tiene un campo ni un texto que contenga «recomend»;
  - `flags an option revised more than 183 days ago`;
  - `returns null for a stack without catalog`;
  - `rejects an option without docs URL`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar con `localeCompare(…, 'es', { sensitivity: 'base' })`.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): lectura del catálogo sin recomendaciones`.

### Tarea 5: Contenido inicial del catálogo

**Archivos:** Crear `catalogo/autenticacion/python-fastapi.yml`, `catalogo/autenticacion/node-express.yml`, `catalogo/autenticacion/node-nestjs.yml`, `catalogo/herramientas/<stack>.yml` para `python-fastapi`, `node-express`, `node-nestjs`, `java-spring`, `php-laravel` y `dotnet` (comandos de pruebas, lint, build y auditoría de dependencias), y `cli/test/catalog/content.test.ts`.

**Interfaces:** consume `loadCatalogEntry`.

- [ ] **Paso 1:** test `every catalog file is valid` → recorre `catalogo/` y carga cada archivo sin error, con `docs` que empieza por `https://` y `revisado` igual a `2026-11-10` o posterior.
- [ ] **Paso 2:** ejecutar → FALLA (no hay archivos).
- [ ] **Paso 3:** escribir el contenido. Autenticación FastAPI, como mínimo: OAuth2 con tokens Bearer y PyJWT (`fastapi.security`), sesión opaca guardada en el servidor, y hashing con pwdlib (Argon2 o bcrypt) como requisito de las dos. Node, el equivalente (sesión en servidor y JWT). **Cada enlace es a documentación oficial y se abre para comprobarlo antes de escribirlo**; pros y contras en lenguaje llano, sin adjetivos de venta.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(catalogo): opciones iniciales de autenticación y herramientas`.

### Tarea 6: Entrevista `lead-flow init`

**Archivos:** Crear `cli/src/interview/prompter.ts`, `cli/src/interview/questions.ts`, `cli/src/interview/run.ts`, `cli/src/index.ts`, `cli/test/interview/run.test.ts`.

**Interfaces:**
- Consume: `loadCatalogEntry`, `orderOptions`, `isStale`, `validatePolicy`, `savePolicy`, `writeDecision`.
- Produce: `type Prompter = { select: (question: SelectQuestion) => Promise<string>; input: (question: InputQuestion) => Promise<string> }` (implementación real con `@inquirer/prompts`; en tests, un falso con respuestas en cola); `runInterview(context: InterviewContext): Promise<Policy>`, con `InterviewContext = { directory: string; catalogRoot: string; prompter: Prompter; today: string }`; `QUESTIONS`: tabla ordenada de temas (proyecto, equipo, stack, comandos, autenticación, dependencias, ramas, riesgo, aprobación por nivel, informes, parte).

- [ ] **Paso 1:** tests:
  - `writes a valid policy from scripted answers`;
  - `records one decision per answered topic`;
  - `always offers a free-text "otra" option last`;
  - `shows a stale warning next to old options`;
  - `asks who approves each risk level offering only automatica, companero, qa, delegado, lead`;
  - `detects tipo existente when the directory already has a package.json or pyproject.toml`;
  - `seeds permitidas with the direct dependencies the project already has`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar; `index.ts` reparte subcomandos con una tabla `{ init, cambiar, generar, proteger, puerta }` y un comando desconocido imprime la ayuda en castellano. Al terminar, `init` llama a `generateAll` (Tarea 9) si existe; en esta tarea, solo guarda la política.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): entrevista de configuración que informa sin recomendar`.

### Tarea 7: `lead-flow cambiar <tema>`

**Archivos:** Modificar `cli/src/interview/run.ts`; Crear `cli/test/interview/change.test.ts`.

**Interfaces:** Produce `changeTopic(context: InterviewContext, tema: string): Promise<Policy>`.

- [ ] **Paso 1:** tests:
  - `changes only the chosen topic`;
  - `records a new decision without touching earlier ones`;
  - `rejects an unknown topic listing the valid ones`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar reutilizando `QUESTIONS`. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): cambiar una parte de la política`.

### Tarea 8: Bloques delimitados y conflictos

**Archivos:** Crear `cli/src/generate/blocks.ts`, `cli/test/generate/blocks.test.ts`.

**Interfaces:**
- Produce: `type CommentStyle = 'markdown' | 'hash'`; `type WriteOutcome = { estado: 'creado' | 'actualizado' | 'sin_cambios' | 'conflicto'; diferencia: string }`; `planWrite(current: string | null, generated: string, style: CommentStyle): WriteOutcome & { contenido: string }`.
- Marcadores: Markdown `<!-- lead-flow:inicio -->` … `<!-- lead-flow:fin -->`; `hash` `# lead-flow:inicio` … `# lead-flow:fin`. El bloque empieza con la línea «Generado desde .lead/politica.yml — no editar dentro de este bloque».

- [ ] **Paso 1:** tests:
  - `creates the file when it does not exist`;
  - `replaces only the managed block and keeps hand-written text around it`;
  - `stops on a hand-written file without markers` → estado `conflicto`, `diferencia` no vacía, `contenido` igual al actual;
  - `reports sin_cambios when nothing changed`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar; la diferencia, línea a línea con `+` y `-`. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): bloques generados que nunca pisan lo escrito a mano`.

### Tarea 9: Salidas para personas y agentes

**Archivos:** Crear `cli/src/generate/outputs/agents-md.ts`, `claude-md.ts`, `copilot.ts`, `cursor.ts`, `codeowners.ts`, `templates.ts`, `cli/src/generate/all.ts`, `cli/test/generate/outputs.test.ts`.

**Interfaces:**
- Consume: `Policy`, `planWrite`.
- Produce: cada salida `render<Nombre>(policy: Policy): { path: string; style: CommentStyle; content: string }`; `generateAll(directory: string, policy: Policy): Promise<WriteOutcome[]>` (si alguna sale en `conflicto`, no escribe ninguna y devuelve todas).
- Rutas: `AGENTS.md`, `CLAUDE.md` (empieza por `@AGENTS.md`), `.github/copilot-instructions.md`, `.cursor/rules/lead-flow.mdc`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/excepcion.yml`, `.github/ISSUE_TEMPLATE/fallo-produccion.yml`, `.github/pull_request_template.md` (campos «Agente y modelo usados» y «Ticket»).

- [ ] **Paso 1:** tests:
  - `AGENTS.md lists the test commands exactly as in the policy`;
  - `CODEOWNERS assigns .lead/ and .github/workflows/ to the lead and the scrum master`;
  - `the exception template asks qué, ticket, porqué, alternativas descartadas and bloquea`;
  - `writes nothing when any output is in conflict`;
  - `CLAUDE.md starts with @AGENTS.md`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar; los textos de `AGENTS.md` siguen `plugin/AGENTS.template.md`. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): genera AGENTS.md, adaptadores de agentes, CODEOWNERS y plantillas`.

### Tarea 10: Workflows de GitHub Actions

**Archivos:** Crear `plantillas/workflows/lead-flow-puertas.yml`, `lead-flow-decision.yml`, `lead-flow-informe.yml`, `lead-flow-excepciones.yml`, `lead-flow-parte.yml`; `acciones/puertas/action.yml`; `cli/src/generate/outputs/workflows.ts`; `cli/test/generate/workflows.test.ts`.

**Interfaces:**
- Produce: `renderWorkflows(policy: Policy): Array<{ path: string; content: string }>`.
- Reparto de eventos (restricción global):
  - `lead-flow-puertas.yml`: `pull_request`. Jobs `pruebas`, `secretos`, `sast` y `dependencias` usan `fernando-delrio/agents/acciones/puertas@v0` con `puerta: <nombre>`, y cada uno sube `lead-flow-evidencias/<puerta>.json` como artefacto.
  - `lead-flow-decision.yml`: `pull_request_target`, `pull_request_review` y `workflow_run` de puertas. Jobs `integridad` y `aprobacion`; checkout de la **rama base**; nunca de la cabeza.
  - `lead-flow-informe.yml`: `pull_request_target` con `types: [closed]` si está integrada.
  - `lead-flow-excepciones.yml`: `issue_comment`.
  - `lead-flow-parte.yml`: `schedule` con el cron calculado desde `parte.hora_utc` de lunes a viernes, y `workflow_dispatch`.
- `permissions` mínimos por job; ninguno con `write-all`.

- [ ] **Paso 1:** tests:
  - `jobs that run pull request code use pull_request`;
  - `decision jobs never check out the pull request head` → en `lead-flow-decision.yml` no aparece `github.event.pull_request.head`;
  - `cron matches parte.hora_utc on weekdays` → `07:00` da `'0 7 * * 1-5'`;
  - `every job declares explicit permissions`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar; `generateAll` incluye los workflows. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(cli): workflows de puertas, decisión, informe, excepciones y parte`.

---

## Bloque B — Lo que pasa en cada pull request (Tareas 11-17)

### Tarea 11: Evidencia, integridad y herramientas

**Archivos:** Crear `cli/src/gates/evidence.ts`, `cli/src/gates/integrity.ts`, `cli/src/gates/tools.ts`, `cli/src/github/client.ts`, `cli/test/gates/integrity.test.ts`, `cli/test/gates/tools.test.ts`.

**Interfaces:**
- Produce:
  - `writeEvidence(directory: string, evidence: GateEvidence): Promise<void>` y `readEvidence(directory: string): Promise<GateEvidence[]>`;
  - `checkIntegrity(input: IntegrityInput): GateEvidence`, con `IntegrityInput = { policy: Policy; changedFiles: string[]; generatedOnBase: Array<{ path: string; content: string }>; filesOnHead: Record<string, string>; approvals: Review[]; author: string }`;
  - `runTool(spec: ToolSpec): Promise<GateEvidence>`, con `ToolSpec = { puerta: string; command: string; args: string[]; parse: (stdout: string) => { ok: boolean; detalles: unknown[] } }`;
  - `type GitHubClient` con `listChangedFiles`, `listReviews`, `getFile`, `createOrUpdateIssue`, `addLabel`, `enableAutoMerge`, `commitFile`, `getRepositoryInfo`, `createPullRequest` (envoltorio de `fetch` a la API REST con el token del entorno).
- Puertas: `secretos` → `gitleaks detect --report-format json`; `sast` → `semgrep scan --config p/<stack> --json`; `pruebas` → los comandos de la política; dentro de `dependencias`, la auditoría de vulnerabilidades → `npm audit --json --audit-level=high` o `pip-audit -f json` (la usa la Tarea 12).

- [ ] **Paso 1:** tests:
  - `fails when generated files differ from the policy`;
  - `flags workflow changes made in the pull request` → un cambio en `.github/workflows/lead-flow-puertas.yml` sin aprobación de la lead da `fallo` con resumen que nombra el archivo;
  - `accepts .lead changes approved by the scrum master when the lead is the author`;
  - `reports no_verificado when the tool fails` → `runTool` con un comando inexistente devuelve `no_verificado`;
  - `evidence round-trips through write and read`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar; `client.ts` es el único archivo que llama a la API de GitHub. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(puertas): evidencia, integridad del flujo y herramientas deterministas`.

### Tarea 12: Puerta de dependencias y permisos temporales

**Archivos:** Crear `cli/src/gates/dependencies.ts`, `cli/test/gates/dependencies.test.ts`, `cli/test/fixtures/deps/` (un `package.json` y un `requirements.txt` base y cabeza).

**Interfaces:**
- Produce: `findNewDirectDependencies(base: string, head: string, ecosistema: 'npm' | 'pip'): string[]`; `checkDependencies(input: DependencyInput): GateEvidence`, con `DependencyInput = { policy: Policy; newDependencies: string[]; licenses: Record<string, string>; audit: GateEvidence; now: string }` (las licencias las obtiene el workflow con `npx license-checker-rseidelsohn --json` o `pip-licenses --format=json`); `isPermitValid(permit: TemporaryPermit, now: string, zonaHoraria: string): boolean`.

- [ ] **Paso 1:** tests:
  - `blocks a new direct dependency that is not allowed` → resumen con el nombre y el texto «pide una excepción»;
  - `blocks a forbidden dependency even if allowed by a permit`;
  - `ignores transitive dependencies`;
  - `accepts a dependency covered by a valid temporary permit`;
  - `keeps a temporary permit valid until the end of its day` → `caduca: '2026-11-14'`, zona `Europe/Madrid`: válido a `2026-11-14T22:30:00Z` y caducado a `2026-11-14T23:00:00Z`;
  - `existing dependencies seeded at init never block`;
  - `blocks a new dependency whose license is not in licencias_permitidas`;
  - `fails when the vulnerability audit fails or is no_verificado`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar; zona horaria con `Intl.DateTimeFormat`, sin librerías. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(puertas): dependencias nuevas con excepción y permisos temporales`.

### Tarea 13: Nivel de riesgo y aprobación

**Archivos:** Crear `cli/src/review/risk.ts`, `cli/src/review/approval.ts`, `cli/test/review/risk.test.ts`, `cli/test/review/approval.test.ts`.

**Interfaces:**
- Produce: `classifyRisk(changedFiles: string[], riesgo: Policy['riesgo']): RiskLevel`; `evaluateApproval(input: ApprovalInput): ApprovalResult`, con `ApprovalInput = { policy: Policy; level: RiskLevel; author: string; reviews: Review[]; gates: GateEvidence[] }` y `ApprovalResult = { estado: GateStatus; aprobadoPor: string; tipo: 'automatica' | 'persona'; motivo: string }` (`Review` viene de los tipos compartidos).

- [ ] **Paso 1:** tests:
  - `alto wins over bajo when any file matches alto`;
  - `bajo only when every file matches bajo`;
  - `medio otherwise`;
  - `bajo with automatica approves only when every gate is ok`;
  - `a no_verificado gate blocks automatic approval`;
  - `medio requires an approval from someone who is not the author`;
  - `alto requires qa or the topic delegate`;
  - `changes requested after an approval cancel it`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar; los patrones con `path.matchesGlob` de Node ≥ 22. Si la versión es menor, con una función propia de `*` y `**` probada en el mismo test. El job `aprobacion` publica el estado `lead-flow/aprobacion`, pone la etiqueta `riesgo-<nivel>` y, si es `bajo` con `automatica`, activa la integración automática con `enableAutoMerge`.
- [ ] **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(revision): nivel de riesgo y aprobación según el nivel`.

### Tarea 14: Excepciones por comentario

**Archivos:** Crear `cli/src/exceptions/commands.ts`, `cli/src/exceptions/apply.ts`, `cli/test/exceptions/commands.test.ts`, `cli/test/exceptions/apply.test.ts`.

**Interfaces:**
- Consume: `GitHubClient`, `writeDecision`, `savePolicy`.
- Consume también: `Review` (tipos compartidos).
- Produce: `parseCommand(body: string): ExceptionCommand | null`, con `ExceptionCommand = { accion: 'aprobar' | 'rechazar'; hasta: string | null; motivo: string }`; `canDecide(user: string, policy: Policy, tema: string): boolean`; `applyDecision(context: ApplyContext): Promise<ApplyResult>`.

- [ ] **Paso 1:** tests:
  - `parses /aprobar with motivo`;
  - `parses /aprobar hasta 2026-11-14 as a temporary permit`;
  - `parses /rechazar with motivo`;
  - `requires a motivo`;
  - `ignores comments from people who cannot decide` → responde en la incidencia «solo la lead o el delegado de este tema pueden decidir»;
  - `approval opens a pull request that adds the dependency and a decision record, labelled excepcion-aprobada`;
  - `rejection records a decision and closes the issue`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar. La aprobación de la Tarea 13 da por aprobada por la lead una pull request con la etiqueta `excepcion-aprobada` solo si en la incidencia enlazada hay un `/aprobar` de quien podía decidir. Añadir ese test a `approval.test.ts`: `treats an approved exception pull request as approved by the lead`. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(excepciones): pedir, aprobar o rechazar por comentario`.

### Tarea 15: Informe interno por ticket

**Archivos:** Crear `cli/src/reports/build.ts`, `cli/src/reports/chain.ts`, `cli/test/reports/build.test.ts`, `cli/test/reports/chain.test.ts`.

**Interfaces:**
- Produce: `buildReport(input: ReportInput): string` (Markdown), con `ReportInput = { pullRequest: { numero: number; titulo: string; autor: string; cuerpo: string; commit: string; integradaEn: string }; level: RiskLevel; approval: ApprovalResult; gates: GateEvidence[]; reviews: Review[]; exceptions: Array<{ numero: number; decision: string }>; policyHash: string; previousHash: string; modo: EnforcementMode }`; `hashReport(content: string): string` (SHA-256); `appendToChain(chain: ChainEntry[], entry: ChainEntry): ChainEntry[]`; `verifyChain(chain: ChainEntry[], reports: Record<string, string>): { valida: boolean; rotaEn: string | null }`.
- Destino: rama `informes`, archivo `informes/AAAA/MM/PR-<numero>.md` y `informes/cadena.json`.

- [ ] **Paso 1:** tests:
  - `lists every gate with its status and tool version`;
  - `states the declared agent and model as declared, not verified` → contiene «declarado por el autor»;
  - `includes the previous hash`;
  - `verifyChain detects an edited report` → `valida: false` y `rotaEn` con la ruta;
  - `says modo aviso when enforcement is aviso`;
  - `never promises` → el informe no contiene «garantiza», «sin fallos» ni «100 %».
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar con `node:crypto`. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(informes): informe interno por ticket encadenado`.

### Tarea 16: Parte diario

**Archivos:** Crear `cli/src/digest/build.ts`, `cli/test/digest/build.test.ts`.

**Interfaces:**
- Produce: `buildDigest(input: DigestInput): string`, con `DigestInput = { policy: Policy; now: string; mergedAutomatically: PullRequestSummary[]; vetoed: PullRequestSummary[]; pendingExceptions: ExceptionSummary[]; expiredPermits: TemporaryPermit[]; waitingReview: PullRequestSummary[] }`. El workflow crea o actualiza la incidencia con la etiqueta `parte` y comenta «caducado» en la incidencia de cada permiso vencido (registro del vencimiento).

- [ ] **Paso 1:** tests:
  - `lists what was merged without a person yesterday`;
  - `puts urgent exceptions first`;
  - `lists pull requests waiting longer than espera_revision_horas`;
  - `lists expired temporary permits`;
  - `says there are no blockers when every list is empty`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(parte): parte diario para la stand-up`.

### Tarea 17: `lead-flow proteger` y modo aviso

**Archivos:** Crear `cli/src/protect/plan.ts`, `cli/src/protect/rulesets.ts`, `cli/test/protect/plan.test.ts`, `cli/test/protect/rulesets.test.ts`.

**Interfaces:**
- Produce: `detectEnforcement(info: RepositoryInfo): EnforcementMode` (privado en GitHub Free → `aviso`; público, Team o Enterprise → `bloqueo`); `buildRulesets(policy: Policy): Ruleset[]`; `protect(client: GitHubClient, policy: Policy): Promise<ProtectResult>`. Sin permisos de administración, imprime los pasos exactos y no aplica nada.
- Rulesets: en la rama principal, solo por pull request, comprobaciones obligatorias `pruebas`, `secretos`, `sast`, `dependencias`, `integridad` y `lead-flow/aprobacion`, sin force push ni borrado. En la rama `informes`, solo la escribe GitHub Actions.

- [ ] **Paso 1:** tests:
  - `private repository on the free plan means aviso`;
  - `public repository means bloqueo`;
  - `required checks match the generated jobs`;
  - `without admin rights it prints steps and applies nothing`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** implementar. **Comprobar en la documentación de GitHub** el formato actual de la API de rulesets y la regla de autor de una aprobación; si algo difiere de este plan, parar y avisar. **Paso 4:** ejecutar → PASA.
- [ ] **Paso 5 (Fernando):** commit `feat(proteger): rulesets y modo aviso según el plan de GitHub`.

---

## Bloque C — Prueba de extremo a extremo (Tarea 18)

### Tarea 18: Ejemplos y verificación en GitHub

**Archivos:** Crear `ejemplos/fastapi-nuevo/` (vacío salvo `pyproject.toml` mínimo), `ejemplos/node-existente/` (proyecto Express pequeño con su `AGENTS.md` escrito a mano), `cli/test/e2e/examples.test.ts`, `doc/fase-1-uso.md`.

- [ ] **Paso 1:** tests e2e locales:
  - `init on the new example writes policy, decisions and every output`;
  - `generar on the existing example stops on its hand-written AGENTS.md and writes nothing`;
  - `after adding markers, generar keeps the hand-written text`.
- [ ] **Paso 2:** ejecutar → FALLA. **Paso 3:** completar lo que falte. **Paso 4:** `cd cli && npm test && npm run lint && npm run build` → todo en verde.
- [ ] **Paso 5 (Fernando, en un repositorio de pruebas suyo en GitHub):** checklist manual, con el resultado anotado en `doc/fase-1-uso.md`:
  1. `lead-flow init` + `lead-flow proteger`;
  2. una pull request con un secreto → `secretos` en rojo, no se puede integrar;
  3. una pull request con una librería nueva → `dependencias` en rojo; abrir la excepción; `/aprobar hasta <fecha>` → se abre la pull request de política; al integrarla, la primera pasa;
  4. una pull request que solo toca documentación → nivel `bajo`, se integra sola, sale en el parte del día siguiente y su informe aparece en la rama `informes`;
  5. una pull request que modifica `.github/workflows/lead-flow-puertas.yml` → `integridad` en rojo;
  6. `verifyChain` sobre la rama `informes` → válida.
- [ ] **Paso 6 (Fernando):** commit `test(e2e): ejemplos y verificación de la fase 1 en GitHub`.

---

## Cierre de la fase 1

- Revisión de toda la rama con `readfirst:conventions-reviewer` y con la puerta de seguridad del
  kit (`equipo-solo:puerta-seguridad`) sobre el uso de `pull_request_target` y los permisos de los
  workflows.
- Pendiente para la fase 2 (según el diseño): muestreo de calidad, parte completo, métricas,
  resumen para el cliente, puerta 6 con agentes y atestaciones firmadas.
- Publicar el paquete en npm y etiquetar `v0` de la acción son decisiones y acciones de Fernando.
