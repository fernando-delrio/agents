# Diseño — Flujo de trabajo con IA controlado por la lead

> **Estado:** borrador para aprobar · **Fecha:** 2026-11-10 · **Repositorio:** `fernando-delrio/agents`
> **Autor de las decisiones:** Fernando del Río. Lo marcado **[decisión de Claude]** lo propuse yo
> y Fernando puede cambiarlo al leer.

---

## 1. Intención y porqué

La IA escribe código muchísimo más rápido que una persona, pero esa velocidad **no llega al
cliente** por dos motivos:

1. **El atasco de la revisión.** Todo acaba en una persona que tiene que revisar lo que genera la
   IA y no da abasto. El trabajo se para ahí, o se revisa a medias y se cuelan fallos.
2. **Sin pruebas.** Cuando el cliente pregunta «¿qué se ha hecho en mi proyecto?», nadie puede
   demostrarlo.

Este producto es un **flujo de trabajo para equipos que programan con IA** (startups y
consultoras) en el que **decide siempre una persona, la lead engineer**. La IA ayuda a programar y
a revisar, las máquinas filtran lo mecánico, una persona revisa solo lo que importa, y cada
entrega sale con su informe.

**Frase que lo resume:** *La IA pone la velocidad. El flujo hace que llegue al cliente.*

### Lo que dice la investigación (2026-11-09)

Todas las cifras salen de resúmenes de segunda mano y de encuestas de proveedores.
**Ninguna se publica sin verificarla antes en el informe original** (ver §9.2).

- Adopción casi total y poco control: 97 % usa asistentes de IA y solo el 30 % tiene control
  completo sobre ellos (Black Duck, 2026).
- El atasco se ha movido a la revisión: 85 % (GitLab). En el ensayo controlado de METR, con IA se
  tardó un 19 % más, aunque los desarrolladores creían ir más rápido.
- Los agentes no siguen las normas: solo el 35 % dice que las cumplen siempre, y solo el 45 %
  rastrea qué hizo la IA en cada cambio (Qodo, 2026).
- Seguridad: entre el 25 % y el 60 % de las muestras de código generado tienen fallos, según el
  estudio (Veracode, CSA, AppSec Santa).
- La auditoría la debe llevar el dueño del código; los registros del proveedor del modelo no
  sirven como tal.

## 2. Quién lo usa

| Persona | Qué hace en el flujo | Qué necesita |
|---|---|---|
| **Lead engineer** | Decide stack, seguridad, ramas, CI, reglas y excepciones. Reparte tickets | Control sin convertirse en un cuello de botella |
| **Programadores** (con cualquier agente de IA) | Trabajan los tickets dentro del marco. **No pueden modificar el flujo** | Saber las reglas antes de equivocarse; pedir excepciones fácil |
| **Dirección de la consultora o startup** | Lee métricas y el informe interno | Plazos, fallos, cobro |
| **Cliente final** | Recibe el resumen de entrega | La solución, no el cómo; evidencia si su contrato la exige |

## 3. Objetivos, no objetivos y antiobjetivos

**Éxito (palabras de Fernando):** llegar a todos los plazos, con los menores fallos posibles, que
el cliente pague y quede contento. Se mide con estas métricas, antes y después de adoptar el
flujo (al menos dos o tres sprints de referencia):

| Métrica | Cómo se obtiene |
|---|---|
| Entregas a tiempo | Hitos cerrados antes de su fecha / hitos totales |
| Fallos que llegan al cliente | Incidencias con etiqueta `fallo-produccion` por entrega |
| Carga de revisión humana | Cambios que exigieron revisión humana / cambios totales |
| Tiempo de respuesta de la lead | Desde que se pide una excepción hasta que se decide |
| Satisfacción del cliente | Una pregunta del 1 al 5 tras cada entrega (manual, fuera del sistema) |

**Antiobjetivos — fracasa aunque funcione si:**
- no se llega a las fechas;
- los bloqueos se esconden o salen tarde (en la ceremonia de la semana siguiente);
- el control añade tanto papeleo que el equipo va más lento que sin él;
- la lead se convierte en el nuevo cuello de botella.

