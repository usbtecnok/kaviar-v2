#!/bin/bash
set -e

echo "🚀 Applying migration and deploying..."

# 1. Apply migration
echo "1. Applying migration..."
cd /home/goes/kaviar/backend
psql $DATABASE_URL -f migrations/add_driver_availability.sql

# 2. Build
echo "2. Building..."
npm run build

# 3. Deploy ECS
echo "3. Deploying to ECS..."
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-1

echo "✅ Deploy completo"
echo "⏳ Aguarde 2-3min"
