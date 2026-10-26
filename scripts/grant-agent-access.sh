#!/usr/bin/env bash
# Concede travessia dos pais e leitura do motor apenas à conta isolada.
set -euo pipefail
agent_user="$1"
engine_root="$(realpath "$2")"
shift 2
for target in "$engine_root" "$@"; do
  parent="$(realpath "$target")"
  while [[ "$parent" != / ]]; do
    sudo setfacl -m "u:$agent_user:--x" "$parent"
    parent="$(dirname "$parent")"
  done
done
sudo setfacl -R -m "u:$agent_user:r-X" "$engine_root"
