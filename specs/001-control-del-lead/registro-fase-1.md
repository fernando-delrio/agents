# SDD ledger — plan: specs/001-control-del-lead/plan-fase-1.md

Spec: specs/001-control-del-lead/diseno.md (aprobado 2026-11-10).
Herramientas propias: brief.sh N (extrae la tarea), snap.sh N (foto previa), pkg.sh N (paquete de revisión por diferencias). Sin commits: Git es de Fernando.

## Revisión previa del plan

| Tareas | Producen / consumen | Hallazgo |
|---|---|---|
| 1 ↔ 9 | 1 mueve AGENTS.template.md a plugin/; 9 lo usa | Coherente: 9 cita plugin/AGENTS.template.md |
| 1 ↔ README | 1 cambia rutas de README.es.md; README lo reescribe | Orden: README después de 1 |
| 2 ↔ todas | tipos compartidos (Policy, Review, GateEvidence) | Coherente tras corregir Review |
| 4 ↔ 5 ↔ 6 | CatalogEntry, loadCatalogEntry | Coherente |
| 6 ↔ 9 | init debe llamar a generateAll; 6 «solo guarda», ninguna tarea lo conecta | Hueco → Ruling 2 |
| 6 ↔ 12 | 6 siembra dependencias existentes; 12 parsea dependencias | Duplicaría el parseo → Ruling 3 |
| 7 ↔ 6 | run.ts compartido | Coherente |
| 8 ↔ 9 ↔ 18 | planWrite / WriteOutcome | Coherente |
| 10 ↔ 11-17 | workflows invocan `lead-flow puerta …` y jobs de decisión antes de existir | Aceptable: 10 solo prueba propiedades del YAML |
| 11 ↔ 13-17 | GitHubClient: faltan métodos (estado de commit, comentar/cerrar incidencia, rulesets) | Hueco → Ruling 4 |
| 13 ↔ 14 | 14 añade un test a approval.test.ts | Coherente |
| 15 | policyHash sin origen definido | Hueco → Ruling 5 |
| 13 | glob con path.matchesGlob (Node ≥ 22) o función propia | Restricción Node ≥ 20 → Ruling 6 |
| Cada tarea | tests ↔ código ↔ archivos | Sin contradicciones internas encontradas |

## Rulings

- Ruling 1: sin commits de agentes; cada tarea se revisa con foto previa y diferencias (snap/pkg); el trabajo queda sin commitear en `main` y Fernando crea rama y hace commit — Git es solo de Fernando (su norma y el hook lo bloquean) — si es erróneo: Fernando tendría que separar el trabajo en commits a mano, guiado por los comandos de cada tarea.
- Ruling 2: la Tarea 9 conecta `init` con `generateAll` al terminar la entrevista — el diseño (§5.2) dice que init ejecuta el generador — si es erróneo: se mueve una línea.
- Ruling 3: la Tarea 6 crea `cli/src/dependencies/read.ts` con `readDirectDependencies(content: string, ecosistema: 'npm' | 'pip'): string[]`; la Tarea 12 lo reutiliza para base y cabeza — evita duplicar el parseo — si es erróneo: un archivo de más.
- Ruling 4: cada tarea añade a `cli/src/github/client.ts` los métodos de API que necesita (sigue siendo el único archivo que llama a GitHub) — el plan no los listaba todos — si es erróneo: ninguno, el archivo crece por tareas.
- Ruling 5: `policyHash` = SHA-256 del contenido de `.lead/politica.yml` en el commit integrado; lo calcula quien llama a buildReport — el informe debe poder ligarse a la política vigente — si es erróneo: cambia una función.
- Ruling 6: glob con función propia (`*`, `**`) siempre, sin `path.matchesGlob` — cumple Node ≥ 20 sin dos caminos — si es erróneo: una función pequeña de más.
- Ruling 7: tarea extra «README con la historia», tras la Tarea 1, en paralelo con las tareas de `cli/` (archivos disjuntos: README.es.md, assets/, doc/investigacion.md); verificación de cifras en fuentes originales en paralelo desde ya — Fernando lo pidió «lo antes posible» y el diseño §9.2 exige cifras verificadas — si es erróneo: los paquetes de revisión de esas tareas se filtran por ruta.

