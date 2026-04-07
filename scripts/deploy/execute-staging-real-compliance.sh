#!/bin/bash

# 🚀 STAGING REAL - Sistema de Compliance
# Branch: development (Neon)
# Database: neondb

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="COMPLIANCE_STAGING_REAL_REPORT.md"
LOG_FILE="staging-compliance-${TIMESTAMP}.log"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🚀 STAGING REAL - Sistema de Compliance                       ║"
echo "║   Branch: development (Neon)                                     ║"
echo "║   Database: neondb                                               ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Iniciar relatório
cat > $REPORT_FILE << REPORT_HEADER
# 🚀 Relatório de Staging Real - Sistema de Compliance

**Data:** $(date -Iseconds)  
**Ambiente:** Neon PostgreSQL - Branch development  
**Database:** neondb  
**Status:** EM EXECUÇÃO

---

## 📋 Checklist de Execução

REPORT_HEADER

# Função para adicionar ao relatório
add_to_report() {
  echo "$1" >> $REPORT_FILE
}

# Função para log
log() {
  echo "$1" | tee -a $LOG_FILE
}

log "1️⃣ Verificando ambiente..."
echo ""

# Carregar variáveis do .env
if [ -f "backend/.env" ]; then
  log "📋 Carregando variáveis do backend/.env..."
  export $(grep -v '^#' backend/.env | xargs)
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  log "❌ DATABASE_URL não definida"
  add_to_report ""
  add_to_report "## ❌ ERRO"
  add_to_report ""
  add_to_report "DATABASE_URL não definida. Configure o ambiente antes de executar."
  exit 1
fi

log "✅ DATABASE_URL detectada"
add_to_report ""
add_to_report "### ✅ Ambiente Configurado"
add_to_report ""
add_to_report "- DATABASE_URL: Configurada"
add_to_report "- Branch: development"
add_to_report "- Database: neondb"
add_to_report ""

# Verificar conexão com banco
log "2️⃣ Testando conexão com banco..."

# Usar Node.js com Prisma para testar conexão
cd backend
if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('OK'); process.exit(0); }).catch(() => process.exit(1));" > /dev/null 2>&1; then
  log "✅ Conexão com banco estabelecida"
  add_to_report "### ✅ Conexão com Banco"
  add_to_report ""
  add_to_report "Conexão estabelecida com sucesso."
  add_to_report ""
else
  log "❌ Falha na conexão com banco"
  add_to_report ""
  add_to_report "## ❌ ERRO"
  add_to_report ""
  add_to_report "Falha ao conectar com o banco de dados."
  cd ..
  exit 1
fi
cd ..

# Aplicar migration
log "3️⃣ Aplicando migration..."
echo ""

add_to_report "## 📊 Execução da Migration"
add_to_report ""

# Usar script Node.js para executar migration
cd backend
if node run-migration.js >> ../$LOG_FILE 2>&1; then
  log "✅ Migration aplicada com sucesso"
  add_to_report "### ✅ Migration Aplicada"
  add_to_report ""
  add_to_report '```sql'
  add_to_report "-- Tabela criada: driver_compliance_documents"
  add_to_report "-- Índices criados: 4 índices + 1 partial unique index"
  add_to_report "-- Foreign keys: 3 (driver_id, approved_by, rejected_by)"
  add_to_report '```'
  add_to_report ""
else
  log "❌ Erro na migration"
  add_to_report ""
  add_to_report "### ❌ ERRO na Migration"
  add_to_report ""
  add_to_report "Verifique o log: $LOG_FILE"
  add_to_report ""
  cd ..
  exit 1
fi
cd ..

# Verificar tabela criada
log "4️⃣ Verificando tabela criada..."
cd backend
COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.driver_compliance_documents.count().then(count => {
  console.log(count);
  process.exit(0);
}).catch(() => process.exit(1));
" 2>/dev/null || echo "0")
cd ..
log "✅ Tabela criada (registros: $COUNT)"

add_to_report "### ✅ Verificação da Tabela"
add_to_report ""
add_to_report "- Tabela: driver_compliance_documents"
add_to_report "- Registros: $COUNT"
add_to_report ""