**No objetivos ahora:** GitLab (es lo siguiente), modelo de negocio y cobro («ya se verá», decisión de
Fernando), panel web, SaaS, integración con Jira o Linear, Slack o Teams.

## 4. Principios (no negociables)

1. **Decide una persona.** Ningún agente aprueba, integra ni cambia el flujo.
2. **Se informa, no se aconseja.** En la configuración, las opciones salen **sin recomendación por
   defecto** y en orden alfabético, con pros, contras y documentación oficial. La lead puede pedir
   opinión, pero solo si la pide. Motivo: los modelos tienden a recomendar siempre lo más popular.
3. **El control vive fuera del agente.** Un programador puede usar el agente que quiera, con la
   configuración que quiera. Lo que no puede saltarse son las ramas protegidas, los responsables de
   código y las comprobaciones obligatorias de CI. Los adaptadores de cada agente solo le cuentan
   las reglas antes de que se equivoque.
4. **Primero lo determinista, después la IA.** Pruebas, lint, secretos, análisis estático y
   dependencias van antes que cualquier revisión con agentes. **Todo el flujo funciona sin IA**:
   la revisión con agentes es opcional (coste y privacidad del código del cliente).
5. **Hechos, no promesas.** Los informes cuentan lo que pasó, nunca garantizan nada.
6. **Agnóstico del stack.** PHP, Java, .NET, Node, Python… Si la opción no está en el catálogo, la
   lead la escribe.

## 5. Las piezas

### 5.1 La política del proyecto

Un único archivo versionado con todas las decisiones de la lead:
`.lead/politica.yml` **[decisión de Claude: YAML, porque lo lee una persona y cualquier lenguaje]**.

Contiene:
- **stack:** lenguajes, frameworks y versiones; comandos de pruebas, lint y build;
- **seguridad:** el enfoque de autenticación y sesión elegido y los requisitos que derivan de él;
- **dependencias:** permitidas y prohibidas (con licencias admitidas);
- **ramas:** convención de nombres (`ticket/<número>-<resumen>` por defecto) y protección;
- **puertas:** cuáles son obligatorias y con qué herramientas;
- **revisión humana por riesgo:** qué rutas o temas la exigen siempre (por ejemplo autenticación,
  pagos, migraciones, datos personales) y qué basta con las puertas;
- **delegaciones:** qué temas aprueba otra persona en lugar de la lead;
- **informes:** con qué frecuencia se genera el resumen para el cliente (siempre, por sprint o
  solo a petición; lo decide la lead);
- **decisiones:** cada respuesta, con su porqué, la fecha y quién la tomó.

Cada decisión queda registrada como entrada en `.lead/decisiones/NNNN-<tema>.md` (formato de
registro de decisiones: contexto, opciones vistas, decisión, porqué, fecha, autor). Ahí empieza la
auditoría.

**Nadie salvo la lead cambia `.lead/`**: lo garantiza `CODEOWNERS` más la protección de rama
(§5.5), no la buena voluntad.

### 5.2 La entrevista de configuración

Una herramienta de terminal que pregunta tema por tema y escribe la política:
`npx <nombre> init` **[decisión de Claude: Node, porque `npx` no exige instalar nada y lo tienen
casi todos los equipos; el nombre del producto está pendiente]**.

- Lee las opciones del **catálogo** (§5.3), no de lo que recuerde un modelo.
- Muestra cada opción con qué implica, pros, contras y enlace a la documentación oficial, **sin
  marcar ninguna como recomendada**. Siempre hay «otra» con texto libre.
- Ejemplo de FastAPI en autenticación: piezas de `fastapi.security` con OAuth2 y tokens Bearer,
  PyJWT, hashing con pwdlib (Argon2 o bcrypt) y sesión opaca guardada en el servidor.
- Al terminar: escribe `.lead/politica.yml`, las entradas de decisión, y ejecuta el generador (§5.4).
- `<nombre> cambiar <tema>` repite solo una parte y deja la decisión nueva registrada.
- Funciona sin IA. Como extra, una skill de Claude Code puede acompañar la entrevista explicando
  opciones, con la misma regla: informa, no recomienda salvo que se lo pidan.

### 5.3 El catálogo de opciones

