---
max_turns: 8
allowed_tools: [Agent, Read, Glob, Grep]
---

Usa el agente `equipo-solo:puerta-rendimiento` para revisar este diff de un frontend React.
No hay repositorio ni build que ejecutar: revisa solo el texto y di «no medido» lo que no
puedas medir.

```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@ dependencies @@
+    "moment": "^2.30.1",
+    "lodash": "^4.17.21"
--- a/frontend/src/modules/landing/components/HeroSection.jsx
+++ b/frontend/src/modules/landing/components/HeroSection.jsx
+import moment from 'moment'
+import _ from 'lodash'
+
+export const HeroSection = () => {
+  const today = moment().format('DD/MM/YYYY')
+  return <h1>{_.capitalize('bienvenido')} — {today}</h1>
+}
```

La portada es la primera pantalla de la web (JS inicial). Devuelve el informe tal cual.
