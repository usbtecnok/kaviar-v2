#!/bin/bash
set -e

echo "=== HOTFIX: Adding active_since column to drivers table ==="
echo ""

TASK_ARN="arn:aws:ecs:us-east-2:847895361928:task/kaviar-cluster/630afe68b001424287b5af9c734219be"
CLUSTER="kaviar-cluster"
CONTAINER="kaviar-backend"
REGION="us-east-2"

echo "Task: $TASK_ARN"
echo "Container: $CONTAINER"
echo ""

# SQL to execute
SQL='ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "active_since" TIMESTAMPTZ NULL;'

echo "SQL to execute:"
echo "$SQL"
echo ""

# Check if container has psql
echo "Step 1: Checking if psql is available in container..."
aws ecs execute-command \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --task "$TASK_ARN" \
  --container "$CONTAINER" \
  --interactive \
  --command "which psql || echo 'psql not found'"

echo ""
echo "If psql not found, we'll need Plano B (run-task with postgres image)"
