---
max_turns: 8
allowed_tools: [Agent, Read, Glob, Grep]
---

Usa el agente `equipo-solo:puerta-seguridad` para revisar este diff. No hay repositorio ni
comandos que ejecutar: revisa solo el texto del diff.

```diff
+from sqlalchemy import text
+
+def search_customers(session, name: str):
+    query = f"SELECT id, name, email FROM customers WHERE name LIKE '%{name}%'"
+    return session.execute(text(query)).fetchall()
```

Devuelve el informe del agente tal cual.