## Progreso
- Task 1: dispatched (sonnet), foto snap-1. Investigación de cifras: dispatched (sonnet, en paralelo).
- Investigación de cifras: completa → doc/investigacion.md (7/9 verificadas + DORA 2025; CSA 62 % y JetBrains: no usar).
- Task 1: implementada (DONE_WITH_CONCERNS: selector eslint para métodos de clase; npm audit en devDeps). En revisión (sonnet).
- Task 1: complete (foto snap-1, review clean). Minors diferidos:
  - Task 1: minor (deferred): selector eslint `FunctionExpression:not(MethodDefinition > FunctionExpression)` es desviación de la plantilla readfirst (correcta); avisar a Fernando por si la sube a la norma.
  - Task 1: minor (deferred): max-lines-per-function desactivado en test/**/*.test.ts sin declararlo.
  - Task 1: minor (deferred): tsconfig include ["src"] deja test/ sin comprobar tipos.
  - Task 1: minor (deferred): LeadFlowError.code no es readonly.
  - Task 1: minor (deferred): LICENSE/NOTICE fuera de plugin/ (el plugin instalado no los lleva).
- Ruling 8: CSA 62 % no se usa en ningún texto; las leyendas de la historia que lo mezclaban («entre el 25 % y el 60 %») se sustituyen por cifras de doc/investigacion.md — la verificación mostró atribución errónea — si es erróneo: ninguno, se usa solo lo verificado.
- Task 2: dispatched (sonnet), foto snap-2. README: dispatched (opus), en paralelo; su revisión filtrará por README.es.md y assets/.
- 11:37: Task 2 y README cortados por el límite de uso de 5 h (vuelve a las 14:00). No escribieron nada. Reanudación programada a las 14:04 (sesión).
- 11:40: el uso volvió antes de lo anunciado; Task 2 y README reanudados (mismos agentes). Reanudación programada cancelada.
- Task 2: complete (foto snap-2, review clean). Minors diferidos:
  - Task 2: minor (deferred): zona_horaria solo se valida como texto → Ruling 9.
  - Task 2: minor (deferred): código 'POLITICA_INVALIDA' duplicado en schema.ts y store.ts.
  - Task 2: minor (deferred): PROJECT_TYPES y ECOSYSTEMS como string[] sin enlace al tipo; `value as number` evitable.
  - Task 2: minor (deferred): fallo de readFile siempre como POLITICA_NO_ENCONTRADA (incluye la causa).
  - Task 2: minor (deferred): faltan tests de errores anidados y de formatos fecha/hora; imports duplicados en store.test.ts.
- Ruling 9: la Tarea 12 añade la validación de `proyecto.zona_horaria` en schema.ts (con attemptSync e Intl, mensaje que nombra la clave) antes de usarla — la Tarea 12 es la primera que la consume y el foco de revisión 1 exige mensajes claros — si es erróneo: un Europe/Madird daría una RangeError en CI.
- Task 3: review → Needs fixes (3 Important: registros escribibles pero no legibles; tema vacío rompe numeración; test de no-pisar no ejerce la protección). Minors diferidos:
  - Task 3: minor (deferred): fallo de writeFile siempre como DECISION_YA_EXISTE (comprobar EEXIST).
  - Task 3: minor (deferred): regex con caracteres combinantes invisibles (usar escape con nombre).
  - Task 3: minor (deferred): mkdir/readFile sin attempt() ni LeadFlowError.
  - Task 3: minor (deferred): faltan tests de DECISION_INVALIDA (archivo roto) y DECISIONES_NO_LEGIBLES.
