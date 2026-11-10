# AGENTS.md — <Nombre del proyecto>

Entrada corta para cualquier agente (objetivo: 60-100 líneas). El detalle vive en `doc/` y se
lee solo cuando se toca ese tema. Si crece de 120 líneas, mueve texto a `doc/` y deja aquí
solo la regla y un enlace.

**Qué es:** <una frase: producto, para quién, estado>.
**Pregunta de control antes de dar algo por terminado:** ¿lo pondría delante del cliente ahora
mismo, sin avisar de nada? Si la respuesta es «sí, pero…», no está terminado.

## Stack y comandos
- Frontend: <stack>. Backend: <stack>. Base de datos: <motor en dev y en producción>.
- Arrancar: `<comando backend>` · `<comando frontend>`.
- **Probar** (los agentes usan estas líneas, mantenlas exactas):
  `<pruebas backend>` · `<lint backend>` · `<pruebas frontend>` · `<lint frontend>` · `<build>`.
- Auditoría de dependencias: `<pip-audit>` · `<npm audit --audit-level=high>`.

## Estructura
- <Por feature o por capas; reglas de dependencias entre módulos; una línea por capa>.
- Antes de crear un archivo: módulo dueño, capa, producción o prueba, consumidores.

## Reglas de código
- <5-8 reglas concretas y comprobables: tamaño de función, estilo de errores, nombres…>
- Lo que una máquina puede vigilar (lint, prueba de estilo), que lo vigile la máquina.

## Líneas rojas de dominio
- <Lo que nunca se dice o se hace en este negocio: vocabulario prohibido, promesas, datos…>
- Qué prueba hace cumplir cada línea roja.

## Seguridad
- <Consultas parametrizadas, secretos fuera del código, autenticación en cada ruta, CORS…>

## Forma de trabajar
- Incrementos pequeños que conectan backend y frontend. Prueba antes que código en la lógica.
- **Git es de la persona**: el agente propone los comandos, nunca los ejecuta.
- Al terminar un incremento: parar, resumir y esperar la señal.
- Primero la spec (`specs/NNN-*/`, requisitos EARS), luego plan, tareas y código.

## Límites
- ✅ Siempre: leer antes de editar, ejecutar las pruebas que toques.
- ⚠️ Pregunta antes: dependencias nuevas, migraciones ya aplicadas, configuración de despliegue.
- 🚫 Nunca: Git, credenciales en el código, dar por hecho algo que no has ejecutado.

## Verificación antes de dar algo por terminado
Pruebas y lint en verde, documentación al día, diff pequeño. Según lo tocado pasan sus
puertas: `puerta-seguridad`, `puerta-rendimiento`, `revisor-diseno`. Son de solo lectura y se
lanzan **a la vez** al cerrar el incremento; `cierre-incremento` confirma qué falta.

## Lee X cuando toques Y
| Si tocas… | Lee |
|---|---|
| <tema> | `doc/<archivo>.md` |
