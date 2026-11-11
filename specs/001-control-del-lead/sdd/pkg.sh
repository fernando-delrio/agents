#!/usr/bin/env bash
# Paquete de revisión: diferencias entre la foto de la tarea y el estado actual; filtro opcional por rutas.
set -uo pipefail
R=$(git rev-parse --show-toplevel)
W=$R/.superpowers/sdd/plan-fase-1; mkdir -p "$W"
N=$1; TAG=${2:-$1}; shift 2 || true
OUT=$W/review-task-$TAG.diff
CUR=$W/cur-$TAG; rm -rf "$CUR"; mkdir -p "$CUR"
tar -C "$R" --exclude=.git --exclude=node_modules --exclude=dist --exclude=.superpowers -cf - . | tar -C "$CUR" -xf -
PATHS=("$@"); [ ${#PATHS[@]} -eq 0 ] && PATHS=(".")
{ echo "# Paquete de revisión: tarea $TAG (foto snap-$N → estado actual; rutas: ${PATHS[*]})"; echo
  for P in "${PATHS[@]}"; do mkdir -p "$W/snap-$N/$P" "$CUR/$P";
    echo "## Archivos ($P)"; diff -rqN "$W/snap-$N/$P" "$CUR/$P" | sed "s#$W/##g"; echo
    echo "## Diferencias ($P)"; diff -ruN -U10 -x package-lock.json "$W/snap-$N/$P" "$CUR/$P" | sed "s#$W/##g"; echo
  done; } > "$OUT"
rm -rf "$CUR"
echo "escrito $OUT ($(wc -c < "$OUT") bytes)"
