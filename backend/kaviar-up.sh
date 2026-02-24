#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-east-2}"
CLUSTER="${CLUSTER:-kaviar-cluster}"
BACKEND_SERVICE="${BACKEND_SERVICE:-kaviar-backend-service}"
SMOKETEST_SERVICE="${SMOKETEST_SERVICE:-kaviar-smoketest-healthcheck}"

# Por padrão: sobe só backend. Para ligar smoketest também: SMOKETEST=1 ./kaviar-up.sh
SMOKETEST="${SMOKETEST:-0}"

echo "== STATUS ANTES =="
aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" \
  --services "$BACKEND_SERVICE" "$SMOKETEST_SERVICE" \
  --query "services[].{service:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount,status:status}" \
  --output table

echo "== SUBINDO BACKEND (desired=1) =="
aws ecs update-service --region "$REGION" --cluster "$CLUSTER" \
  --service "$BACKEND_SERVICE" --desired-count 1 --no-cli-pager >/dev/null

if [ "$SMOKETEST" = "1" ]; then
  echo "== SUBINDO SMOKETEST (desired=1) =="
  aws ecs update-service --region "$REGION" --cluster "$CLUSTER" \
    --service "$SMOKETEST_SERVICE" --desired-count 1 --no-cli-pager >/dev/null
else
  echo "== SMOKETEST fica DESLIGADO (default) =="
  aws ecs update-service --region "$REGION" --cluster "$CLUSTER" \
    --service "$SMOKETEST_SERVICE" --desired-count 0 --no-cli-pager >/dev/null || true
fi

echo "== AGUARDANDO BACKEND subir (até 5 min) =="
for i in $(seq 1 30); do
  RUNNING=$(aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" \
    --services "$BACKEND_SERVICE" \
    --query "services[0].runningCount" --output text)
  echo "Aguardando... ($i/30) runningCount=$RUNNING"
  if [ "$RUNNING" != "0" ]; then
    echo "✅ Backend rodando (runningCount=$RUNNING)"
    break
  fi
  sleep 10
done

echo "== STATUS DEPOIS =="
aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" \
  --services "$BACKEND_SERVICE" "$SMOKETEST_SERVICE" \
  --query "services[].{service:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount,status:status}" \
  --output table

echo "✅ OK. Para desligar: ./kaviar-down.sh"
