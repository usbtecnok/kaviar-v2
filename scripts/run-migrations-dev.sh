#!/bin/bash
set -euo pipefail

CLUSTER="kaviar-cluster"
TASK_DEF="kaviar-backend-migrate:6"
SUBNETS="subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5"
SG="sg-0a54bc7272cae4623"
REGION="us-east-2"

# DATABASE_URL for DEV/STAGING (kaviar-db)
# Override this via environment variable if needed
DATABASE_URL="${DATABASE_URL:-postgresql://kaviaradmin:Kaviar2026SecureDB1769650964@kaviar-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require}"

echo "🚀 KAVIAR MIGRATION RUNNER (ANTI-FRANKENSTEIN)"
echo "================================================"
echo "Task Definition: $TASK_DEF"
echo "Cluster: $CLUSTER"
echo "Database: kaviar-db (DEV/STAGING)"
echo ""

# Run task with DATABASE_URL override
echo "▶️  Starting migration task..."
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"kaviar-backend\",\"environment\":[{\"name\":\"DATABASE_URL\",\"value\":\"$DATABASE_URL\"}]}]}" \
  --region "$REGION" \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ]; then
  echo "❌ Failed to start task"
  exit 1
fi

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')
echo "✅ Task started: $TASK_ID"
echo ""

# Wait for task to complete
echo "⏳ Waiting for task to complete..."
MAX_WAIT=300
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS=$(aws ecs describe-tasks \
    --cluster "$CLUSTER" \
    --tasks "$TASK_ID" \
    --region "$REGION" \
    --query 'tasks[0].lastStatus' \
    --output text)
  
  if [ "$STATUS" = "STOPPED" ]; then
    break
  fi
  
  echo "  Status: $STATUS (${ELAPSED}s elapsed)"
  sleep 10
  ELAPSED=$((ELAPSED + 10))
done

if [ "$STATUS" != "STOPPED" ]; then
  echo "⚠️  Task did not complete within ${MAX_WAIT}s"
  exit 1
fi

# Get exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ID" \
  --region "$REGION" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

echo ""
echo "📋 Task completed with exit code: $EXIT_CODE"
echo ""

# Fetch logs
echo "📄 Fetching logs..."
LOG_STREAM="ecs/kaviar-backend/$TASK_ID"
aws logs get-log-events \
  --log-group-name "/ecs/kaviar-backend" \
  --log-stream-name "$LOG_STREAM" \
  --region "$REGION" \
  --query 'events[*].message' \
  --output text || echo "⚠️  No logs available yet"

echo ""
if [ "$EXIT_CODE" = "0" ]; then
  echo "✅ MIGRATION_OK"
  exit 0
else
  echo "❌ MIGRATION_FAILED (exit code: $EXIT_CODE)"
  exit 1
fi
