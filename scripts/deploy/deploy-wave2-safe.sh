#!/bin/bash
set -e

echo "🚀 Deploying Wave 2..."

# Build
cd /home/goes/kaviar/backend
npm run build

# Deploy ECS
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-1

echo ""
echo "✅ Deploy iniciado"
echo ""
echo "⚠️  MIGRATION PENDENTE:"
echo "   Conectar no RDS e rodar:"
echo "   psql -h <RDS_HOST> -U postgres -d kaviar -f migrations/add_driver_availability.sql"
echo ""
echo "   Ou via ECS task:"
echo "   aws ecs run-task --cluster kaviar-prod --task-definition kaviar-backend \\"
echo "     --overrides '{\"containerOverrides\":[{\"name\":\"kaviar-backend\",\"command\":[\"sh\",\"-c\",\"npx prisma db execute --file migrations/add_driver_availability.sql\"]}]}'"
