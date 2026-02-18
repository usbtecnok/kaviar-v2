#!/bin/bash

# SPEC_RIDE_FLOW_V1 - Comandos Rápidos
# Use este script para setup e testes rápidos

set -e

echo "🚀 SPEC_RIDE_FLOW_V1 - Setup Rápido"
echo "===================================="
echo ""

# Função para mostrar menu
show_menu() {
  echo "Escolha uma opção:"
  echo ""
  echo "  1) Setup completo (migration + seed + start)"
  echo "  2) Apenas migration"
  echo "  3) Apenas seed"
  echo "  4) Testar 20 corridas"
  echo "  5) Testar fluxo manual (1 corrida)"
  echo "  6) Verificar status (motoristas online, corridas ativas)"
  echo "  7) Limpar dados de teste"
  echo "  8) Ver logs em tempo real"
  echo "  9) Sair"
  echo ""
  read -p "Opção: " choice
  echo ""
}

# 1. Setup completo
setup_complete() {
  echo "📦 Setup completo..."
  cd /home/goes/kaviar/backend
  
  echo "1/4 - Rodando migration..."
  npx prisma migrate dev --name ride_flow_v1
  
  echo "2/4 - Gerando Prisma Client..."
  npx prisma generate
  
  echo "3/4 - Seed de teste..."
  npx tsx prisma/seed-ride-flow-v1.ts
  
  echo "4/4 - Iniciando servidor..."
  echo ""
  echo "✅ Setup completo! Servidor iniciando..."
  echo "   Acesse: http://localhost:3003/api/health"
  echo ""
  npm run dev:3003
}

# 2. Apenas migration
run_migration() {
  echo "📦 Rodando migration..."
  cd /home/goes/kaviar/backend
  npx prisma migrate dev --name ride_flow_v1
  npx prisma generate
  echo "✅ Migration completa!"
}

# 3. Apenas seed
run_seed() {
  echo "🌱 Seed de teste..."
  cd /home/goes/kaviar/backend
  npx tsx prisma/seed-ride-flow-v1.ts
  echo "✅ Seed completo!"
}

# 4. Testar 20 corridas
test_20_rides() {
  echo "🚗 Testando 20 corridas..."
  cd /home/goes/kaviar/backend
  ./scripts/test-ride-flow-v1.sh
}

# 5. Testar fluxo manual
test_manual() {
  echo "🧪 Teste manual (1 corrida)..."
  echo ""
  
  # Criar corrida
  echo "1/3 - Criando corrida..."
  RESPONSE=$(curl -s -X POST http://localhost:3003/api/v2/rides \
    -H "Content-Type: application/json" \
    -H "x-passenger-id: test-passenger-1" \
    -d '{"origin":{"lat":-22.9668,"lng":-43.1729},"destination":{"lat":-22.9500,"lng":-43.1800}}')
  
  RIDE_ID=$(echo "$RESPONSE" | jq -r '.data.ride_id')
  echo "   Ride ID: $RIDE_ID"
  echo ""
  
  # Aguardar dispatch
  echo "2/3 - Aguardando dispatch (2s)..."
  sleep 2
  
  # Buscar oferta
  echo "3/3 - Buscando oferta pendente..."
  OFFER=$(psql $DATABASE_URL -t -c "SELECT id FROM ride_offers WHERE ride_id='$RIDE_ID' AND status='pending' LIMIT 1;")
  OFFER_ID=$(echo "$OFFER" | xargs)
  
  if [ -z "$OFFER_ID" ]; then
    echo "   ❌ Nenhuma oferta encontrada"
    echo "   Verifique se motoristas estão online"
  else
    echo "   Offer ID: $OFFER_ID"
    echo ""
    echo "Para aceitar a oferta, rode:"
    echo "  curl -X POST http://localhost:3003/api/v2/drivers/offers/$OFFER_ID/accept -H 'x-driver-id: test-driver-1'"
  fi
}

# 6. Verificar status
check_status() {
  echo "📊 Status do sistema..."
  echo ""
  
  echo "Motoristas online:"
  psql $DATABASE_URL -c "SELECT d.id, d.name, ds.availability, dl.updated_at FROM drivers d LEFT JOIN driver_status ds ON d.id=ds.driver_id LEFT JOIN driver_locations dl ON d.id=dl.driver_id WHERE ds.availability='online';"
  echo ""
  
  echo "Corridas ativas:"
  psql $DATABASE_URL -c "SELECT id, status, passenger_id, driver_id, created_at FROM rides WHERE status NOT IN ('completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver') ORDER BY created_at DESC LIMIT 10;"
  echo ""
  
  echo "Ofertas pendentes:"
  psql $DATABASE_URL -c "SELECT id, ride_id, driver_id, expires_at FROM ride_offers WHERE status='pending' ORDER BY sent_at DESC LIMIT 10;"
}

# 7. Limpar dados de teste
clean_test_data() {
  echo "🧹 Limpando dados de teste..."
  read -p "Tem certeza? (y/n): " confirm
  
  if [ "$confirm" = "y" ]; then
    psql $DATABASE_URL -c "DELETE FROM ride_offers WHERE ride_id IN (SELECT id FROM rides WHERE passenger_id='test-passenger-1');"
    psql $DATABASE_URL -c "DELETE FROM rides WHERE passenger_id='test-passenger-1';"
    psql $DATABASE_URL -c "DELETE FROM driver_locations WHERE driver_id IN ('test-driver-1', 'test-driver-2');"
    psql $DATABASE_URL -c "DELETE FROM driver_status WHERE driver_id IN ('test-driver-1', 'test-driver-2');"
    echo "✅ Dados de teste removidos!"
  else
    echo "Cancelado."
  fi
}

# 8. Ver logs em tempo real
watch_logs() {
  echo "📋 Logs em tempo real (Ctrl+C para sair)..."
  echo ""
  
  if [ -f /home/goes/kaviar/backend/server.log ]; then
    tail -f /home/goes/kaviar/backend/server.log | grep -E "RIDE_|OFFER_|DISPATCH_"
  else
    echo "❌ Arquivo de log não encontrado"
    echo "   Rode o servidor com: npm run dev:3003 > server.log 2>&1"
  fi
}

# Loop do menu
while true; do
  show_menu
  
  case $choice in
    1) setup_complete ;;
    2) run_migration ;;
    3) run_seed ;;
    4) test_20_rides ;;
    5) test_manual ;;
    6) check_status ;;
    7) clean_test_data ;;
    8) watch_logs ;;
    9) echo "👋 Até logo!"; exit 0 ;;
    *) echo "❌ Opção inválida" ;;
  esac
  
  echo ""
  read -p "Pressione Enter para continuar..."
  clear
done
