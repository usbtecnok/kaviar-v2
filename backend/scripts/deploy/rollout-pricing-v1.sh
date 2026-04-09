#!/bin/bash
# ============================================================
# ROLLOUT PRICING V1 — Produção
# Executar de ambiente com acesso ao RDS (bastion/ECS exec)
# ============================================================

set -e

echo "=== PASSO 1: Migrations ==="

echo "[1/4] pricing_profiles..."
psql "$DATABASE_URL" -f prisma/migrations/manual/001_pricing_profiles.sql

echo "[2/4] ride_settlements..."
psql "$DATABASE_URL" -f prisma/migrations/manual/002_ride_settlements.sql

echo "[3/4] rides_v2 pricing fields..."
psql "$DATABASE_URL" -f prisma/migrations/manual/003_rides_v2_pricing_fields.sql

echo "[4/4] seed pricing profiles..."
psql "$DATABASE_URL" -f prisma/migrations/manual/004_seed_pricing_profiles.sql

echo ""
echo "=== PASSO 2: Validar ==="
psql "$DATABASE_URL" -c "SELECT slug, base_fare, per_km, minimum_fare, fee_local, fee_adjacent, fee_external FROM pricing_profiles;"
psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rides_v2' AND column_name IN ('quoted_price','locked_price','final_price','platform_fee','driver_earnings','territory_match','pricing_profile_id') ORDER BY column_name;"
psql "$DATABASE_URL" -c "SELECT count(*) as ride_settlements_exists FROM information_schema.tables WHERE table_name = 'ride_settlements';"

echo ""
echo "=== Migrations OK ==="
echo ""
echo "Próximos passos manuais:"
echo "  1. Deploy do código (push + ECS force-new-deployment)"
echo "  2. Setar WA_RIDE_COMPLETE_ENABLED=true no ECS task definition"
echo "  3. Rodar teste controlado real"
echo ""
echo "=== Checklist pós-teste ==="
echo "  psql \$DATABASE_URL -c \"SELECT ride_id, pricing_profile_slug, route_territory, driver_territory, quoted_price, locked_price, final_price, fee_percent, driver_earnings, credit_cost, settled_at FROM ride_settlements ORDER BY created_at DESC LIMIT 5;\""
echo "  # Verificar logs ECS: [PRICING_QUOTE], [PRICING_REFINE], [PRICING_SETTLE], [TWILIO_CALL_DEBUG]"
