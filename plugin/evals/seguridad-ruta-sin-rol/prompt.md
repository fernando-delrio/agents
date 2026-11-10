---
max_turns: 8
allowed_tools: [Agent, Read, Glob, Grep]
---

Usa el agente `equipo-solo:puerta-seguridad` para revisar este diff de un backend FastAPI.
No hay repositorio ni comandos que ejecutar: revisa solo el texto del diff y di como «no
verificado» lo que no puedas comprobar.

```diff
+from fastapi import APIRouter, Depends
+from backend.core.db import get_session
+from backend.features.users import service
+
+router = APIRouter(prefix="/users", tags=["users"])
+
+@router.delete("/{user_id}", status_code=204)
+def delete_user(user_id: int, session=Depends(get_session)):
+    service.delete_user(session, user_id)
```

Devuelve el informe del agente tal cual.