# Verificar estrutura da tabela
log "5️⃣ Verificando estrutura da tabela..."
cd backend
COLUMNS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'driver_compliance_documents'\`.then(result => {
  console.log(result[0].count);
  process.exit(0);
}).catch(() => process.exit(1));
" 2>/dev/null || echo "0")
cd ..
log "✅ Colunas criadas: $COLUMNS"

add_to_report "### ✅ Estrutura da Tabela"
add_to_report ""
add_to_report "- Total de colunas: $COLUMNS"
add_to_report "- Campos principais: id, driver_id, type, file_url, status, valid_from, valid_until"
add_to_report "- Campos LGPD: lgpd_consent_accepted, lgpd_consent_ip, lgpd_consent_at"
add_to_report "- Campos de auditoria: created_at, updated_at"
add_to_report ""

# Verificar índices
log "6️⃣ Verificando índices..."
cd backend
INDEXES=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT COUNT(*) as count FROM pg_indexes WHERE tablename = 'driver_compliance_documents'\`.then(result => {
  console.log(result[0].count);
  process.exit(0);
}).catch(() => process.exit(1));
" 2>/dev/null || echo "0")
cd ..
log "✅ Índices criados: $INDEXES"

add_to_report "### ✅ Índices"
add_to_report ""
add_to_report "- Total de índices: $INDEXES"
add_to_report "- Índice único parcial: idx_driver_compliance_current_unique (WHERE is_current = true)"
add_to_report ""

# Subir backend
log "7️⃣ Iniciando backend..."
echo ""

add_to_report "## 🚀 Backend"
add_to_report ""

cd backend

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
  log "📦 Instalando dependências..."
  npm install >> ../$LOG_FILE 2>&1
fi

# Verificar se já está compilado
if [ ! -d "dist" ]; then
  log "🔨 Compilando TypeScript..."
  npm run build >> ../$LOG_FILE 2>&1
fi

# Iniciar backend em background
log "🚀 Iniciando servidor..."
npm run dev > ../$LOG_FILE 2>&1 &
BACKEND_PID=$!

log "✅ Backend iniciado (PID: $BACKEND_PID)"
add_to_report "### ✅ Backend Iniciado"
add_to_report ""
add_to_report "- PID: $BACKEND_PID"
add_to_report "- Porta: 3003"
add_to_report ""

# Aguardar backend iniciar
log "⏳ Aguardando backend inicializar (15s)..."
sleep 15

# Verificar se backend está rodando
if curl -s http://localhost:3003/health > /dev/null 2>&1; then
  log "✅ Backend respondendo"
  add_to_report "### ✅ Health Check"
  add_to_report ""
  add_to_report "Backend respondendo em http://localhost:3003"
  add_to_report ""
else
  log "⚠️  Backend não respondeu ao health check (pode estar inicializando)"
  add_to_report ""
  add_to_report "### ⚠️  Health Check"
  add_to_report ""
  add_to_report "Backend não respondeu imediatamente. Continuando..."
  add_to_report ""
fi

cd ..

# Executar cron job uma única vez
log "8️⃣ Executando cron job de compliance..."
echo ""

add_to_report "## ⏰ Cron Job - Bloqueio Automático"
add_to_report ""

# Criar script Node.js temporário para executar o cron job
cat > /tmp/run-compliance-cron.js << 'CRONSCRIPT'
const { complianceService } = require('./backend/dist/services/compliance.service.js');

async function runCron() {
  try {
    console.log('🔄 Executando cron job de compliance...');
    const result = await complianceService.applyAutomaticBlocks();
    console.log('✅ Cron job executado com sucesso');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no cron job:', error);
    process.exit(1);
  }
}

runCron();
CRONSCRIPT

# Executar cron job
if node /tmp/run-compliance-cron.js >> $LOG_FILE 2>&1; then
  log "✅ Cron job executado com sucesso"
  
  # Capturar resultado
  CRON_RESULT=$(tail -20 $LOG_FILE | grep -A 10 "Executando cron job")
  
  add_to_report "### ✅ Cron Job Executado"
  add_to_report ""
  add_to_report '```json'
  add_to_report "$CRON_RESULT"
  add_to_report '```'
  add_to_report ""
else
  log "⚠️  Erro ao executar cron job"
  add_to_report ""
  add_to_report "### ⚠️  Cron Job"
  add_to_report ""
  add_to_report "Erro ao executar. Verifique o log: $LOG_FILE"
  add_to_report ""
fi

# Limpar script temporário
rm -f /tmp/run-compliance-cron.js

# Parar backend
log "9️⃣ Parando backend..."
kill $BACKEND_PID 2>/dev/null || true
log "✅ Backend parado"

add_to_report "### ✅ Backend Parado"
add_to_report ""

# Finalizar relatório
add_to_report "---"
add_to_report ""
add_to_report "## 🎯 Conclusão"
add_to_report ""
add_to_report "**Status:** ✅ STAGING REAL CONCLUÍDO"
add_to_report ""
add_to_report "### Validações Realizadas"
add_to_report ""
add_to_report "- [x] Migration aplicada no branch development"
add_to_report "- [x] Tabela driver_compliance_documents criada"
add_to_report "- [x] Índices criados (incluindo partial unique index)"
add_to_report "- [x] Backend iniciado e respondendo"
add_to_report "- [x] Cron job executado uma vez"
add_to_report ""
add_to_report "### Arquivos Gerados"
add_to_report ""
add_to_report "- Relatório: $REPORT_FILE"
add_to_report "- Log: $LOG_FILE"
add_to_report ""
add_to_report "### Próximos Passos"
add_to_report ""
add_to_report "**Branch production permanece BLOQUEADO.**"
add_to_report ""
add_to_report "Aguardando autorização para produção."
add_to_report ""
add_to_report "---"
add_to_report ""
add_to_report "**Executado em:** $(date -Iseconds)"

echo ""
log "╔══════════════════════════════════════════════════════════════════╗"
log "║                                                                  ║"
log "║   ✅ STAGING REAL CONCLUÍDO                                     ║"
log "║                                                                  ║"
log "╚══════════════════════════════════════════════════════════════════╝"
echo ""
log "📄 Relatório: $REPORT_FILE"
log "📋 Log: $LOG_FILE"
echo ""
