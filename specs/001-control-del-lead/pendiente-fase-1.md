# Lo que falta para terminar la fase 1 de lead-flow

Estado a 2026-11-11. Lista completa para seguir desde cualquier ordenador. Se marca cada casilla
al terminarla y se hace commit con el mensaje que da el plan.

**La fase 1 está terminada cuando** (diseño §7): un repositorio nuevo y uno existente se configuran
con `init`; una pull request con un secreto o una librería no permitida queda bloqueada; una limpia
de bajo riesgo se integra sola, sale en el parte y genera su informe.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Diseño aprobado (la autoridad) | `specs/001-control-del-lead/diseno.md` |
| Plan con las 18 tareas (detalle de cada una) | `specs/001-control-del-lead/plan-fase-1.md` |
| Registro: decisiones tomadas (Rulings 1-21) y fallos menores aplazados | `specs/001-control-del-lead/registro-fase-1.md` |
| Herramientas de la rutina de cada tarea | `specs/001-control-del-lead/sdd/` |
| Cifras que se pueden citar | `doc/investigacion.md` |

## 0. Antes de salir de la oficina

- [ ] Guardar en Git la Tarea 8 (hecha y con 88 pruebas en verde, pero **sin revisar**) y esta lista:

```bash
cd /c/Users/Usuario/kit-agentes-fullstack
git checkout fase-1
git add cli/src/generate cli/test/generate specs/001-control-del-lead
git commit -m "feat(cli): bloques generados que nunca pisan lo escrito a mano (pendiente de revisión)"
git push
```

## 1. En casa: preparar el ordenador (una vez)

- [ ] Node 20 o superior (`node -v`), Git Bash y Claude Code.
- [ ] Los plugins que usa la rutina: `superpowers` y `readfirst` (`claude plugin list`). Si falta
  alguno, se instala desde su marketplace, igual que en la oficina.
- [ ] Bajar el repositorio y comprobar que todo arranca:

```bash
git clone https://github.com/fernando-delrio/lead-flow.git   # o, si ya lo tienes: git pull
cd lead-flow
git checkout fase-1
cd cli && npm ci && npm test && npm run lint && npm run build
```

  Resultado esperado: `Tests 88 passed`, lint sin errores y build sin errores.

- [ ] Abrir Claude Code en la carpeta del repositorio y decirle:
  «Lee `specs/001-control-del-lead/pendiente-fase-1.md` y `registro-fase-1.md` y sigue desde la
  primera casilla sin marcar, con subagent-driven-development.»

## 2. La rutina de cada tarea (la sigue Claude; tú solo haces el commit)

1. Foto previa: `bash specs/001-control-del-lead/sdd/snap.sh N`.
2. Encargo: `bash specs/001-control-del-lead/sdd/brief.sh N` (saca la tarea del plan).
3. Un subagente implementa con la prueba primero, con el modelo que dice la tabla de abajo.
4. Paquete de revisión: `bash specs/001-control-del-lead/sdd/pkg.sh N N cli` (más rutas si la
   tarea toca otras carpetas).
5. Otro subagente revisa con `specs/001-control-del-lead/sdd/instrucciones-revisor.md`.
6. Si la revisión pide arreglos: ronda de arreglos y revisión otra vez (máximo 5 rondas).
7. Claude anota en `registro-fase-1.md` el resultado y cualquier decisión nueva («Ruling N»).
8. **Tú:** commit con el mensaje del plan (`Paso 5 (Fernando)` de cada tarea) y push.

Lo que generan los pasos 1, 2 y 4 va a `.superpowers/`, que Git ignora: es borrador, no se sube.

## 3. Las tareas que faltan

| ✔ | Tarea | Qué hace, en una frase | Modelo | Decisiones que la afectan |
|---|---|---|---|---|
| [ ] | **8 · revisión** | El código ya está; falta revisarlo. Como ya está en Git, el paquete de revisión es `git show <commit de la Tarea 8> -- cli`. | sonnet | — |
| [ ] | **9** | Genera `AGENTS.md`, `CLAUDE.md`, las reglas para Copilot y Cursor, `CODEOWNERS` y las plantillas de incidencias y pull requests. | sonnet | Ruling 2: `init` llama a `generateAll` al terminar la entrevista |
| [ ] | **10** | Los cinco workflows de GitHub Actions y la acción compuesta de las puertas. | **opus** (usa `pull_request_target`: error caro) | Ver huecos A y B |
| [ ] | **11** | Evidencia de cada puerta, puerta de integridad (nadie toca el flujo sin la lead) y ejecución de gitleaks, Semgrep y las pruebas. Crea el cliente de la API de GitHub. | **opus** | Ruling 4: cada tarea añade al cliente los métodos que necesite |
| [ ] | **12** | Puerta de dependencias nuevas, licencias, auditoría de vulnerabilidades y permisos temporales con fecha. | **opus** | Ruling 3 (reutiliza `dependencies/read.ts`) y Ruling 9 (validar `zona_horaria` con `Intl`) |
| [ ] | **13** | Nivel de riesgo (bajo, medio, alto) y quién tiene que aprobar en cada nivel. | **opus** | Ruling 6: glob con función propia |
| [ ] | **14** | Excepciones con `/aprobar`, `/aprobar hasta <fecha>` y `/rechazar` en la incidencia. | **opus** | — |
| [ ] | **15** | Informe interno por ticket, encadenado con huellas para detectar si alguien lo edita. | **opus** | Ruling 5: `policyHash` = SHA-256 de `politica.yml` |
| [ ] | **16** | Parte diario para la stand-up: lo integrado sin persona, lo bloqueado, lo que espera revisión y los permisos caducados. | sonnet | — |
| [ ] | **17** | `lead-flow proteger`: aplica las reglas de rama en GitHub, o el modo aviso si el plan de GitHub no lo permite. | **opus** | Comprobar antes la API actual de rulesets en la documentación de GitHub |
| [ ] | **18 · código** | Dos proyectos de ejemplo y pruebas de extremo a extremo en local. | sonnet | — |
| [ ] | **18 · tu prueba en GitHub** | Las seis comprobaciones del plan en un repositorio de pruebas tuyo (lista abajo). | tú, 30-45 min | Ver hueco C |
| [ ] | **Revisión final** | Revisión de toda la rama, de convenciones y de seguridad de los workflows; repaso de los fallos menores aplazados del registro. | opus o fable | — |

