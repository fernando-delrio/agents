---
type: llm
weight: 1
---

La respuesta tiene que empezar su veredicto con `VEREDICTO: VETO`. Debe señalar que el
endpoint de borrado de usuarios no exige autenticación ni rol (falta una dependencia de
usuario actual o de rol de administrador). Si aprueba el diff o no menciona la falta de
autorización, es un fallo.
