---
type: llm
weight: 1
---

El veredicto debe ser `VEREDICTO: VETO`. Debe señalar que se añaden dependencias pesadas
(moment y lodash completos) al JS inicial de la portada sin justificación, para dos usos
triviales que se resuelven con el navegador (`Intl`/`toLocaleDateString`) o a mano. No debe
inventar cifras exactas de peso como si las hubiera medido: tiene que decir «no medido» o
dar una aproximación presentada como tal.