### Tu prueba en GitHub (Tarea 18, paso 5)

Apunta el resultado de cada una en `doc/fase-1-uso.md`.

- [ ] Crear un repositorio de pruebas **público**. En uno privado con GitHub Free, lead-flow
  funciona en modo aviso y nada se bloquea, así que las pruebas 2, 3 y 5 no se podrían comprobar.
- [ ] 1. `lead-flow init` y luego `lead-flow proteger`.
- [ ] 2. Pull request con un secreto falso → `secretos` en rojo y no se puede integrar.
- [ ] 3. Pull request con una librería nueva → `dependencias` en rojo; abrir la excepción;
  `/aprobar hasta <fecha>` → se abre la pull request de política; al integrarla, la primera pasa.
- [ ] 4. Pull request que solo toca documentación → nivel bajo, se integra sola, sale en el parte
  del día siguiente y su informe aparece en la rama `informes`.
- [ ] 5. Pull request que cambia `.github/workflows/lead-flow-puertas.yml` → `integridad` en rojo.
- [ ] 6. `verifyChain` sobre la rama `informes` → válida.

## 4. Huecos del plan que hay que decidir por el camino

Encontrados al preparar esta lista. Claude los decide en su tarea y los anota como Ruling.

- **A. Subcomandos sin tarea que los conecte.** La Tarea 6 dejó la tabla con `init` y `cambiar`.
  Ninguna tarea dice quién añade `generar`, `puerta <nombre>` y lo que ejecutan los jobs de
  decisión, informe, excepciones y parte. Propuesta: cada tarea que crea la lógica añade su
  subcomando (`generar` en la 9, `puerta` en la 11, `proteger` en la 17, etc.).
- **B. Cómo llega el CLI a la CI.** La acción `acciones/puertas@v0` tiene que ejecutar
  `lead-flow`, y el plan no dice si lo construye desde este repositorio o lo baja de npm.
  Propuesta: la acción lo construye desde el propio repositorio (`npm ci && npm run build` en
  `cli/`), así no hace falta publicar en npm para la fase 1. Se decide en la Tarea 10.
- **C. La etiqueta `v0`.** Los workflows usan `fernando-delrio/lead-flow/acciones/puertas@v0`. Sin esa
  etiqueta en GitHub, la prueba de la Tarea 18 falla. Crearla es Git, así que es tuya, después
  de la Tarea 17:

```bash
git tag v0 && git push origin v0
```

## 5. Al terminar la fase 1 (decisiones tuyas)

- [ ] Revisar los Rulings 1-21 del registro, y los que salgan después. Cualquiera se puede cambiar.
- [ ] Pull request de `fase-1` a `main` en github.com, para que la portada muestre el README.
- [ ] Decidir si se publica el CLI en npm (y con qué nombre). No hace falta para usarlo en la fase 1.
- [ ] Confirmar con Tools Equip la propiedad intelectual antes de enseñarlo fuera (diseño §8).
- [ ] Actualizar en el README la sección «Qué existe hoy»: la fase 1 deja de estar «en construcción».

## 6. Después de la fase 1 (no es para ahora; cada fase tendrá su plan)

- **Fase 2 · Visibilidad:** parte completo de bloqueos, métricas, muestreo de calidad, resumen para
  el cliente, puerta 6 con agentes, atestaciones firmadas, revisión cruzada con dos modelos de IA
  (opcional) y los siete agentes del kit adaptados al trabajo en equipo.
- **Fase 3 · Presentación** (el listón «muy pulido» antes de enseñarlo a consultoras): vídeo, guía de
  adopción, repositorio de ejemplo público y la prueba de que alguien de fuera lo instala en 15
  minutos. El README y la investigación ya están hechos.
- **Fase 4 · GitLab:** las mismas piezas sobre GitLab.
