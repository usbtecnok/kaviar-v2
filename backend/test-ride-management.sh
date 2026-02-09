#!/bin/bash
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD env}"

# Script de teste para Sistema de Corridas
# Execute após configurar o banco e ter dados de teste

echo "🚗 KAVIAR - Teste de Sistema de Corridas"
echo "========================================"

BASE_URL="http://localhost:3001/api"
ADMIN_TOKEN=""

# Função para fazer login admin
login_admin() {
    echo "📝 Fazendo login como admin..."
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@kaviar.com",
            "password": ""
        }')
    
    ADMIN_TOKEN=$(echo $RESPONSE | jq -r '.data.token')
    
    if [ "$ADMIN_TOKEN" != "null" ]; then
        echo "✅ Login realizado com sucesso"
    else
        echo "❌ Erro no login: $RESPONSE"
        exit 1
    fi
}

# Função para testar listagem de corridas
test_list_rides() {
    echo ""
    echo "📋 Testando listagem de corridas..."
    
    curl -s -X GET "$BASE_URL/admin/rides?limit=5" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" | jq '.'
}

# Função para testar filtros de corridas
test_ride_filters() {
    echo ""
    echo "🔍 Testando filtros de corridas..."
    
    echo "- Corridas em andamento:"
    curl -s -X GET "$BASE_URL/admin/rides?status=in_progress&limit=3" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, status, origin, destination}'
    
    echo ""
    echo "- Corridas completadas:"
    curl -s -X GET "$BASE_URL/admin/rides?status=completed&limit=3" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, status, price}'
    
    echo ""
    echo "- Busca por origem (Shopping):"
    curl -s -X GET "$BASE_URL/admin/rides?search=Shopping&limit=3" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, origin, destination}'
}

# Função para testar detalhes da corrida
test_ride_details() {
    echo ""
    echo "🔍 Testando detalhes da corrida..."
    
    # Pegar primeira corrida da lista
    RIDE_ID=$(curl -s -X GET "$BASE_URL/admin/rides?limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$RIDE_ID" != "null" ] && [ "$RIDE_ID" != "" ]; then
        echo "Detalhes da corrida: $RIDE_ID"
        
        curl -s -X GET "$BASE_URL/admin/rides/$RIDE_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{
                id: .data.id,
                status: .data.status,
                origin: .data.origin,
                destination: .data.destination,
                driver: .data.driver.name,
                passenger: .data.passenger.name,
                statusHistory: .data.statusHistory,
                adminActions: .data.adminActions
            }'
    else
        echo "⚠️  Nenhuma corrida encontrada"
    fi
}

# Função para testar cancelamento administrativo
test_cancel_ride() {
    echo ""
    echo "❌ Testando cancelamento administrativo..."
    
    # Pegar uma corrida em andamento ou atribuída
    ACTIVE_RIDE=$(curl -s -X GET "$BASE_URL/admin/rides?status=in_progress&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$ACTIVE_RIDE" == "null" ] || [ "$ACTIVE_RIDE" == "" ]; then
        # Tentar corrida atribuída
        ACTIVE_RIDE=$(curl -s -X GET "$BASE_URL/admin/rides?status=driver_assigned&limit=1" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    fi
    
    if [ "$ACTIVE_RIDE" != "null" ] && [ "$ACTIVE_RIDE" != "" ]; then
        echo "Cancelando corrida: $ACTIVE_RIDE"
        
        curl -s -X PUT "$BASE_URL/admin/rides/$ACTIVE_RIDE/cancel" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "reason": "Teste de cancelamento administrativo - problema técnico"
            }' | jq '.'
    else
        echo "⚠️  Nenhuma corrida ativa encontrada para cancelar"
    fi
}

# Função para testar reatribuição de motorista
test_reassign_driver() {
    echo ""
    echo "🔄 Testando reatribuição de motorista..."
    
    # Pegar uma corrida atribuída
    ASSIGNED_RIDE=$(curl -s -X GET "$BASE_URL/admin/rides?status=driver_assigned&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    # Pegar um motorista aprovado diferente
    NEW_DRIVER=$(curl -s -X GET "$BASE_URL/admin/drivers?status=approved&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$ASSIGNED_RIDE" != "null" ] && [ "$ASSIGNED_RIDE" != "" ] && [ "$NEW_DRIVER" != "null" ] && [ "$NEW_DRIVER" != "" ]; then
        echo "Reatribuindo corrida $ASSIGNED_RIDE para motorista $NEW_DRIVER"
        
        curl -s -X PUT "$BASE_URL/admin/rides/$ASSIGNED_RIDE/reassign-driver" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"newDriverId\": \"$NEW_DRIVER\",
                \"reason\": \"Teste de reatribuição - motorista original indisponível\"
            }" | jq '.'
    else
        echo "⚠️  Não foi possível encontrar corrida atribuída ou motorista aprovado"
    fi
}

# Função para testar finalização forçada
test_force_complete() {
    echo ""
    echo "✅ Testando finalização forçada..."
    
    # Pegar uma corrida em andamento
    IN_PROGRESS_RIDE=$(curl -s -X GET "$BASE_URL/admin/rides?status=in_progress&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$IN_PROGRESS_RIDE" != "null" ] && [ "$IN_PROGRESS_RIDE" != "" ]; then
        echo "Forçando finalização da corrida: $IN_PROGRESS_RIDE"
        
        curl -s -X PUT "$BASE_URL/admin/rides/$IN_PROGRESS_RIDE/force-complete" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "reason": "Teste de finalização forçada - passageiro confirmou chegada por telefone"
            }' | jq '.'
    else
        echo "⚠️  Nenhuma corrida em andamento encontrada"
    fi
}

# Função para mostrar estatísticas finais
show_final_stats() {
    echo ""
    echo "📊 Estatísticas finais das corridas:"
    
    echo "- Por status:"
    curl -s -X GET "$BASE_URL/admin/rides" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | group_by(.status) | map({status: .[0].status, count: length})'
    
    echo ""
    echo "- Corridas com ações administrativas:"
    curl -s -X GET "$BASE_URL/admin/rides" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | map(select(.cancelReason != null or .forcedCompletedBy != null)) | length'
}

# Executar testes
main() {
    login_admin
    test_list_rides
    test_ride_filters
    test_ride_details
    test_cancel_ride
    test_reassign_driver
    test_force_complete
    show_final_stats
    
    echo ""
    echo "🎉 Testes de Sistema de Corridas concluídos!"
}

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ jq não está instalado. Instale com: sudo apt-get install jq"
    exit 1
fi

# Executar
main
