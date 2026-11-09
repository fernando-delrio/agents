# El flujo, y por qué está montado así

## Una página

```text
        ┌──────────── la persona decide en cada flecha marcada ✋ ────────────┐

 idea → planificador → revisor (spec) ✋ → planificador (plan + tareas) ✋
      → implementador (UNA tarea, prueba primero)
      → puertas EN PARALELO: seguridad · rendimiento · diseño · estilo
      → revisor (requisito por requisito)
      → cierre-incremento → ✋ commit de la persona
```

| Agente | Qué hace | Modelo | Escribe |
|---|---|---|---|
| `planificador` | Spec en EARS, plan y tareas | opus | solo en `specs/` |
| `revisor` | QA de la spec; valida la implementación requisito por requisito | opus | nada |
| `implementador` | Una tarea, con la prueba primero | sonnet | código |
| `puerta-seguridad` | Veta por fallos de seguridad (ejecuta pruebas y revisa lo que no cubren) | opus | nada |
| `puerta-rendimiento` | Veta por peso de JS, dependencias, imágenes | sonnet | nada |
| `revisor-diseno` | Coherencia visual y accesibilidad | sonnet | nada |
| `cierre-incremento` | Documentación, tareas, errores, tamaño del diff; prepara el commit | sonnet | nada |

Solo uno escribe código. Todos los que opinan son de solo lectura: así el que juzga no puede
arreglar a escondidas lo que acaba de criticar.

## Decisiones y su porqué

1. **Un solo agente escribe, muchos leen.** Un revisor que también edita deja de ser
   independiente. Con las puertas de solo lectura, un veto significa «para y decide tú».
2. **Las puertas se lanzan a la vez, una vez por incremento.** No dependen unas de otras, así
   que en paralelo cuesta el tiempo de la más lenta. Los sistemas con varios agentes gastan bastantes
   más tokens que un chat, por eso no se lanzan en cada edición.
3. **Cada agente tiene el modelo que su riesgo pide.** Seguridad y especificación, en el más
   capaz; implementar con un plan claro, en el intermedio. Se puede subir una llamada concreta.
4. **La regla que una máquina puede vigilar, la vigila la máquina.** Lint, pruebas de estilo y
   «trinquetes» (un archivo no puede empeorar) valen más que una frase en `AGENTS.md`. Lo mismo
   con Git: se bloquea en `permissions.deny`, no se confía en que el agente se acuerde.
5. **`AGENTS.md` corto, detalle en `doc/`.** Un archivo de entrada enorme se carga entero en
   cada sesión y cada subagente. Lo que se necesita siempre va ahí; lo demás se lee al tocar el tema.
6. **Los agentes se evalúan.** Si cambias el texto de un agente, ¿sigue vetando lo que debe?
   La carpeta `evals/` tiene casos con fallos conocidos y un caso limpio (para cazar falsas alarmas).

## Lo que se dejó fuera a propósito

- **Equipos de agentes (`agent teams`):** siguen siendo experimentales y gastan mucho más.
- **Memoria propia por agente:** activarla da permiso de escritura y rompería «solo lectura».
- **Más agentes «por si acaso»:** cada uno cuesta contexto en cada sesión. Se añade uno cuando
  un fallo real se repite y ningún agente lo cubre.

## Fuentes

Resúmenes de segunda mano de estos textos (verifica las cifras en el original antes de citarlas):

- Anthropic, «Building Effective Agents» — patrones simples y componibles: https://www.anthropic.com/research/building-effective-agents
- Anthropic, «How we built our multi-agent research system» — orquestador con trabajadores y coste: https://www.anthropic.com/engineering/multi-agent-research-system
- Documentación oficial de subagentes de Claude Code: https://code.claude.com/docs/en/sub-agents
- Harness engineering (archivo de entrada corto, reglas que ejecuta una máquina): https://www.ignorance.ai/p/the-emerging-harness-engineering
