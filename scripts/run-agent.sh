#!/usr/bin/env bash
# Runner Linux descartável. O agente usa conta própria, sem sudo ou escrita no motor.
set -euo pipefail
: "${GITHUB_TOKEN:?GITHUB_TOKEN ausente}"
: "${SENTRY_ACCESS_TOKEN:?SENTRY_ACCESS_TOKEN ausente}"
: "${RUNNER_TEMP:?RUNNER_TEMP ausente}"
workspace="$PWD"
agent_user="patchwork-agent"
agent_pid=""
agent_dir="$(mktemp -d "$RUNNER_TEMP/patchwork-agent.XXXXXX")"
runner_uid="$(id -u)"
runner_gid="$(id -g)"
cleanup() {
  code=$?
  trap - EXIT INT TERM
  if [[ -n "$agent_pid" ]]; then sudo kill -TERM -- "-$agent_pid" 2>/dev/null || true; fi
  if id "$agent_user" >/dev/null 2>&1; then
    sudo pkill -TERM -u "$agent_user" 2>/dev/null || true
    sleep 1
    sudo pkill -KILL -u "$agent_user" 2>/dev/null || true
  fi
  [[ -z "$agent_pid" ]] || wait "$agent_pid" 2>/dev/null || true
  for output in report.md execution.json; do
    if [[ -f "$agent_dir/$output" && ! -L "$agent_dir/$output" ]]; then
      cp -- "$agent_dir/$output" "$RUNNER_TEMP/$output"
    fi
  done
  sudo chown -Rh "$runner_uid:$runner_gid" "$workspace/app"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Falhar se a conta existir evita encerrar processos de outra execução.
if id "$agent_user" >/dev/null 2>&1; then
  trap - EXIT INT TERM
  echo '::error::Conta patchwork-agent já existe neste runner.'
  exit 1
fi
sudo apt-get update -qq
sudo apt-get install -y -qq bubblewrap slirp4netns
sudo useradd --create-home --shell /bin/bash "$agent_user"
cp "$RUNNER_TEMP/patchwork-copilot/context.json" "$agent_dir/context.json"
cp "$RUNNER_TEMP/prompt.md" "$agent_dir/prompt.md"
mkdir "$agent_dir/home"
sudo chown -R "$agent_user:$agent_user" "$agent_dir" "$workspace/app"
export PATCHWORK_AGENT_DIR="$agent_dir"
export PATCHWORK_TOOL_PATH="$PATH"
if command -v go >/dev/null 2>&1; then export GOMODCACHE="$(go env GOMODCACHE)"; fi
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
setsid sudo -Hu "$agent_user" \
  --preserve-env=GITHUB_TOKEN,SENTRY_ACCESS_TOKEN,COPILOT_MODEL,PATCHWORK_AGENT_DIR,PATCHWORK_TOOL_PATH,PLAYWRIGHT_BROWSERS_PATH,GOROOT,GOMODCACHE \
  "$(command -v node)" "$workspace/patchwork/scripts/agent.mjs" &
agent_pid=$!
wait "$agent_pid"
