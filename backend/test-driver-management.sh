#!/bin/bash
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD env}"

# Script de teste para Gestão de Motoristas
# Execute após configurar o banco Neon PostgreSQL

echo "🚗 KAVIAR - Teste de Gestão de Motoristas"
echo "========================================="

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

# Função para testar listagem de motoristas
test_list_drivers() {
    echo ""
    echo "📋 Testando listagem de motoristas..."
    
    curl -s -X GET "$BASE_URL/admin/drivers" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" | jq '.'
}

# Função para testar filtros
test_driver_filters() {
    echo ""
    echo "🔍 Testando filtros de motoristas..."
    
    echo "- Motoristas pendentes:"
    curl -s -X GET "$BASE_URL/admin/drivers?status=pending&limit=5" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {name, email, status}'
    
    echo ""
    echo "- Busca por nome (João):"
    curl -s -X GET "$BASE_URL/admin/drivers?search=João" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {name, email, status}'
}

# Função para testar aprovação
test_approve_driver() {
    echo ""
    echo "✅ Testando aprovação de motorista..."
    
    # Primeiro, pegar um motorista pendente
    PENDING_DRIVER=$(curl -s -X GET "$BASE_URL/admin/drivers?status=pending&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$PENDING_DRIVER" != "null" ] && [ "$PENDING_DRIVER" != "" ]; then
        echo "Aprovando motorista: $PENDING_DRIVER"
        
        curl -s -X PUT "$BASE_URL/admin/drivers/$PENDING_DRIVER/approve" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" | jq '.'
    else
        echo "⚠️  Nenhum motorista pendente encontrado"
    fi
}

# Função para testar suspensão
test_suspend_driver() {
    echo ""
    echo "⛔ Testando suspensão de motorista..."
    
    # Pegar um motorista aprovado
    APPROVED_DRIVER=$(curl -s -X GET "$BASE_URL/admin/drivers?status=approved&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$APPROVED_DRIVER" != "null" ] && [ "$APPROVED_DRIVER" != "" ]; then
        echo "Suspendendo motorista: $APPROVED_DRIVER"
        
        curl -s -X PUT "$BASE_URL/admin/drivers/$APPROVED_DRIVER/suspend" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "reason": "Teste de suspensão - comportamento inadequado"
            }' | jq '.'
    else
        echo "⚠️  Nenhum motorista aprovado encontrado"
    fi
}

# Função para testar reativação
test_reactivate_driver() {
    echo ""
    echo "🔄 Testando reativação de motorista..."
    
    # Pegar um motorista suspenso
    SUSPENDED_DRIVER=$(curl -s -X GET "$BASE_URL/admin/drivers?status=suspended&limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$SUSPENDED_DRIVER" != "null" ] && [ "$SUSPENDED_DRIVER" != "" ]; then
        echo "Reativando motorista: $SUSPENDED_DRIVER"
        
        curl -s -X PUT "$BASE_URL/admin/drivers/$SUSPENDED_DRIVER/reactivate" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" | jq '.'
    else
        echo "⚠️  Nenhum motorista suspenso encontrado"
    fi
}

# Função para testar detalhes do motorista
test_driver_details() {
    echo ""
    echo "🔍 Testando detalhes do motorista..."
    
    DRIVER_ID=$(curl -s -X GET "$BASE_URL/admin/drivers?limit=1" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
    
    if [ "$DRIVER_ID" != "null" ] && [ "$DRIVER_ID" != "" ]; then
        echo "Detalhes do motorista: $DRIVER_ID"
        
        curl -s -X GET "$BASE_URL/admin/drivers/$DRIVER_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
    else
        echo "⚠️  Nenhum motorista encontrado"
    fi
}

# Executar testes
main() {
    login_admin
    test_list_drivers
    test_driver_filters
    test_approve_driver
    test_suspend_driver
    test_reactivate_driver
    test_driver_details
    
    echo ""
    echo "🎉 Testes de Gestão de Motoristas concluídos!"
    echo ""
    echo "📊 Resumo final dos motoristas:"
    curl -s -X GET "$BASE_URL/admin/drivers" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {name, email, status, suspensionReason}'
}

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ jq não está instalado. Instale com: sudo apt-get install jq"
    exit 1
fi

# Executar
main
