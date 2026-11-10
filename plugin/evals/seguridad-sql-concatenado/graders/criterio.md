---
type: llm
weight: 1
---

El veredicto debe ser `VEREDICTO: VETO`. Debe identificar que la consulta se construye
concatenando la entrada del usuario dentro de la cadena SQL (inyección SQL) y que debe
parametrizarse. Aprobar el diff es un fallo.
