# equipo-solo — un equipo de agentes para quien desarrolla solo

Kit de agentes de Claude Code para un desarrollador full stack **sin equipo**. Cubre el ciclo
completo: especificar, implementar, pasar las puertas de calidad y cerrar cada incremento.
Sale de un producto real en producción (web con backend en FastAPI y frontend en React), con
las reglas de ese negocio quitadas y sustituidas por plantillas.

> Pensado para leerlo en 10 minutos. Si solo tienes dos, lee «El flujo» y «Instalarlo».

## El flujo

```text
idea → planificador → revisor (spec) ✋ → planificador (plan + tareas) ✋
     → implementador (una tarea, prueba primero)
     → puertas en paralelo: seguridad · rendimiento · diseño
     → revisor (requisito por requisito) → cierre-incremento → ✋ tu commit
```

✋ = decides tú. **Solo el implementador escribe código**; todos los demás son de solo
lectura. El porqué de cada decisión está en [`doc/FLUJO.md`](doc/FLUJO.md).

## Qué trae

| Pieza | Contenido |
|---|---|
| `agents/` | 7 agentes: `planificador`, `revisor`, `implementador`, `puerta-seguridad`, `puerta-rendimiento`, `revisor-diseno`, `cierre-incremento` |
| `evals/` | 6 casos de evaluación: diffs con fallos conocidos que las puertas deben vetar, y un diff limpio para cazar falsas alarmas |
| `AGENTS.template.md` | Plantilla del archivo de entrada corto (60-100 líneas) |
| `CLAUDE.template.md` | Plantilla que lo importa y añade el flujo de agentes |
| `doc/FLUJO.md` | Decisiones, su porqué, lo que se dejó fuera y las fuentes |

## Instalarlo

Necesitas Claude Code. Descomprime la carpeta y, desde una terminal:

```bash
claude plugin marketplace add /ruta/a/kit-agentes-fullstack
claude plugin install equipo-solo@equipo-solo
```

Si el repositorio está en GitHub (`fernando-delrio/agents`), no hace falta descargar nada:

```bash
claude plugin marketplace add fernando-delrio/agents
claude plugin install equipo-solo@equipo-solo
```

Abre una sesión nueva (los agentes se cargan al arrancar). Comprueba que están con `/agents`:
deben salir con el prefijo `equipo-solo:`.

## Adaptarlo a tu proyecto (15 minutos)

1. Copia `AGENTS.template.md` a la raíz de tu repo como `AGENTS.md` y rellena sobre todo
   **«Probar»**: los agentes ejecutan exactamente esos comandos. Y `CLAUDE.template.md` como
   `CLAUDE.md`.
2. Escribe tus **líneas rojas de dominio** (lo que nunca se dice o hace en tu negocio) y, si
   puedes, una prueba automática que las haga cumplir.
3. Si tienes sistema de diseño, ponlo en `DESIGN.md`; `revisor-diseno` lo lee.
4. Bloquea Git en tu `~/.claude/settings.json`, para que lo decida una máquina y no la memoria
   de un agente:

   ```json
   { "permissions": { "deny": ["Bash(git add *)", "Bash(git commit *)", "Bash(git push *)"] } }
   ```

## Uso diario

- Funcionalidad nueva: «usa el planificador para especificar X». Lee la spec, corrígela,
  pasa el revisor, aprueba, pide el plan y las tareas.
- Cada tarea: «implementa la tarea 3». Para al terminar; la siguiente la pides tú.
- Al cerrar el incremento: pide las puertas que toquen **todas a la vez**, y después
  `cierre-incremento`. Te devuelve qué falta y el commit sugerido.
- Una vez por incremento, no en cada edición: varios agentes gastan bastantes más tokens.

## Evaluar los agentes

```bash
claude plugin eval /ruta/a/kit-agentes-fullstack --runs 3 --max-cost-usd 5
```

Cada caso de `evals/` le pasa a un agente un diff con un fallo conocido y comprueba que lo
veta. Úsalo **cada vez que cambies el texto de un agente**: si un caso que pasaba deja de
pasar, el cambio lo ha empeorado. Para añadir un caso: `claude plugin eval init --bare nombre`.
Los casos con fallo trabajan sobre texto, sin repositorio; no sustituyen a una revisión real.

## Límites que conviene saber

- Los agentes de un plugin **ignoran** `hooks`, `permissionMode` y `mcpServers` en su
  cabecera. Por eso el bloqueo de Git va en `settings.json` y no en cada agente.
- Los agentes empiezan sin contexto: leen `AGENTS.md` y lo que ese archivo les remita.
  Si `AGENTS.md` miente o está obsoleto, los agentes también.
- Las puertas piden ejecutar pruebas y auditorías, que dependen de tu stack. Lo que no pueden
  ejecutar lo marcan «no verificado», nunca como aprobado.
- Las cabeceras de los agentes (`model`, `effort`, `maxTurns`) son una propuesta razonable,
  no una verdad: ajústalas a tu cuenta y a tu coste.

## Licencia

MIT.

## Estado de las evaluaciones (primera pasada, 2026-11-09)

Primera ejecución real, 3 repeticiones por caso, con y sin el plugin. Conviene leerla con
sus matices:

| Caso | Resultado |
|---|---|
| `planificador-no-escribe-codigo` | Pasa; sin el plugin, falla |
| `rendimiento-dependencia-pesada` | Pasa; sin el plugin, falla |
| `seguridad-ruta-sin-rol` | Pasa; sin el plugin, falla |
| `seguridad-diff-limpio` | Pasa (y también sin plugin: no discrimina, solo vigila falsas alarmas) |
| `cierre-sin-documentacion` | El agente acertó los cinco fallos; el criterio era demasiado literal y se corrigió. **Sin repetir tras la corrección** |
| `seguridad-sql-concatenado` | **No se ejecutó**: la cuenta alcanzó el límite de sesión. Sin resultado |

Es decir: 4 de 6 verificados, 1 corregido sin repetir y 1 pendiente. Repite la suite con
`--trust-plugin` la primera vez. Coste de esa pasada: unos 1,1 dólares.