Archivos versionados en el propio repositorio: `catalogo/<tema>/<stack>.yml`. Cada opción tiene
`id`, nombre, qué implica, pros, contras, enlace a documentación oficial y **fecha de última
revisión**. El catálogo es el activo más valioso y el que más mantenimiento exige: una opción sin
revisar en más de seis meses se muestra con un aviso **[decisión de Claude]**.

**Cobertura inicial [decisión de Claude, ajustable]:** a fondo, Python/FastAPI y Node
(Express/NestJS); con lo básico (pruebas, lint, auditoría de dependencias, secretos), Java/Spring,
PHP/Laravel y .NET. El resto, con texto libre hasta que alguien lo aporte.

### 5.4 El generador

A partir de la política crea o actualiza en el repositorio del proyecto:
- `AGENTS.md` corto (formato de `AGENTS.template.md`) con las reglas que derivan de la política;
- adaptadores de agentes (§5.10);
- `CODEOWNERS` con `.lead/`, la CI y los adaptadores a nombre de la lead;
- el workflow de GitHub Actions con las puertas (§5.6);
- plantillas de pull request e incidencia (excepción, fallo en producción);
- un script que aplica la protección de ramas con la API de GitHub. Lo ejecuta la lead, porque
  necesita permisos de administración.

Lo generado lleva una cabecera «generado desde `.lead/politica.yml`; no editar a mano», y la CI
comprueba que coincide con la política (§5.6, integridad).

### 5.5 Lo que no se puede saltar (GitHub)

- Rama principal protegida: solo se integra por pull request, con las comprobaciones obligatorias
  en verde y la aprobación requerida.
- `CODEOWNERS`: cualquier cambio en `.lead/`, `.github/workflows/` o los adaptadores exige la
  aprobación de la lead (o de su delegado para ese tema). Si el autor es la propia lead, aprueba el
  scrum master (§10, punto 9).
- Los programadores no tienen permisos de administración del repositorio.

### 5.6 Las puertas en CI

Se ejecutan en cada pull request, en este orden. Las de la primera fila son siempre obligatorias.

| Orden | Puerta | Herramienta [decisión de Claude] |
|---|---|---|
| 1 | Integridad del flujo: lo generado coincide con la política; `.lead/` no cambia sin la lead | Script propio |
| 2 | Pruebas, lint y build del stack | Los comandos de la política |
| 3 | Secretos | gitleaks |
| 4 | Análisis estático de seguridad | Semgrep (reglas por stack) |
| 5 | Dependencias: vulnerabilidades, licencias y lista permitida | Auditor del ecosistema (`npm audit`, `pip-audit`…) + script de lista permitida |
| 6 | Revisión con agentes (**opcional**, la lead la activa) | Claude Code sin interfaz, con los agentes del kit (`puerta-seguridad`, `puerta-rendimiento`, `revisor`) |
| 7 | ¿Necesita persona? | Script: si el cambio toca algo de «revisión humana por riesgo», pone la etiqueta `necesita-revision-humana` y exige la aprobación de una persona |

Cada puerta deja su resultado en formato máquina (JSON) como evidencia para el informe (§5.8).

La puerta 7 es la que ataca el atasco: clasifica cada cambio en nivel bajo, medio o alto y exige
la aprobación que corresponde a ese nivel (§10, punto 8). Lo de bajo riesgo no espera a nadie;
lo de riesgo, sí, y a fondo.

### 5.7 Excepciones

Cuando un programador necesita algo que no estaba decidido (por ejemplo una librería nueva):

1. Abre una incidencia con la plantilla **«Solicitud de excepción»**: qué necesita, para qué
   ticket, por qué, qué alternativas permitidas descartó y si le bloquea.
2. Se avisa a la lead (o al delegado de ese tema) con las notificaciones de GitHub, que pueden
   llegarle por correo.
3. **Si bloquea**, la etiqueta `urgente` la pone arriba en el parte diario (§5.9). **Si no**, queda
   en la lista para la próxima ceremonia ágil.
4. Decide la lead, a veces junto con el equipo, comentando `/aprobar` o `/rechazar` con su motivo.
5. Si aprueba, se abre un pull request automático que actualiza la política y registra la
   decisión. Si rechaza, también queda registrado.
