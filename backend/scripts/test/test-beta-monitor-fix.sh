#!/bin/bash
# Quick test: Beta Monitor Dog with new flags

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTE 1: Checkpoint com rollout atual (5%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /home/goes/kaviar/backend

node dist/scripts/beta-monitor-dog.js \
  passenger_favorites_matching \
  phase2_rollout \
  test-local-$(date +%H%M%S) \
  --expected-rollout=5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTE 2: Checkpoint com enabled=true explícito"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node dist/scripts/beta-monitor-dog.js \
  passenger_favorites_matching \
  phase2_rollout \
  test-local-$(date +%H%M%S) \
  --expected-rollout=5 \
  --expected-enabled=true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TESTES CONCLUÍDOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Resultado esperado:"
echo "  - Status: PASS"
echo "  - Alerts: 0"
echo "  - Config: enabled=true, rollout=5%"
echo "  - Expected: rollout=5%, enabled=true"
echo "  - Sem CONFIG_DRIFT"
echo ""
