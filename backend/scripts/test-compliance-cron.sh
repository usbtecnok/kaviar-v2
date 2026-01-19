#!/bin/bash

# Script de Teste - Cron Job de Compliance
# Valida instalação e configuração

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🧪 Teste de Instalação - Cron Job de Compliance               ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

BACKEND_DIR="/home/goes/kaviar/backend"
PASS=0
FAIL=0

# Função de teste
test_file() {
  if [ -f "$1" ]; then
    echo "✅ $2"
    ((PASS++))
  else
    echo "❌ $2 - Arquivo não encontrado: $1"
    ((FAIL++))
  fi
}

test_executable() {
  if [ -x "$1" ]; then
    echo "✅ $2"
    ((PASS++))
  else
    echo "❌ $2 - Não executável: $1"
    ((FAIL++))
  fi
}

test_dir() {
  if [ -d "$1" ]; then
    echo "✅ $2"
    ((PASS++))
  else
    echo "⚠️  $2 - Diretório não existe (será criado): $1"
  fi
}

echo "1️⃣ Verificando arquivos..."
echo ""

test_file "$BACKEND_DIR/scripts/compliance-cron.js" "Wrapper Node.js"
test_file "$BACKEND_DIR/scripts/run-compliance-cron.sh" "Script bash"
test_file "$BACKEND_DIR/scripts/compliance-crontab.txt" "Entrada de crontab"
test_file "$BACKEND_DIR/scripts/COMPLIANCE_CRON_README.md" "Documentação"

echo ""
echo "2️⃣ Verificando permissões..."
echo ""

test_executable "$BACKEND_DIR/scripts/run-compliance-cron.sh" "Script bash executável"

echo ""
echo "3️⃣ Verificando dependências..."
echo ""

test_file "$BACKEND_DIR/dist/services/compliance.service.js" "Serviço compilado"
test_file "$BACKEND_DIR/.env" "Variáveis de ambiente"

echo ""
echo "4️⃣ Verificando estrutura..."
echo ""

test_dir "$BACKEND_DIR/logs" "Diretório de logs"
test_dir "$BACKEND_DIR/logs/compliance" "Diretório de logs de compliance"

echo ""
echo "5️⃣ Teste de execução (dry run)..."
echo ""

cd "$BACKEND_DIR"

if node scripts/compliance-cron.js 2>&1 | head -20; then
  echo ""
  echo "✅ Execução bem-sucedida"
  ((PASS++))
else
  echo ""
  echo "❌ Erro na execução"
  ((FAIL++))
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   📊 Resultado dos Testes                                        ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Passou: $PASS"
echo "❌ Falhou: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 Todos os testes passaram!"
  echo ""
  echo "📋 Próximos passos:"
  echo "1. Instalar no crontab: crontab -e"
  echo "2. Adicionar linha: 0 0 * * * $BACKEND_DIR/scripts/run-compliance-cron.sh"
  echo "3. Verificar instalação: crontab -l"
  echo ""
  exit 0
else
  echo "⚠️  Alguns testes falharam. Verifique os erros acima."
  echo ""
  exit 1
fi