6. **Permiso temporal** (confirmado por Fernando, entra en la fase 1): la lead puede aprobar
   «hasta la próxima ceremonia»; caduca solo si nadie lo confirma (§10, punto 10).
7. Mientras no se apruebe, la puerta 5 no deja integrar el cambio que usa esa librería.

### 5.8 Informes

**Informe interno por ticket**, generado al integrar cada pull request, **a partir de evidencias,
nunca de lo que un agente dice de sí mismo:**
- qué se pidió (incidencia y spec) y qué decisiones de la política aplicaban;
- resultado de cada puerta (de su JSON);
- quién revisó y quién aprobó, y cuándo (API de GitHub);
- qué agente y modelo intervinieron, **declarado** en la plantilla de pull request y en los
  trailers del commit (no se puede verificar técnicamente y el informe lo dice así);
- excepciones pedidas y su resolución;
- huella del commit integrado.

Se guarda **sin poder modificarse** en una rama `informes` que solo escribe el workflow y está
protegida **[decisión de Claude; alternativa descartada: artefactos de Actions, que caducan]**.

**Resumen de entrega para el cliente**, en lenguaje de negocio y con la frecuencia que decide la
lead: qué se ha entregado, si pasó los controles (sí o no), qué queda pendiente o tiene riesgo
conocido, y «si necesitáis la evidencia técnica, la tenemos». **El sistema genera un borrador; la
lead lo revisa y lo envía ella.** Nunca sale nada al cliente sin una persona.

### 5.9 Parte diario de bloqueos

Un workflow programado, cada mañana laborable, crea o actualiza una incidencia fija «Parte de
bloqueos» para la lead con:
- pull requests vetadas por una puerta, y desde cuándo;
- excepciones pendientes, con las urgentes arriba;
- pull requests que esperan revisión humana más de N horas (N en la política);
- tickets sin movimiento en N días;
- tiempo medio de respuesta de la lead la última semana (para detectar que ella es el atasco).

Sirve para la reunión diaria, y el histórico para la retrospectiva.

### 5.10 Adaptadores de agentes

**Nivel 1, con adaptador generado:**
- **Claude Code:** `CLAUDE.md` que importa `AGENTS.md`, el plugin del kit y la configuración
  gestionada por la organización. Desde la v2.1.277 Claude Code solo lee `AGENTS.md` si no hay
  `CLAUDE.md`.
- **GitHub Copilot:** `.github/copilot-instructions.md`.
- **Cursor:** `.cursor/rules/`.
- **Codex:** lee `AGENTS.md` de forma nativa.

**Nivel 2, solo `AGENTS.md` y las puertas:** Devin (trabaja en la nube y entrega pull requests),
Windsurf, Gemini CLI (necesita configurar que lea `AGENTS.md`), Jules, Amp y Aider. Junie
(JetBrains) queda sin confirmar.

El soporte de cada agente se verifica en su documentación antes de anunciarlo.

### 5.11 Relación con el kit actual (`equipo-solo`)

Los siete agentes del kit pasan a ser los agentes de rol del flujo (planificador, implementador,
revisor, puertas, cierre). Las plantillas `AGENTS.template.md` y `CLAUDE.template.md` pasan a ser
la salida del generador. Las evaluaciones del kit se amplían con casos del flujo de equipo.

## 6. Restricciones

- Licencia Apache-2.0. Todo el código del producto es abierto.
- GitHub primero; el diseño no debe impedir GitLab (las piezas de §5.5-§5.9 se escriben detrás de
  una capa fina por plataforma).
- Ningún dato del código del cliente sale a un servicio de IA salvo que la lead active la puerta 6.
- Sin dependencias pesadas en el CLI.
- Todo en castellano: textos, documentación y mensajes. Nombres de código en inglés.

## 7. Entrega por fases

Cada fase se puede usar por sí sola.

