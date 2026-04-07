#!/usr/bin/env bash
set -euo pipefail

echo "Teste Anti-Frankenstein: Premium Tourism"
echo "=========================================="

# -------- Config --------
PORT="${PORT:-3010}"
BASE_URL="http://localhost:${PORT}"
BACKEND_DIR="${BACKEND_DIR:-}"
# ------------------------

# Auto-detect backend dir
detect_backend_dir() {
  # 1) If BACKEND_DIR was provided and valid
  if [[ -n "${BACKEND_DIR}" && -f "${BACKEND_DIR}/package.json" ]]; then
    echo "${BACKEND_DIR}"
    return
  fi

  # 2) If script is inside backend (recommended), use script folder
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "${script_dir}/package.json" && -d "${script_dir}/src" ]]; then
    echo "${script_dir}"
    return
  fi

  # 3) Common paths
  local candidates=(
    "$HOME/kaviar/backend"
    "$HOME/kaviar-v2/backend"
    "$HOME/backend"
  )
  for c in "${candidates[@]}"; do
    if [[ -f "${c}/package.json" && -d "${c}/prisma" ]]; then
      echo "${c}"
      return
    fi
  done

  # 4) Last resort: search in HOME (fast enough if limited)
  local found
  found="$(find "$HOME" -maxdepth 4 -type f -path "*/backend/package.json" 2>/dev/null | head -n 1 || true)"
  if [[ -n "${found}" ]]; then
    echo "$(dirname "${found}")"
    return
  fi

  echo "ERRO: não consegui localizar o diretório do backend." >&2
  echo "Dica: export BACKEND_DIR=~/kaviar/backend e rode novamente." >&2
  exit 1
}

BACKEND_DIR="$(detect_backend_dir)"
echo "✅ Backend detectado em: ${BACKEND_DIR}"
cd "${BACKEND_DIR}"

# Dependencies required
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERRO: comando '$1' não encontrado. Instale e tente novamente." >&2
    exit 1
  }
}
require_cmd curl
require_cmd jq

SERVER_PID=""
cleanup() {
  if [[ -n "${SERVER_PID}" ]]; then
    echo ""
    echo "🛑 Shutting down server (pid ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_server() {
  local premium="${1}" # true/false
  echo ""
  echo "📋 Iniciando servidor (ENABLE_PREMIUM_TOURISM=${premium}) na porta ${PORT}..."
  ENABLE_PREMIUM_TOURISM="${premium}" PORT="${PORT}" node dist/server.js >/tmp/kaviar_dev_${PORT}.log 2>&1 &
  SERVER_PID="$!"

  # Wait server ready
  for i in {1..60}; do
    if curl -sf "${BASE_URL}/api/health" >/dev/null 2>&1; then
      echo "✅ Server OK: ${BASE_URL}"
      return
    fi
    sleep 0.5
  done

  echo "ERRO: servidor não respondeu a tempo." >&2
  echo "Log:" >&2
  tail -n 60 "/tmp/kaviar_dev_${PORT}.log" >&2 || true
  exit 1
}

stop_server() {
  if [[ -n "${SERVER_PID}" ]]; then
    echo "📋 Parando servidor..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
    SERVER_PID=""
  fi
}

health_flag() {
  curl -sf "${BASE_URL}/api/health" | jq -r '.features.premium_tourism'
}

packages_status_code() {
  # print http code only
  curl -s -o /tmp/tour_packages_body_${PORT}.json -w "%{http_code}" \
    "${BASE_URL}/api/governance/tour-packages" || true
}

echo ""
echo "📋 1) Compilando (opcional, mas recomendado)..."
npm run build >/dev/null 2>&1 || true

# ---------------- OFF ----------------
start_server "false"

echo ""
echo "📋 2) Testes com flag OFF..."
HF="$(health_flag)"
echo "Health premium_tourism: ${HF}"

CODE="$(packages_status_code)"
echo "GET /api/governance/tour-packages (OFF) → HTTP ${CODE}"
echo "Body:"
cat "/tmp/tour_packages_body_${PORT}.json" | jq . || cat "/tmp/tour_packages_body_${PORT}.json"

# Expect: OFF should block packages endpoint (404 or 403/feature disabled)
if [[ "${HF}" != "false" ]]; then
  echo "❌ ERRO: health não retornou premium_tourism=false quando OFF" >&2
  exit 1
fi

if [[ "${CODE}" == "200" ]]; then
  echo "❌ ERRO: endpoint de tour-packages respondeu 200 quando flag OFF (deveria bloquear)" >&2
  exit 1
fi

stop_server

# ---------------- ON ----------------
start_server "true"

echo ""
echo "📋 3) Testes com flag ON..."
HF="$(health_flag)"
echo "Health premium_tourism: ${HF}"

CODE="$(packages_status_code)"
echo "GET /api/governance/tour-packages (ON) → HTTP ${CODE}"
echo "Body:"
cat "/tmp/tour_packages_body_${PORT}.json" | jq . || cat "/tmp/tour_packages_body_${PORT}.json"

if [[ "${HF}" != "true" ]]; then
  echo "❌ ERRO: health não retornou premium_tourism=true quando ON" >&2
  exit 1
fi

if [[ "${CODE}" != "200" ]]; then
  echo "❌ ERRO: endpoint de tour-packages não respondeu 200 quando flag ON" >&2
  exit 1
fi

echo ""
echo "✅ SUCESSO: Anti-Frankenstein Premium Tourism OK (OFF bloqueia / ON libera)."
echo "Backend: ${BACKEND_DIR}"
echo "Porta: ${PORT}"

# Cleanup handled by trap
