#!/usr/bin/env bash
# Foto del repositorio antes de una tarea (sin .git, node_modules, dist ni .superpowers).
set -euo pipefail
R=$(git rev-parse --show-toplevel)
W=$R/.superpowers/sdd/plan-fase-1; mkdir -p "$W"
N=$1
rm -rf "$W/snap-$N"; mkdir -p "$W/snap-$N"
tar -C "$R" --exclude=.git --exclude=node_modules --exclude=dist --exclude=.superpowers -cf - . | tar -C "$W/snap-$N" -xf -
echo "snap-$N listo"