| Fase | Contenido | Hecha cuando |
|---|---|---|
| **1 · Núcleo en GitHub** | Política, entrevista, catálogo inicial (FastAPI y Node a fondo), generador (proyectos nuevos y existentes), puertas 1-5 y 7 con niveles de riesgo, excepciones con permiso temporal, informe interno por ticket, parte diario con lo integrado sin persona | Un repositorio nuevo y uno existente se configuran con `init`; una pull request con un secreto o una librería no permitida queda bloqueada; una limpia de bajo riesgo se integra sola, sale en el parte y genera su informe |
| **2 · Visibilidad** | Parte completo de bloqueos, métricas, muestreo de calidad, resumen para el cliente, puerta 6 con agentes, atestaciones firmadas y **revisión cruzada con dos modelos de IA** (idea de Fernando, 2026-11-10): uno implementa y otro de otro proveedor revisa, para que no compartan los mismos puntos ciegos. Es opcional; por defecto, un solo modelo | El parte y las métricas salen solos en el repositorio de ejemplo durante una semana |
| **3 · Presentación** | README con la historia (§9.1), documento de investigación verificada, vídeo, guía de adopción, repositorio de ejemplo público | Alguien que no conoce el proyecto entiende qué es y lo instala en 15 minutos |
| **4 · GitLab** | Las mismas piezas sobre GitLab | — |

El listón de Fernando para la fase 3 es «muy pulido»: no se enseña a nadie de fuera hasta que se cumple.

## 8. Riesgos (siendo realistas)

| Riesgo | Qué hacemos |
|---|---|
| GitHub y los grandes proveedores construyen algo parecido | Ventaja: independiente del agente, abierto, en castellano y con informe auditable; se revisa en cada fase |
| El catálogo se queda viejo | Fecha de revisión por opción y aviso; contribuciones abiertas |
| La revisión con agentes no da siempre el mismo resultado | Es opcional, va después de lo determinista y tiene evaluaciones (`claude plugin eval`) |
| Coste de tokens en CI | Puerta 6 desactivada por defecto; límite de coste en la política |
| La lead como cuello de botella | Delegaciones, listas preaprobadas, aviso de urgentes y métrica de respuesta |
| Lo que no se puede medir (cómo programa cada uno) | Solo se guía con `AGENTS.md`; se dice así en la documentación |
| Propiedad intelectual: el método nace de un trabajo contratado para Tools Equip | Fernando lo confirma con la empresa antes de difundirlo; el repositorio ya es público |

## 9. Presentación

### 9.1 La historia del README

Guion aprobado en la sesión de maquetas (versión 5), estética de juego 2D con colores de editor:
los personajes (lead, programador con su IA, revisor, cliente); el encargo «tienda online para el
viernes»; la IA hace 120 piezas el lunes; el atasco con 87 sin revisar el jueves; entrega tarde con
el fallo del pago; la misma semana con el flujo (el filtro para el pago, el revisor mira 14 y se
entrega el viernes); el informe que recibe el cliente; la tabla sin flujo / con flujo y la frase
final. Las cifras de la historia son ilustrativas y se dice así.

Formato: se anima como página web (Framer Motion o HyperFrames) y se exporta con ffmpeg a MP4
(GitHub lo reproduce en el README) con un GIF de respaldo. La maqueta está en
`.superpowers/brainstorm/` (local, no versionada).

### 9.2 La investigación como argumento

Un documento `doc/investigacion.md` con cada cifra **verificada en su fuente original**, con enlace,
fecha y qué mide exactamente. El README solo cita cifras de ese documento.

## 10. Decisiones tras la revisión del constructor (2026-11-10)

Un revisor leyó este documento como si fuera a construirlo. Estas son sus dudas resueltas. Todas
son **[decisión de Claude]** salvo las marcadas como pendientes de Fernando.

1. **Plan de GitHub.** En repositorios privados, la protección de ramas y la revisión obligatoria
   por `CODEOWNERS` solo se aplican con GitHub Team o superior (o en repositorios públicos). Se
   usan *rulesets* de GitHub. El generador detecta el plan; si no alcanza, funciona en **modo
   aviso**: las puertas se ejecutan pero no bloquean, y el informe y el README del proyecto lo
   dicen claramente. Nunca se finge un control que no existe.
