#!/bin/bash

# Cron Job - Sistema de Compliance
# Executa bloqueio automático de motoristas com documentos vencidos

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${BACKEND_DIR}/logs/compliance"
LOG_FILE="${LOG_DIR}/compliance-cron-$(date +%Y%m%d).log"
ERROR_LOG="${LOG_DIR}/compliance-cron-error.log"

# Criar diretório de logs
mkdir -p "$LOG_DIR"

# Função de log
log() {
  echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date -Iseconds)] ERROR: $1" | tee -a "$LOG_FILE" | tee -a "$ERROR_LOG"
}

# Início
log "═══════════════════════════════════════════════════════════"
log "Iniciando cron job de compliance"
log "═══════════════════════════════════════════════════════════"
log "Backend dir: $BACKEND_DIR"
log "Log dir: $LOG_DIR"
log "Log file: $LOG_FILE"

# Verificar se backend existe
if [ ! -d "$BACKEND_DIR" ]; then
  log_error "Diretório backend não encontrado: $BACKEND_DIR"
  exit 1
fi

# Mudar para diretório do backend
cd "$BACKEND_DIR"
log "Working directory: $(pwd)"

# Verificar se script Node.js existe
if [ ! -f "scripts/compliance-cron.js" ]; then
  log_error "Script compliance-cron.js não encontrado"
  exit 1
fi

# Executar cron job e capturar saída
log "Executando compliance-cron.js..."
log "---"

if node scripts/compliance-cron.js 2>&1 | tee -a "$LOG_FILE"; then
  EXIT_CODE=${PIPESTATUS[0]}
else
  EXIT_CODE=$?
fi

log "---"
log "Exit code do Node.js: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
  log "✅ Cron job executado com sucesso"
else
  log_error "❌ Cron job falhou com exit code $EXIT_CODE"
fi

log "═══════════════════════════════════════════════════════════"
log "Cron job finalizado (exit code: $EXIT_CODE)"
log "═══════════════════════════════════════════════════════════"

# Rotação de logs (manter últimos 30 dias)
find "$LOG_DIR" -name "compliance-cron-*.log" -mtime +30 -delete 2>/dev/null || true

exit $EXIT_CODE
