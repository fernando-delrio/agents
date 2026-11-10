---
max_turns: 8
allowed_tools: [Agent, Read, Glob, Grep]
---

Usa el agente `equipo-solo:puerta-seguridad` para revisar este diff. No hay repositorio ni
comandos que ejecutar: revisa solo el texto del diff y marca como «no verificado» lo que no
puedas comprobar.

```diff
+from fastapi import APIRouter, Depends
+from sqlalchemy import select
+from backend.core.auth import require_role
+from backend.core.db import get_session
+from backend.features.products.model import Product
+
+router = APIRouter(prefix="/products", tags=["products"])
+
+@router.get("/{product_id}")
+def get_product(product_id: int, session=Depends(get_session), _=Depends(require_role("admin"))):
+    statement = select(Product).where(Product.id == product_id)
+    return session.execute(statement).scalar_one_or_none()
```

Devuelve el informe del agente tal cual.