2. **Contra quién aguanta el informe.** En la fase 1, rama `informes` protegida y cada informe
   encadenado con la huella del anterior: si alguien reescribe la historia, la cadena se rompe y
   se nota. Un administrador sí puede alterarla, y la documentación lo dice. Para contratos que
   exijan evidencia que ni la lead pueda tocar, en la fase 2 se añaden atestaciones firmadas de
   GitHub y una copia en un almacenamiento externo que elija la consultora.
3. **Repositorio del cliente.** Si la lead no tiene permisos de administración, el script de
   protección no aplica nada: imprime los pasos exactos para quien sí los tenga.
4. **Proyectos nuevos y existentes.** Los dos, desde la fase 1. El generador nunca pisa un archivo
   escrito a mano: escribe solo dentro de un bloque delimitado por marcadores y, si hay conflicto,
   para y enseña la diferencia para que decida la lead. La lista de dependencias se siembra con las
   que ya tiene el proyecto. El criterio de la fase 1 incluye un repositorio existente.
5. **Dependencias.** Una dependencia **directa nueva** exige aprobación (es lo que dijo Fernando:
   «se le pide a la lead»). Las transitivas no; solo pasan la auditoría de vulnerabilidades y
   licencias. No se fijan versiones desde la política: eso lo hace el archivo de bloqueo del
   ecosistema.
6. **Mismo repositorio.** El producto vive en `fernando-delrio/agents` junto al plugin
   `equipo-solo`, en carpetas separadas: `plugin/` (lo actual), `cli/`, `catalogo/`, `acciones/`
   (puertas para Actions) y `ejemplos/`. Los siete agentes no cambian en la fase 1; se adaptan al
   trabajo en equipo en la fase 2, con la puerta 6.
7. **Forks.** En la fase 1 se trabaja con ramas del mismo repositorio. Los forks quedan fuera:
   necesitarían `pull_request_target`, que tiene riesgos de seguridad propios.
8. **Quién aprueba cada cambio: por nivel de riesgo** (Fernando: «entre ellos, o QA, o
   automática y se dice en la stand-up»; el reparto en niveles es propuesta de Claude). La lead
   elige en la entrevista qué aprueba cada nivel, y estos son solo los niveles que se ofrecen:

   | Nivel | Qué es (lo define la política) | Quién aprueba |
   |---|---|---|
   | Bajo | Pasa todas las puertas y no toca nada de «revisión humana por riesgo» | Automática. **Sale en el parte de la stand-up** («ayer se integraron sin persona: …») y cualquiera del equipo puede marcarlo para revisarlo |
   | Medio | Lo que la lead no clasifique como bajo ni alto | Un compañero que no sea el autor (entre ellos) |
   | Alto | Autenticación, pagos, migraciones, datos personales y lo que añada la lead | QA o el delegado del tema, y la lead si así lo decide |

   **Control de calidad por muestreo** (propuesta de Claude): de los cambios de nivel bajo, uno de
   cada N (N en la política) se elige al azar para que lo revise una persona después de integrarlo.
   Así lo automático sigue vigilado sin frenar a nadie, como el control de calidad de una fábrica.
   El informe dice siempre qué nivel tuvo cada cambio y quién (o qué) lo aprobó.
9. **Cambios de la propia lead en las reglas** (Fernando): los revisa y aprueba el **scrum
   master**, que figura como segundo responsable de `.lead/` en `CODEOWNERS`. Si el equipo no tiene
   scrum master, la lead nombra a otra persona en la entrevista.
10. **Permiso temporal** (Fernando: entra). En la fase 1: la lead aprueba «hasta la próxima
    ceremonia» con una fecha; un workflow programado lo da por caducado si nadie lo confirma, y la
    puerta 5 vuelve a bloquear lo que use ese permiso. Caducar también queda en el registro.

## 11. Lo que queda al constructor

- Nombre del producto y del comando (pendiente de Fernando; mientras, un nombre provisional).
- Estructura interna del CLI, librería de preguntas en terminal y formato exacto del YAML.
- Reglas concretas de Semgrep por stack y cómo se empaquetan las puertas en Actions (acción
  reutilizable o workflow plantilla).
- Diseño exacto del informe en Markdown y del borrador para el cliente.
- Pruebas del propio producto: cada pieza con sus pruebas, más un repositorio de ejemplo que se
  usa como prueba de extremo a extremo en la CI del producto.
