#!/bin/bash
# Monitor de Rollout - passenger_favorites_matching
# PID: 8422
# Log: /home/goes/kaviar/backend/logs/monitor-rollout.log

echo "📊 MONITOR STATUS"
echo "================="
echo ""

# Processo
if ps -p 8422 > /dev/null 2>&1; then
  echo "✅ Monitor ativo (PID: 8422)"
else
  echo "❌ Monitor parado"
fi

echo ""
echo "📋 ÚLTIMAS LINHAS DO LOG:"
echo "========================="
tail -10 /home/goes/kaviar/backend/logs/monitor-rollout.log

echo ""
echo "🎯 STATUS ATUAL:"
echo "================"
cd /home/goes/kaviar/backend && node scripts/rollout-status.js

echo ""
echo "⏰ Próximo checkpoint: $(date -d '+15 minutes' '+%H:%M')"
echo "🎯 Avançar para 5%: 09:51 (2h após deploy)"
