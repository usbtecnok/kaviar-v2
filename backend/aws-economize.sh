#!/bin/bash
# ============================================
# KAVIAR — Script de Economia AWS
# Reduz custos enquanto não há carros na rua
# Prioriza ações de BAIXO RISCO
# ============================================

set -euo pipefail

REGION="us-east-2"

echo "💰 PLANO DE ECONOMIA KAVIAR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Custo bruto atual: ~$261/mês"
echo "Créditos aplicados: ~-$75/mês"
echo "Custo líquido: ~$186/mês"
echo ""
echo "Economia potencial (baixo risco): ~$40-50/mês"
echo ""
echo "⚠️  Ações de ALTO RISCO (Multi-AZ, Redis) NÃO incluídas"
echo ""

# ============================================
# 1. Reduzir ECS de 2 para 1 task
# ============================================
echo "1️⃣  Reduzir backend de 2 para 1 task (economia: ~$20/mês)"
echo "   ✅ Baixo risco: 1 task aguenta tráfego de testes"
read -p "   Executar? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  aws ecs update-service \
    --cluster kaviar-cluster \
    --service kaviar-backend-service \
    --desired-count 1 \
    --region "$REGION" \
    --no-cli-pager
  echo "   ✅ Backend reduzido para 1 task"
else
  echo "   ⏭️  Pulado"
fi
echo ""

# ============================================
# 2. Parar smoketest healthcheck
# ============================================
echo "2️⃣  Parar smoketest healthcheck (economia: ~$2/mês)"
echo "   ✅ Baixo risco: healthcheck pode ser manual"
read -p "   Executar? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  aws ecs update-service \
    --cluster kaviar-cluster \
    --service kaviar-smoketest-healthcheck \
    --desired-count 0 \
    --region "$REGION" \
    --no-cli-pager
  echo "   ✅ Smoketest parado"
else
  echo "   ⏭️  Pulado"
fi
echo ""

# ============================================
# 3. Parar RDS kaviar-db (dev/staging)
# ============================================
echo "3️⃣  Parar RDS kaviar-db (dev/staging) (economia: ~$16/mês)"
echo "   ✅ Baixo risco: mantém kaviar-prod-db rodando"
echo "   ⚠️  Reinicia automaticamente em 7 dias"
read -p "   Executar? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  aws rds stop-db-instance \
    --db-instance-identifier kaviar-db \
    --region "$REGION" \
    --no-cli-pager
  echo "   ✅ kaviar-db parado"
else
  echo "   ⏭️  Pulado"
fi
echo ""

# ============================================
# 4. Reduzir backup retention RDS
# ============================================
echo "4️⃣  Reduzir backup retention de 7 para 1 dia (economia: ~$1/mês)"
echo "   ✅ Baixo risco: mantém 1 dia de backup"
read -p "   Executar? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  aws rds modify-db-instance \
    --db-instance-identifier kaviar-prod-db \
    --backup-retention-period 1 \
    --apply-immediately \
    --region "$REGION" \
    --no-cli-pager
  echo "   ✅ Backup retention reduzido"
else
  echo "   ⏭️  Pulado"
fi
echo ""

# ============================================
# 5. Reduzir retenção CloudWatch Logs
# ============================================
echo "5️⃣  Reduzir retenção CloudWatch Logs de indefinido para 7 dias (economia: ~$0.50/mês)"
echo "   ✅ Baixo risco: mantém 1 semana de logs"
read -p "   Executar? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  aws logs put-retention-policy \
    --log-group-name /ecs/kaviar-backend \
    --retention-in-days 7 \
    --region "$REGION" \
    --no-cli-pager
  echo "   ✅ Retenção de logs reduzida"
else
  echo "   ⏭️  Pulado"
fi
echo ""

# ============================================
# RESUMO
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ECONOMIA APLICADA (BAIXO RISCO)"
echo ""
echo "Economia estimada: ~$40/mês"
echo "Novo custo bruto: ~$220/mês"
echo "Novo custo líquido (com créditos): ~$145/mês"
echo ""
echo "Para reverter quando tiver carros na rua:"
echo "  aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --desired-count 2 --region us-east-2"
echo "  aws rds start-db-instance --db-instance-identifier kaviar-db --region us-east-2"
echo "  aws ecs update-service --cluster kaviar-cluster --service kaviar-smoketest-healthcheck --desired-count 1 --region us-east-2"
echo ""
echo "Verificar créditos e custos:"
echo "  https://console.aws.amazon.com/billing/home#/credits"
echo "  https://console.aws.amazon.com/cost-management/home"
echo ""
echo "⚠️  AÇÕES DE ALTO RISCO (não incluídas):"
echo "  - Desabilitar Multi-AZ prod (economia $16/mês, mas reduz disponibilidade)"
echo "  - Deletar Redis (economia $7/mês, mas perde cache de sessões)"