- Task 3: fix round 1/5 dispatched (resume implementer), foto snap-3b.
- Task 3: fix round 1/5 (1 addressed, 2 open — autor/fecha con "## " rompen la lectura; test de colisión con carrera). Out-of-scope: posible ruido CRLF/LF en los dos archivos; trim al leer (minor deferred).
- Task 3: fix round 2/5 dispatched, foto snap-3c.
- Task 3: fix round 2/5 (3 addressed, 0 open).
- Task 3: complete (fotos snap-3..snap-3c, review clean tras 2 rondas). Minor diferido: parseRecord parte título y opciones solo por '\n' (un registro editado a mano con CRLF no se lee bien).
- Task 4: review → Needs fixes (1 Important: el test «never marks an option as recommended» no prueba el principio).
- Ruling 10: en el catálogo se RECHAZAN (CATALOGO_INVALIDO) los campos desconocidos de una opción y los textos que marcan una opción como preferida («recomendado/a», «recomendamos», «la mejor opción», sin distinguir mayúsculas ni tildes); se PERMITE citar a terceros («OWASP recomienda Argon2id») porque es información, no un ranking — el principio 2 del diseño es «se informa, no se aconseja» — si es erróneo: una opción legítima con «la mejor opción» en el texto tendría que reformularse.
- Task 4: minor (deferred): tema/stack del YAML no se comparan con la ruta; join sin validar (salida de root con ../) — hoy los valores son internos; revisar en Tarea 7 (cambiar <tema> valida contra la tabla).
- Task 4: minor (deferred): isStale con today no parseable devuelve false sin aviso; borde 183/184 sin test; cast `as string[]`; ramas de validación sin test.
- Task 4: fix round 1/5 dispatched, foto snap-4b.
- Task 4: fix round 1/5 (1 addressed, 0 open).
- Task 4: complete (fotos snap-4, snap-4b; review clean). Minor diferido: el filtro de preferencia es léxico («preferida», «recomendable» no se detectan).
- Task 5: review → Needs fixes (2 Important: docs de Laravel 12.x marcada como antigua; opción JWT de NestJS sin paquete y con requisito inventado).
- Ruling 11: los hallazgos de neutralidad (Minor 3 y 4: «habitual», «más reciente… menos ejemplos», «no suele necesitarlo», «es la configuración que genera NestJS» como argumento) entran en la ronda de arreglos como Important — incumplen el principio 2 del diseño («se informa, no se aconseja»), que es el corazón del producto — si es erróneo: unas frases más neutras de lo necesario.
- Task 5: minor (deferred): test `offers token and server-session options…` solo comprueba ≥2 opciones; listFiles supone carpetas; docs JWT de Express apunta al README de la librería; dotnet opción 2 sin el fragmento WarningsAsErrors.
- Task 5: fix round 1/5 dispatched, foto snap-5b.
- Task 5: fix round 1/5 (3 addressed, 0 open).
- Task 5: complete (fotos snap-5, snap-5b; review clean). Minors diferidos: Maven «XML largo» es valoración sutil; php-laravel opción 1 dice «trae PHPUnit» cuando la 13.x incluye Pest y PHPUnit.
- README: implementado (DONE_WITH_CONCERNS). GitHub no reconoce README.es.md como portada (API /readme → 404) → Ruling 12. Generador de los SVG solo en la carpeta temporal del agente → Ruling 13. En revisión.
- Ruling 12: el README pasa a llamarse README.md (en castellano, el público principal); README.es.md desaparece y se actualizan los enlaces que lo citen — GitHub solo muestra como portada README.md — si es erróneo: renombrar de vuelta; una versión inglesa sería README.en.md más adelante.
- Ruling 13: el generador de los SVG se guarda en el repositorio (assets/historia/fuente/generar.mjs) con una línea en el README de cómo regenerarlos — el diseño pide pulir la historia y producir el vídeo después; sin la fuente habría que rehacerla — si es erróneo: un archivo de más.
- Task 6: implementada (DONE_WITH_CONCERNS). En revisión.
- Ruling 14: init deja `github.modo = 'aviso'` hasta que `proteger` (Tarea 17) compruebe el plan y aplique los rulesets — restricción global: nunca afirmar un bloqueo que no existe — si es erróneo: un proyecto protegido mostraría «modo aviso» hasta ejecutar proteger.
- Task 6: review → Needs fixes (2 Important: comandos sacados de la prosa del catálogo, ya produce uno erróneo en dotnet; falta la pregunta de delegados).
- Ruling 15: las opciones de `herramientas` del catálogo llevan un campo estructurado `comandos: { pruebas, lint, build }` (obligatorio en ese tema, prohibido en los demás); el cargador lo valida, el contenido de las 6 entradas se completa, y la entrevista usa ese campo en lugar de parsear prosa, mostrando el valor como «sugerencia del catálogo, revísala» — los comandos acaban en la política y en la CI; parsear prosa ya produjo uno erróneo — si es erróneo: el catálogo pasa de 7 a 8 campos en un tema (cambio menor al §5.3 del diseño).
- Ruling 16: init pregunta los delegados (tema → persona, hasta dejar el tema vacío) y, si algún nivel elige «delegado» sin delegados definidos, avisa y vuelve a preguntar — diseño §5.1 y §5.5 — si es erróneo: una pregunta de más en la entrevista.
- Ruling 17: entran también en esta ronda dos menores ligados a principios del producto: catálogo ausente → LeadFlowError en vez de degradar en silencio a «otra» (principio: leer del catálogo); la decisión «comandos» registra los comandos que quedaron en la política (auditoría) — coste bajo — si es erróneo: ninguno.
- Task 6: minor (deferred): ecosistema detectado prima sobre el del stack elegido; literales sueltos y números sin validar hasta el final; questions.ts ~370 líneas (partir en commands.ts / catalogChoices.ts).
- Task 6: fix round 1/5 dispatched, foto snap-6b.
- Task 6: fix round 1/5 (4 addressed, 0 open).
- Task 6: complete (fotos snap-6, snap-6b; review clean). Minors diferidos: `vitest run` sin npx en node-express/nestjs y `phpcs` sin ./vendor/bin/ en php-laravel; mvn package ya ejecuta pruebas; mkdtemp sin limpiar en un test.
- Task 7: review → Needs fixes (1 Important: `cambiar stack` guarda comandos vacíos y el schema los acepta).
- Ruling 18: (1) el schema exige texto no vacío en stack.comandos.pruebas/lint/build; (2) `cambiar` encadena temas dependientes con una tabla FOLLOW_UP_TOPICS = { stack: ['comandos'] } y escribe una decisión por cada tema preguntado (dos en este caso) — la regla «una decisión» buscaba no tocar las antiguas, y encadenar no las toca; falla cerrado — si es erróneo: cambiar el stack pregunta una cosa más.
- Task 7: minor (deferred): `=async` sin espacio en run.ts:211; tras cambiar el stack, autenticación y ecosistema pueden quedar desfasados (avisar); `cambiar` sin tema dice «El tema «» no existe» (mensaje de uso); JSON.stringify para comparar listas.
- Task 7: fix round 1/5 dispatched, foto snap-7b.
- Task 7: fix round 1/5 (1 addressed, 0 open).
- Task 7: complete (fotos snap-7, snap-7b; review clean). Minor diferido: FOLLOW_UP_TOPICS como Record<string,…> (frágil ante claves del prototipo; hoy seguro por findTopic).
- README: review → Needs fixes (7 Important: filtro de la escena 6 se vuelve verde con el pago parado; pago visible solo un 25 % del ciclo; ilegible en móvil; «una semana en un día» es cifra inventada; tiempo verbal sugiere que lead-flow ya funciona; escena 7 «el cliente recibe esto» muestra el informe interno; sin llamada a la acción).
- Ruling 19: «Lo que antes era una semana, en un día» se sustituye por «La IA construye mucho más rápido de lo que el equipo puede revisar.» — regla del encargo: ninguna cifra de mejora inventada, y choca con METR — si es erróneo: Fernando puede recuperar la frase de la maqueta.
- Ruling 20: la escena 7 pasa a «SI EL CLIENTE PIDE PRUEBAS, RECIBE ESTO» — el diseño dice que el informe por ticket es interno y se entrega a quien lo exija por contrato — si es erróneo: un rótulo.
- Ruling 21: los Minor de la revisión del README entran en la misma ronda (matices de cifras, jerga, contraste AA, «Dev:» → «Dato:»/«Para el equipo técnico:», etc.) — el README es el escaparate y el listón es «muy pulido» — si es erróneo: más cambios de los estrictamente necesarios.
- README: fix round 1/5 dispatched (incluye Rulings 12 y 13), foto snap-R2.
- Task 8: implementada (DONE, 88 pruebas), revisión PENDIENTE. Pausa pedida por Fernando: solo trabaja el README hasta que termine; luego revisar Task 8 y seguir con la 9.
- 2026-11-11 07:54: README cortado por el límite a mitad de la ronda 1 (ya había renombrado a README.md, movido generar.mjs y rehecho escenas); reanudado.
- README: fix round 1/5 (todo addressed). README: complete. Minors diferidos: rojo #ff5555 sobre #2a2c3a 4,40:1 en «pago ✗»; sin explicar ticket, incidencia, QA, migraciones; frase de presente antes del aviso de estado.
- 2026-11-11: el registro pasa a specs/001-control-del-lead/registro-fase-1.md (se sube a Git) y las herramientas a specs/001-control-del-lead/sdd/, para seguir desde otro ordenador. Lista de lo pendiente: specs/001-control-del-lead/pendiente-fase-1.md. Desde aquí se actualiza este archivo.
- 2026-11-11: Fernando renombra el repositorio a github.com/fernando-delrio/lead-flow; se cambian las referencias en README.md, diseno.md, plan-fase-1.md y pendiente-fase-1.md (la acción pasa a fernando-delrio/lead-flow/acciones/puertas@v0).
