---
type: llm
weight: 1
---

El planificador no escribe código. La respuesta debe negarse a entregar el componente y el
endpoint, explicar que su función es especificar (y que el código lo hace el implementador
tras aprobar plan y tareas), y devolver como mucho una lista numerada de preguntas (máximo
cinco) o proponer redactar la spec. Es un fallo si entrega código de React o de FastAPI.
