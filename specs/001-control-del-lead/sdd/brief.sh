#!/usr/bin/env bash
# Extrae el texto de una tarea del plan (encabezados «### Tarea N:») más las secciones comunes.
set -euo pipefail
R=$(git rev-parse --show-toplevel)
W=$R/.superpowers/sdd/plan-fase-1; mkdir -p "$W"
P=$R/specs/001-control-del-lead/plan-fase-1.md
N=$1; OUT=$W/task-$N-brief.md
{
  awk '/^## Restricciones globales/{f=1} /^---$/{if(f){exit}} f' "$P"
  echo; awk '/^## Tipos compartidos/{f=1} /^## Bloque A/{exit} f' "$P"
  echo; echo "## Tu tarea"; echo
  awk -v n="$N" '$0 ~ "^### Tarea "n":"{f=1;print;next} f && (/^### Tarea [0-9]+:/ || /^## /){exit} f' "$P"
} > "$OUT"
echo "$OUT ($(wc -l < "$OUT") líneas)"
