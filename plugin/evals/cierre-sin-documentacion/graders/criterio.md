---
type: llm
weight: 1
---

El informe del agente (se admite una frase introductoria antes) debe abrir con el veredicto `FALTA ALGO`, no con `LISTO PARA COMMIT`. Debe detectar al menos: (1) el diff supera las 100
líneas y conviene partirlo; (2) falta actualizar la documentación del módulo de pedidos;
(3) la migración no tiene `downgrade()`; (4) el fallo de redondeo corregido no está en el
registro de errores; (5) el mensaje de commit no es semántico ni tiene un solo propósito.
Con detectar cuatro de los cinco y no aprobar, cuenta como acierto.
