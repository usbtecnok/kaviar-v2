#!/bin/bash

echo "🧪 Teste controlado de WARN/FAIL"
echo "================================"
echo ""
echo "Estratégia: Alterar rollout_percentage para 50% temporariamente"
echo "Isso vai gerar WARN de 'Configuration drift'"
echo ""

# Conectar no banco e alterar
export PGPASSWORD="KaviarDB2026!Secure"

echo "1️⃣ Salvando estado atual..."
psql "postgresql://kaviaradmin@kaviar-prod-db.cyvuq86iugqc.us-east-1.rds.amazonaws.com:5432/kaviar?sslmode=require" \
  -c "SELECT enabled, rollout_percentage FROM feature_flags WHERE key = 'passenger_favorites_matching';" 2>/dev/null || echo "⚠️ Não consegui conectar no RDS (esperado se não estiver em VPC)"

echo ""
echo "2️⃣ Alternativa: Usar endpoint admin para alterar..."
echo "Vamos usar a API para forçar um drift"
