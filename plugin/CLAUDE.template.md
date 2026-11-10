# CLAUDE.md — <Nombre del proyecto>

@AGENTS.md

Las reglas comunes están en `AGENTS.md` (importado arriba). Aquí solo lo que aplica a Claude Code.

## Flujo de agentes

```text
planificador → revisor (spec) → aprobación → planificador (plan y tareas) → aprobación
  → implementador (una tarea) → puertas en paralelo → revisor (requisito por requisito)
  → cierre-incremento → commit de la persona
```

- **Puertas en paralelo:** al cerrar un incremento, lanza en un solo mensaje las que
  correspondan según lo tocado. Son de solo lectura y no se necesitan entre sí. Un veto para el
  trabajo; ninguna puerta revierte ni edita.
- **No las lances en cada edición:** un sistema multiagente gasta bastantes más tokens que una
  sola sesión. Una vez por incremento.
- **Modelo:** planificador, revisor y puerta-seguridad en opus; el resto en sonnet. Para una
  tarea de autenticación o datos sensibles, lanza el implementador con `model: opus`.
