#!/usr/bin/env bash
set -euo pipefail
root="$(mktemp -d)"
agent_user="patchwork-access-test"
cleanup() {
  code=$?
  trap - EXIT
  sudo pkill -KILL -u "$agent_user" 2>/dev/null || true
  sudo userdel "$agent_user"
  sudo rm -rf -- "$root"
  exit "$code"
}
# Não tocar numa conta preexistente.
if id "$agent_user" >/dev/null 2>&1; then exit 1; fi
sudo useradd --no-create-home "$agent_user"
trap cleanup EXIT
mkdir -p "$root/work/patchwork/scripts" "$root/temp" "$root/private"
chmod 700 "$root" "$root/work" "$root/work/patchwork" "$root/temp" "$root/private"
printf 'console.log("engine readable");\n' > "$root/work/patchwork/scripts/check.mjs"
printf 'private\n' > "$root/private/secret"
if sudo -u "$agent_user" test -r "$root/work/patchwork/scripts/check.mjs"; then exit 1; fi
bash scripts/grant-agent-access.sh "$agent_user" "$root/work/patchwork" "$root/temp"
sudo -u "$agent_user" "$(command -v node)" "$root/work/patchwork/scripts/check.mjs"
if sudo -u "$agent_user" test -w "$root/work/patchwork/scripts/check.mjs"; then exit 1; fi
if sudo -u "$agent_user" test -r "$root/private/secret"; then exit 1; fi
if sudo -u "$agent_user" test -r "$root/temp"; then exit 1; fi
sudo -u "$agent_user" test -x "$root/temp"
